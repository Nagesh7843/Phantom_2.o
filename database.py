"""
PhantomAI Database Manager - PostgreSQL & SQLite Dual Adapter
Provides unified persistence for Users, Chat Sessions, Messages, and AI Image History.
Supports PostgreSQL (via psycopg2) with automatic table creation, connection pooling,
and graceful local SQLite fallback when PostgreSQL server credentials are being configured.
"""

import os
import time
import uuid
import sqlite3
import threading
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

try:
    import psycopg2
    from psycopg2 import pool, extras
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False

# Database Type Tracking
DB_TYPE_POSTGRES = "postgresql"
DB_TYPE_SQLITE = "sqlite"

_db_lock = threading.Lock()
_pg_pool = None
_sqlite_path = os.path.join(os.path.dirname(__file__), "phantom_local.db")
_active_db_type = DB_TYPE_SQLITE
_db_status_message = "Initializing..."

def _get_postgres_conn_string():
    """Retrieve PostgreSQL connection string from environment variables, safely escaping special chars in password."""
    import re
    from urllib.parse import quote_plus
    
    # 1. Direct URI
    for var in ["POSTGRES_URI", "DATABASE_URL", "POSTGRESQL_URI"]:
        val = os.getenv(var)
        if val and (val.startswith("postgresql://") or val.startswith("postgres://")):
            # If password contains raw @ symbol, escape it
            prefix_match = re.match(r'^(postgres(?:ql)?://)([^:]+):(.*)@([^@/]+(?:/[^?]*)?(?:\?.*)?)$', val)
            if prefix_match:
                scheme, user, pwd, host_part = prefix_match.groups()
                # If pwd has unescaped chars, quote it
                safe_pwd = quote_plus(pwd) if '%' not in pwd else pwd
                return f"{scheme}{user}:{safe_pwd}@{host_part}"
            return val
    
    # 2. Individual fields
    host = os.getenv("PGHOST", "localhost")
    port = os.getenv("PGPORT", "5432")
    user = os.getenv("PGUSER", "postgres")
    password = os.getenv("PGPASSWORD", "")
    dbname = os.getenv("PGDATABASE", "postgres")
    
    if password:
        return f"postgresql://{user}:{quote_plus(password)}@{host}:{port}/{dbname}"
    return None

def init_database():
    """Initialize database connection and create tables if not exist."""
    global _pg_pool, _active_db_type, _db_status_message
    
    pg_uri = _get_postgres_conn_string()
    
    if PSYCOPG2_AVAILABLE and pg_uri:
        try:
            print(f"[DB] Attempting PostgreSQL connection to {pg_uri.split('@')[-1]}...")
            
            # Test direct connection first
            test_conn = psycopg2.connect(pg_uri, connect_timeout=4)
            test_conn.autocommit = True
            
            # Ensure tables exist in Postgres
            with test_conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        id VARCHAR(64) PRIMARY KEY,
                        email VARCHAR(255) UNIQUE NOT NULL,
                        display_name VARCHAR(255),
                        password_hash TEXT,
                        google_id VARCHAR(255) UNIQUE,
                        picture_url TEXT,
                        theme VARCHAR(64) DEFAULT 'theme-dark',
                        language VARCHAR(64) DEFAULT 'English',
                        voice VARCHAR(128) DEFAULT '',
                        last_login TIMESTAMP WITH TIME ZONE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    CREATE TABLE IF NOT EXISTS chat_sessions (
                        id VARCHAR(64) PRIMARY KEY,
                        user_id VARCHAR(64) NOT NULL,
                        title VARCHAR(255) DEFAULT 'New Chat Session',
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    CREATE TABLE IF NOT EXISTS messages (
                        id VARCHAR(64) PRIMARY KEY,
                        session_id VARCHAR(64) NOT NULL,
                        user_id VARCHAR(64) NOT NULL,
                        role VARCHAR(32) NOT NULL,
                        content TEXT NOT NULL,
                        type VARCHAR(32) DEFAULT 'text',
                        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    CREATE TABLE IF NOT EXISTS image_history (
                        id VARCHAR(64) PRIMARY KEY,
                        user_id VARCHAR(64) NOT NULL,
                        session_id VARCHAR(64),
                        original_prompt TEXT NOT NULL,
                        enhanced_prompt TEXT,
                        image_url TEXT NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE TABLE IF NOT EXISTS projects (
                        id VARCHAR(64) PRIMARY KEY,
                        user_id VARCHAR(64) NOT NULL,
                        name VARCHAR(255) NOT NULL,
                        template VARCHAR(64) DEFAULT 'web',
                        files TEXT NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON chat_sessions(user_id);
                    CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
                    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
                """)
            test_conn.close()
            
            # Create ThreadedConnectionPool
            _pg_pool = pool.ThreadedConnectionPool(1, 20, pg_uri)
            _active_db_type = DB_TYPE_POSTGRES
            _db_status_message = "PostgreSQL Connected (Local / Cloud)"
            print("[OK] PostgreSQL Connected and Schema Initialized Successfully!")
            return True
        except Exception as e:
            print(f"[NOTE] PostgreSQL not reachable or credentials needed ({e}). Falling back to local SQLite.")
            _db_status_message = f"SQLite Local Fallback (Postgres note: {e})"
    
    # Fallback to local SQLite
    try:
        conn = sqlite3.connect(_sqlite_path)
        conn.execute("PRAGMA journal_mode=WAL;")
        with conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    display_name TEXT,
                    password_hash TEXT,
                    google_id TEXT UNIQUE,
                    picture_url TEXT,
                    theme TEXT DEFAULT 'theme-dark',
                    language TEXT DEFAULT 'English',
                    voice TEXT DEFAULT '',
                    last_login TEXT,
                    created_at TEXT
                );
                
                CREATE TABLE IF NOT EXISTS chat_sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    title TEXT DEFAULT 'New Chat Session',
                    created_at TEXT,
                    last_updated TEXT
                );
                
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    type TEXT DEFAULT 'text',
                    timestamp TEXT
                );
                
                CREATE TABLE IF NOT EXISTS image_history (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    session_id TEXT,
                    original_prompt TEXT NOT NULL,
                    enhanced_prompt TEXT,
                    image_url TEXT NOT NULL,
                    created_at TEXT
                );

                CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    template TEXT DEFAULT 'web',
                    files TEXT NOT NULL,
                    created_at TEXT,
                    last_updated TEXT
                );
            """)
        conn.close()
        _active_db_type = DB_TYPE_SQLITE
        _db_status_message = "SQLite Local Engine Active"
        print(f"[OK] Local Database Initialized at {_sqlite_path}")
        return True
    except Exception as e:
        print(f"[ERROR] Database initialization failed: {e}")
        _db_status_message = f"DB Error: {e}"
        return False

def get_db_status():
    return {
        "engine": _active_db_type,
        "status": _db_status_message,
        "postgres_available": PSYCOPG2_AVAILABLE,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# =========================================================================
# --- USER OPERATIONS ---
# =========================================================================

def save_or_update_user(email, display_name, google_id=None, picture_url=None, password_hash=None):
    user_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    if _active_db_type == DB_TYPE_POSTGRES and _pg_pool:
        conn = _pg_pool.getconn()
        try:
            with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
                cur.execute("SELECT id FROM users WHERE email = %s OR (google_id IS NOT NULL AND google_id = %s)", (email, google_id))
                existing = cur.fetchone()
                
                if existing:
                    user_id = existing['id']
                    cur.execute("""
                        UPDATE users SET
                            display_name = COALESCE(%s, display_name),
                            google_id = COALESCE(%s, google_id),
                            picture_url = COALESCE(%s, picture_url),
                            password_hash = COALESCE(%s, password_hash),
                            last_login = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """, (display_name, google_id, picture_url, password_hash, user_id))
                else:
                    cur.execute("""
                        INSERT INTO users (id, email, display_name, password_hash, google_id, picture_url, last_login, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """, (user_id, email, display_name, password_hash, google_id, picture_url))
            conn.commit()
            return user_id
        finally:
            _pg_pool.putconn(conn)
    else:
        with sqlite3.connect(_sqlite_path) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute("SELECT id FROM users WHERE email = ? OR (google_id IS NOT NULL AND google_id = ?)", (email, google_id))
            existing = cur.fetchone()
            
            if existing:
                user_id = existing['id']
                cur.execute("""
                    UPDATE users SET
                        display_name = COALESCE(?, display_name),
                        google_id = COALESCE(?, google_id),
                        picture_url = COALESCE(?, picture_url),
                        password_hash = COALESCE(?, password_hash),
                        last_login = ?
                    WHERE id = ?
                """, (display_name, google_id, picture_url, password_hash, now_iso, user_id))
            else:
                cur.execute("""
                    INSERT INTO users (id, email, display_name, password_hash, google_id, picture_url, last_login, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (user_id, email, display_name, password_hash, google_id, picture_url, now_iso, now_iso))
            conn.commit()
            return user_id

def get_user_by_email(email):
    if _active_db_type == DB_TYPE_POSTGRES and _pg_pool:
        conn = _pg_pool.getconn()
        try:
            with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM users WHERE email = %s", (email,))
                return dict(cur.fetchone() or {})
        finally:
            _pg_pool.putconn(conn)
    else:
        with sqlite3.connect(_sqlite_path) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute("SELECT * FROM users WHERE email = ?", (email,))
            row = cur.fetchone()
            return dict(row) if row else None

def get_user_by_id(user_id):
    if not user_id:
        return None
    if _active_db_type == DB_TYPE_POSTGRES and _pg_pool:
        conn = _pg_pool.getconn()
        try:
            with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM users WHERE id = %s OR google_id = %s", (user_id, user_id))
                res = cur.fetchone()
                return dict(res) if res else None
        finally:
            _pg_pool.putconn(conn)
    else:
        with sqlite3.connect(_sqlite_path) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute("SELECT * FROM users WHERE id = ? OR google_id = ?", (user_id, user_id))
            row = cur.fetchone()
            return dict(row) if row else None

def update_user_profile(user_id, updates: dict):
    if not user_id or not updates:
        return
    
    allowed = {'display_name', 'email', 'theme', 'language', 'voice', 'picture_url'}
    filtered = {k: v for k, v in updates.items() if k in allowed}
    if not filtered:
        return

    if _active_db_type == DB_TYPE_POSTGRES and _pg_pool:
        conn = _pg_pool.getconn()
        try:
            with conn.cursor() as cur:
                set_clauses = [f"{k} = %s" for k in filtered.keys()]
                values = list(filtered.values()) + [user_id, user_id]
                cur.execute(f"UPDATE users SET {', '.join(set_clauses)} WHERE id = %s OR google_id = %s", values)
            conn.commit()
        finally:
            _pg_pool.putconn(conn)
    else:
        with sqlite3.connect(_sqlite_path) as conn:
            set_clauses = [f"{k} = ?" for k in filtered.keys()]
            values = list(filtered.values()) + [user_id, user_id]
            conn.execute(f"UPDATE users SET {', '.join(set_clauses)} WHERE id = ? OR google_id = ?", values)
            conn.commit()

# =========================================================================
# --- SESSION OPERATIONS ---
# =========================================================================

def get_all_sessions(user_id):
    if not user_id:
        return []
    
    if _active_db_type == DB_TYPE_POSTGRES and _pg_pool:
        conn = _pg_pool.getconn()
        try:
            with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
                cur.execute("SELECT id as session_id, title, last_updated, created_at FROM chat_sessions WHERE user_id = %s ORDER BY last_updated DESC", (user_id,))
                rows = cur.fetchall()
                return [dict(r) for r in rows]
        finally:
            _pg_pool.putconn(conn)
    else:
        with sqlite3.connect(_sqlite_path) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute("SELECT id as session_id, title, last_updated, created_at FROM chat_sessions WHERE user_id = ? ORDER BY last_updated DESC", (user_id,))
            return [dict(r) for r in cur.fetchall()]

def create_session(session_id, user_id, title="New Chat Session"):
    now_iso = datetime.now(timezone.utc).isoformat()
    if _active_db_type == DB_TYPE_POSTGRES and _pg_pool:
        conn = _pg_pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO chat_sessions (id, user_id, title, created_at, last_updated)
                    VALUES (%s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT (id) DO UPDATE SET last_updated = CURRENT_TIMESTAMP
                """, (session_id, user_id, title))
            conn.commit()
        finally:
            _pg_pool.putconn(conn)
    else:
        with sqlite3.connect(_sqlite_path) as conn:
            conn.execute("""
                INSERT INTO chat_sessions (id, user_id, title, created_at, last_updated)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET last_updated = ?
            """, (session_id, user_id, title, now_iso, now_iso, now_iso))
            conn.commit()

def verify_session_ownership(session_id, user_id):
    if not session_id or not user_id:
        return False
    if _active_db_type == DB_TYPE_POSTGRES and _pg_pool:
        conn = _pg_pool.getconn()
        try:
            with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM chat_sessions WHERE id = %s AND user_id = %s", (session_id, user_id))
                return bool(cur.fetchone())
        finally:
            _pg_pool.putconn(conn)
    else:
        with sqlite3.connect(_sqlite_path) as conn:
            cur = conn.cursor()
            cur.execute("SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?", (session_id, user_id))
            return bool(cur.fetchone())

def rename_session(session_id, user_id, new_title):
    now_iso = datetime.now(timezone.utc).isoformat()
    if _active_db_type == DB_TYPE_POSTGRES and _pg_pool:
        conn = _pg_pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("UPDATE chat_sessions SET title = %s, last_updated = CURRENT_TIMESTAMP WHERE id = %s AND user_id = %s", (new_title, session_id, user_id))
            conn.commit()
        finally:
            _pg_pool.putconn(conn)
    else:
        with sqlite3.connect(_sqlite_path) as conn:
            conn.execute("UPDATE chat_sessions SET title = ?, last_updated = ? WHERE id = ? AND user_id = ?", (new_title, now_iso, session_id, user_id))
            conn.commit()

def delete_session(session_id, user_id):
    if _active_db_type == DB_TYPE_POSTGRES and _pg_pool:
        conn = _pg_pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM chat_sessions WHERE id = %s AND user_id = %s", (session_id, user_id))
                cur.execute("DELETE FROM messages WHERE session_id = %s", (session_id,))
            conn.commit()
        finally:
            _pg_pool.putconn(conn)
    else:
        with sqlite3.connect(_sqlite_path) as conn:
            conn.execute("DELETE FROM chat_sessions WHERE id = ? AND user_id = ?", (session_id, user_id))
            conn.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
            conn.commit()

# =========================================================================
# --- MESSAGE OPERATIONS ---
# =========================================================================

def save_message(session_id, user_id, role, content, msg_type="text"):
    msg_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    if _active_db_type == DB_TYPE_POSTGRES and _pg_pool:
        conn = _pg_pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO messages (id, session_id, user_id, role, content, type, timestamp)
                    VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                """, (msg_id, session_id, user_id, role, content, msg_type))
                cur.execute("UPDATE chat_sessions SET last_updated = CURRENT_TIMESTAMP WHERE id = %s", (session_id,))
            conn.commit()
            return msg_id
        finally:
            _pg_pool.putconn(conn)
    else:
        with sqlite3.connect(_sqlite_path) as conn:
            conn.execute("""
                INSERT INTO messages (id, session_id, user_id, role, content, type, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (msg_id, session_id, user_id, role, content, msg_type, now_iso))
            conn.execute("UPDATE chat_sessions SET last_updated = ? WHERE id = ?", (now_iso, session_id))
            conn.commit()
            return msg_id

def get_session_messages(session_id):
    if _active_db_type == DB_TYPE_POSTGRES and _pg_pool:
        conn = _pg_pool.getconn()
        try:
            with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM messages WHERE session_id = %s ORDER BY timestamp ASC", (session_id,))
                return [dict(r) for r in cur.fetchall()]
        finally:
            _pg_pool.putconn(conn)
    else:
        with sqlite3.connect(_sqlite_path) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute("SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC", (session_id,))
            return [dict(r) for r in cur.fetchall()]

# =========================================================================
# --- PROJECT OPERATIONS ---
# =========================================================================

def save_or_update_project(project_id, user_id, name, template, files_json):
    if not project_id:
        project_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    if _active_db_type == DB_TYPE_POSTGRES and _pg_pool:
        conn = _pg_pool.getconn()
        try:
            with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
                cur.execute("SELECT id FROM projects WHERE id = %s AND user_id = %s", (project_id, user_id))
                existing = cur.fetchone()
                if existing:
                    cur.execute("""
                        UPDATE projects SET
                            name = %s,
                            template = %s,
                            files = %s,
                            last_updated = CURRENT_TIMESTAMP
                        WHERE id = %s AND user_id = %s
                    """, (name, template, files_json, project_id, user_id))
                else:
                    cur.execute("""
                        INSERT INTO projects (id, user_id, name, template, files, created_at, last_updated)
                        VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """, (project_id, user_id, name, template, files_json))
            conn.commit()
            return project_id
        finally:
            _pg_pool.putconn(conn)
    else:
        with sqlite3.connect(_sqlite_path) as conn:
            cur = conn.cursor()
            cur.execute("SELECT id FROM projects WHERE id = ? AND user_id = ?", (project_id, user_id))
            existing = cur.fetchone()
            if existing:
                conn.execute("""
                    UPDATE projects SET
                        name = ?,
                        template = ?,
                        files = ?,
                        last_updated = ?
                    WHERE id = ? AND user_id = ?
                """, (name, template, files_json, now_iso, project_id, user_id))
            else:
                conn.execute("""
                    INSERT INTO projects (id, user_id, name, template, files, created_at, last_updated)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (project_id, user_id, name, template, files_json, now_iso, now_iso))
            conn.commit()
            return project_id

def get_user_projects(user_id):
    if _active_db_type == DB_TYPE_POSTGRES and _pg_pool:
        conn = _pg_pool.getconn()
        try:
            with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
                cur.execute("SELECT id, user_id, name, template, created_at, last_updated FROM projects WHERE user_id = %s ORDER BY last_updated DESC", (user_id,))
                projects = []
                for r in cur.fetchall():
                    d = dict(r)
                    if isinstance(d.get('created_at'), datetime):
                        d['created_at'] = d['created_at'].isoformat()
                    if isinstance(d.get('last_updated'), datetime):
                        d['last_updated'] = d['last_updated'].isoformat()
                    projects.append(d)
                return projects
        finally:
            _pg_pool.putconn(conn)
    else:
        with sqlite3.connect(_sqlite_path) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute("SELECT id, user_id, name, template, created_at, last_updated FROM projects WHERE user_id = ? ORDER BY last_updated DESC", (user_id,))
            return [dict(r) for r in cur.fetchall()]

def get_project_by_id(project_id, user_id):
    if _active_db_type == DB_TYPE_POSTGRES and _pg_pool:
        conn = _pg_pool.getconn()
        try:
            with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM projects WHERE id = %s AND user_id = %s", (project_id, user_id))
                row = cur.fetchone()
                if not row:
                    return None
                d = dict(row)
                if isinstance(d.get('created_at'), datetime):
                    d['created_at'] = d['created_at'].isoformat()
                if isinstance(d.get('last_updated'), datetime):
                    d['last_updated'] = d['last_updated'].isoformat()
                return d
        finally:
            _pg_pool.putconn(conn)
    else:
        with sqlite3.connect(_sqlite_path) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute("SELECT * FROM projects WHERE id = ? AND user_id = ?", (project_id, user_id))
            row = cur.fetchone()
            return dict(row) if row else None

def delete_project(project_id, user_id):
    if _active_db_type == DB_TYPE_POSTGRES and _pg_pool:
        conn = _pg_pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM projects WHERE id = %s AND user_id = %s", (project_id, user_id))
            conn.commit()
            return True
        finally:
            _pg_pool.putconn(conn)
    else:
        with sqlite3.connect(_sqlite_path) as conn:
            conn.execute("DELETE FROM projects WHERE id = ? AND user_id = ?", (project_id, user_id))
            conn.commit()
            return True

# Auto-initialize database on load
init_database()
