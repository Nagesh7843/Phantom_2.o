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
                        subscription_tier VARCHAR(32) DEFAULT 'pro',
                        messages_today INTEGER DEFAULT 0,
                        compilations_today INTEGER DEFAULT 0,
                        last_usage_reset TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        last_login TIMESTAMP WITH TIME ZONE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(32) DEFAULT 'pro';
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS messages_today INTEGER DEFAULT 0;
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS compilations_today INTEGER DEFAULT 0;
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_usage_reset TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
                    
                    CREATE TABLE IF NOT EXISTS chat_sessions (
                        id VARCHAR(64) PRIMARY KEY,
                        user_id VARCHAR(64) NOT NULL,
                        title VARCHAR(255) DEFAULT 'New Chat Session',
                        is_pinned BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
                    
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

                    CREATE TABLE IF NOT EXISTS invoices (
                        id VARCHAR(64) PRIMARY KEY,
                        user_id VARCHAR(64) NOT NULL,
                        plan VARCHAR(64) NOT NULL,
                        amount VARCHAR(32) NOT NULL,
                        status VARCHAR(32) DEFAULT 'paid',
                        date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE TABLE IF NOT EXISTS scheduled_tasks (
                        id VARCHAR(64) PRIMARY KEY,
                        user_id VARCHAR(64) NOT NULL,
                        name VARCHAR(255) NOT NULL,
                        schedule VARCHAR(255) NOT NULL,
                        prompt TEXT NOT NULL,
                        target VARCHAR(64) DEFAULT 'chat',
                        active BOOLEAN DEFAULT TRUE,
                        push_enabled BOOLEAN DEFAULT TRUE,
                        last_run VARCHAR(255),
                        next_run VARCHAR(255),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE TABLE IF NOT EXISTS user_plugins (
                        user_id VARCHAR(64) PRIMARY KEY,
                        plugins_config TEXT NOT NULL,
                        last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON chat_sessions(user_id);
                    CREATE INDEX IF NOT EXISTS idx_sessions_pinned ON chat_sessions(user_id, is_pinned);
                    CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
                    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
                    CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
                    CREATE INDEX IF NOT EXISTS idx_scheduled_user_id ON scheduled_tasks(user_id);
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
                    subscription_tier TEXT DEFAULT 'pro',
                    messages_today INTEGER DEFAULT 0,
                    compilations_today INTEGER DEFAULT 0,
                    last_usage_reset TEXT,
                    last_login TEXT,
                    created_at TEXT
                );
                
                CREATE TABLE IF NOT EXISTS chat_sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    title TEXT DEFAULT 'New Chat Session',
                    is_pinned INTEGER DEFAULT 0,
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

                CREATE TABLE IF NOT EXISTS invoices (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    plan TEXT NOT NULL,
                    amount TEXT NOT NULL,
                    status TEXT DEFAULT 'paid',
                    date TEXT
                );

                CREATE TABLE IF NOT EXISTS scheduled_tasks (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    schedule TEXT NOT NULL,
                    prompt TEXT NOT NULL,
                    target TEXT DEFAULT 'chat',
                    active INTEGER DEFAULT 1,
                    push_enabled INTEGER DEFAULT 1,
                    last_run TEXT,
                    next_run TEXT,
                    created_at TEXT
                );

                CREATE TABLE IF NOT EXISTS user_plugins (
                    user_id TEXT PRIMARY KEY,
                    plugins_config TEXT NOT NULL,
                    last_updated TEXT
                );
            """)
            for sql in [
                "ALTER TABLE chat_sessions ADD COLUMN is_pinned INTEGER DEFAULT 0;",
                "ALTER TABLE users ADD COLUMN subscription_tier TEXT DEFAULT 'pro';",
                "ALTER TABLE users ADD COLUMN messages_today INTEGER DEFAULT 0;",
                "ALTER TABLE users ADD COLUMN compilations_today INTEGER DEFAULT 0;",
                "ALTER TABLE users ADD COLUMN last_usage_reset TEXT;"
            ]:
                try:
                    conn.execute(sql)
                except Exception:
                    pass
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
    
    allowed = {'display_name', 'email', 'theme', 'language', 'voice', 'picture_url', 'subscription_tier'}
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
# --- SUBSCRIPTION & USAGE OPERATIONS ---
# =========================================================================

SUBSCRIPTION_PLANS = {
    'free': {
        'id': 'free',
        'name': 'Phantom Free',
        'price': '$0',
        'period': 'forever',
        'badge': 'Starter',
        'daily_messages': 20,
        'daily_compilations': 10,
        'image_generation_daily': 5,
        'max_image_res': '1024x1024',
        'cloud_storage': 'Local Storage',
        'speed': 'Standard',
        'features': [
            '20 AI chat messages / day',
            '10 code runs & compilations / day',
            'Core AI model (Phantom Basic / Flash)',
            'Standard compiler execution speed',
            'Local history & settings storage'
        ]
    },
    'plus': {
        'id': 'plus',
        'name': 'Phantom Plus',
        'price': '$20',
        'period': '/ month',
        'badge': 'Popular',
        'daily_messages': 500,
        'daily_compilations': 100,
        'image_generation_daily': 50,
        'max_image_res': '2048x2048',
        'cloud_storage': 'PostgreSQL Cloud Sync',
        'speed': 'Turbo Accelerated',
        'features': [
            '500 AI chat messages / day',
            '100 high-speed code compilations / day',
            'Phantom Turbo & Sonnet fast models',
            'PostgreSQL Cloud database sync',
            'Advanced Dev Studio diagnostics',
            'Priority response queue'
        ]
    },
    'pro': {
        'id': 'pro',
        'name': 'Phantom 2.0 Pro Developer',
        'price': '$50',
        'period': '/ month',
        'badge': 'Enterprise',
        'daily_messages': 999999,
        'daily_compilations': 999999,
        'image_generation_daily': 999999,
        'max_image_res': '4096x4096 (4K UHD)',
        'cloud_storage': 'PostgreSQL Dedicated Cloud DB',
        'speed': 'Ultra Zero-Latency',
        'features': [
            'Unlimited AI chat & reasoning models',
            'Unlimited multi-language code compilation (30+ langs)',
            'Ultra 4K UHD image generation',
            'Full PostgreSQL Enterprise persistence',
            'Real-Time Web Search & System Terminal execution',
            '24/7 VIP priority support'
        ]
    }
}

def get_user_subscription(user_id):
    user = get_user_by_id(user_id) if user_id else None
    tier = 'free'
    messages_today = 0
    compilations_today = 0
    
    if user:
        tier = user.get('subscription_tier') or 'pro'
        if tier not in SUBSCRIPTION_PLANS:
            tier = 'pro'
        messages_today = int(user.get('messages_today') or 0)
        compilations_today = int(user.get('compilations_today') or 0)
    else:
        tier = 'free'
    
    plan = SUBSCRIPTION_PLANS.get(tier, SUBSCRIPTION_PLANS['free'])
    invoices = get_user_invoices(user_id) if user_id else []
    
    # If no invoices yet for user, generate initial record
    if not invoices and user_id:
        invoices = [{
            "id": "INV-2026-001",
            "plan": plan['name'],
            "amount": plan['price'],
            "status": "paid",
            "date": datetime.now(timezone.utc).strftime("%b %d, %Y")
        }]
    
    return {
        "tier": tier,
        "plan": plan,
        "all_plans": SUBSCRIPTION_PLANS,
        "usage": {
            "messages_today": messages_today,
            "messages_limit": plan['daily_messages'],
            "compilations_today": compilations_today,
            "compilations_limit": plan['daily_compilations'],
            "is_unlimited": tier == 'pro'
        },
        "invoices": invoices,
        "status": "active"
    }

def update_user_subscription(user_id, tier, payment_details=None):
    if not user_id or tier not in SUBSCRIPTION_PLANS:
        return False
    
    plan = SUBSCRIPTION_PLANS[tier]
    update_user_profile(user_id, {'subscription_tier': tier})
    
    inv_id = "INV-" + datetime.now(timezone.utc).strftime("%Y%m%d") + "-" + str(uuid.uuid4())[:4].upper()
    amount = plan['price']
    plan_name = plan['name']
    now_iso = datetime.now(timezone.utc).isoformat()
    
    if _active_db_type == DB_TYPE_POSTGRES and _pg_pool:
        conn = _pg_pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO invoices (id, user_id, plan, amount, status, date)
                    VALUES (%s, %s, %s, %s, 'paid', CURRENT_TIMESTAMP)
                """, (inv_id, user_id, plan_name, amount))
            conn.commit()
        finally:
            _pg_pool.putconn(conn)
    else:
        with sqlite3.connect(_sqlite_path) as conn:
            conn.execute("""
                INSERT INTO invoices (id, user_id, plan, amount, status, date)
                VALUES (?, ?, ?, ?, 'paid', ?)
            """, (inv_id, user_id, plan_name, amount, now_iso))
            conn.commit()
    
    return True

def get_user_invoices(user_id):
    if not user_id:
        return []
    if _active_db_type == DB_TYPE_POSTGRES and _pg_pool:
        conn = _pg_pool.getconn()
        try:
            with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
                cur.execute("SELECT id, plan, amount, status, date FROM invoices WHERE user_id = %s ORDER BY date DESC", (user_id,))
                return [dict(r) for r in cur.fetchall()]
        finally:
            _pg_pool.putconn(conn)
    else:
        with sqlite3.connect(_sqlite_path) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute("SELECT id, plan, amount, status, date FROM invoices WHERE user_id = ? ORDER BY date DESC", (user_id,))
            return [dict(r) for r in cur.fetchall()]

def check_and_increment_usage(user_id, usage_type='message'):
    if not user_id:
        tier = 'free'
        limit = SUBSCRIPTION_PLANS['free']['daily_messages'] if usage_type == 'message' else SUBSCRIPTION_PLANS['free']['daily_compilations']
        return True, 1, limit, tier
    
    user = get_user_by_id(user_id)
    if not user:
        return True, 1, 999999, 'pro'
    
    tier = user.get('subscription_tier') or 'pro'
    if tier not in SUBSCRIPTION_PLANS:
        tier = 'pro'
    
    if tier == 'pro':
        return True, 0, 999999, 'pro'
    
    plan = SUBSCRIPTION_PLANS[tier]
    col = 'messages_today' if usage_type == 'message' else 'compilations_today'
    limit = plan['daily_messages'] if usage_type == 'message' else plan['daily_compilations']
    current = int(user.get(col) or 0)
    
    if current >= limit:
        return False, current, limit, tier
    
    new_count = current + 1
    if _active_db_type == DB_TYPE_POSTGRES and _pg_pool:
        conn = _pg_pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute(f"UPDATE users SET {col} = %s WHERE id = %s OR google_id = %s", (new_count, user_id, user_id))
            conn.commit()
        finally:
            _pg_pool.putconn(conn)
    else:
        with sqlite3.connect(_sqlite_path) as conn:
            conn.execute(f"UPDATE users SET {col} = ? WHERE id = ? OR google_id = ?", (new_count, user_id, user_id))
            conn.commit()
    
    return True, new_count, limit, tier

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
                cur.execute("SELECT id as session_id, title, is_pinned, last_updated, created_at FROM chat_sessions WHERE user_id = %s ORDER BY is_pinned DESC, last_updated DESC", (user_id,))
                rows = cur.fetchall()
                return [{**dict(r), "is_pinned": bool(r.get("is_pinned", False))} for r in rows]
        finally:
            _pg_pool.putconn(conn)
    else:
        with sqlite3.connect(_sqlite_path) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute("SELECT id as session_id, title, is_pinned, last_updated, created_at FROM chat_sessions WHERE user_id = ? ORDER BY is_pinned DESC, last_updated DESC", (user_id,))
            return [{**dict(r), "is_pinned": bool(r.get("is_pinned", False))} for r in cur.fetchall()]

def create_session(session_id, user_id, title="New Chat Session", is_pinned=False):
    now_iso = datetime.now(timezone.utc).isoformat()
    if _active_db_type == DB_TYPE_POSTGRES and _pg_pool:
        conn = _pg_pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO chat_sessions (id, user_id, title, is_pinned, created_at, last_updated)
                    VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT (id) DO UPDATE SET last_updated = CURRENT_TIMESTAMP
                """, (session_id, user_id, title, bool(is_pinned)))
            conn.commit()
        finally:
            _pg_pool.putconn(conn)
    else:
        with sqlite3.connect(_sqlite_path) as conn:
            conn.execute("""
                INSERT INTO chat_sessions (id, user_id, title, is_pinned, created_at, last_updated)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET last_updated = ?
            """, (session_id, user_id, title, 1 if is_pinned else 0, now_iso, now_iso, now_iso))
            conn.commit()

def toggle_pin_session(session_id, user_id, is_pinned=None):
    if not session_id or not user_id:
        return False
    now_iso = datetime.now(timezone.utc).isoformat()
    if _active_db_type == DB_TYPE_POSTGRES and _pg_pool:
        conn = _pg_pool.getconn()
        try:
            with conn.cursor() as cur:
                if is_pinned is not None:
                    cur.execute("""
                        UPDATE chat_sessions 
                        SET is_pinned = %s, last_updated = CURRENT_TIMESTAMP 
                        WHERE id = %s AND user_id = %s 
                        RETURNING is_pinned
                    """, (bool(is_pinned), session_id, user_id))
                else:
                    cur.execute("""
                        UPDATE chat_sessions 
                        SET is_pinned = NOT COALESCE(is_pinned, FALSE), last_updated = CURRENT_TIMESTAMP 
                        WHERE id = %s AND user_id = %s 
                        RETURNING is_pinned
                    """, (session_id, user_id))
                row = cur.fetchone()
                conn.commit()
                return bool(row[0]) if row else False
        finally:
            _pg_pool.putconn(conn)
    else:
        with sqlite3.connect(_sqlite_path) as conn:
            cur = conn.cursor()
            cur.execute("SELECT is_pinned FROM chat_sessions WHERE id = ? AND user_id = ?", (session_id, user_id))
            row = cur.fetchone()
            current_pinned = bool(row[0]) if row and row[0] is not None else False
            new_pinned = not current_pinned if is_pinned is None else bool(is_pinned)
            conn.execute(
                "UPDATE chat_sessions SET is_pinned = ?, last_updated = ? WHERE id = ? AND user_id = ?",
                (1 if new_pinned else 0, now_iso, session_id, user_id)
            )
            conn.commit()
            return new_pinned

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

# --- SCHEDULED TASKS & CRON AUTOMATIONS ---
def get_scheduled_tasks(user_id):
    """Retrieve all scheduled tasks for the user."""
    if _active_db_type == DB_TYPE_POSTGRES and _pg_pool:
        conn = _pg_pool.getconn()
        try:
            with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM scheduled_tasks WHERE user_id = %s ORDER BY created_at DESC", (user_id,))
                rows = cur.fetchall()
                tasks = []
                for r in rows:
                    d = dict(r)
                    if isinstance(d.get('created_at'), datetime):
                        d['created_at'] = d['created_at'].isoformat()
                    d['active'] = bool(d.get('active', True))
                    d['push_enabled'] = bool(d.get('push_enabled', True))
                    tasks.append(d)
                return tasks
        finally:
            _pg_pool.putconn(conn)
    else:
        with sqlite3.connect(_sqlite_path) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute("SELECT * FROM scheduled_tasks WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
            rows = cur.fetchall()
            tasks = []
            for r in rows:
                d = dict(r)
                d['active'] = bool(d.get('active', 1))
                d['push_enabled'] = bool(d.get('push_enabled', 1))
                tasks.append(d)
            return tasks

def save_scheduled_task(task_data, user_id):
    """Create or update a scheduled task."""
    task_id = task_data.get('id') or f"task_{uuid.uuid4().hex[:12]}"
    name = task_data.get('name', 'Untitled Schedule')
    schedule = task_data.get('schedule', 'Daily at 09:00 AM UTC')
    prompt = task_data.get('prompt', '')
    target = task_data.get('target', 'chat')
    active = bool(task_data.get('active', True))
    push_enabled = bool(task_data.get('push_enabled', True))
    last_run = task_data.get('lastRun') or task_data.get('last_run')
    next_run = task_data.get('nextRun') or task_data.get('next_run', 'Scheduled for next interval')

    if _active_db_type == DB_TYPE_POSTGRES and _pg_pool:
        conn = _pg_pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO scheduled_tasks (id, user_id, name, schedule, prompt, target, active, push_enabled, last_run, next_run, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        schedule = EXCLUDED.schedule,
                        prompt = EXCLUDED.prompt,
                        target = EXCLUDED.target,
                        active = EXCLUDED.active,
                        push_enabled = EXCLUDED.push_enabled,
                        last_run = EXCLUDED.last_run,
                        next_run = EXCLUDED.next_run;
                """, (task_id, user_id, name, schedule, prompt, target, active, push_enabled, last_run, next_run, datetime.now(timezone.utc)))
            conn.commit()
            return task_id
        finally:
            _pg_pool.putconn(conn)
    else:
        with sqlite3.connect(_sqlite_path) as conn:
            now_iso = datetime.now(timezone.utc).isoformat()
            conn.execute("""
                INSERT INTO scheduled_tasks (id, user_id, name, schedule, prompt, target, active, push_enabled, last_run, next_run, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name=excluded.name,
                    schedule=excluded.schedule,
                    prompt=excluded.prompt,
                    target=excluded.target,
                    active=excluded.active,
                    push_enabled=excluded.push_enabled,
                    last_run=excluded.last_run,
                    next_run=excluded.next_run;
            """, (task_id, user_id, name, schedule, prompt, target, 1 if active else 0, 1 if push_enabled else 0, last_run, next_run, now_iso))
            conn.commit()
            return task_id

def toggle_scheduled_task(task_id, user_id, active, next_run=None):
    """Toggle a scheduled task active status."""
    if _active_db_type == DB_TYPE_POSTGRES and _pg_pool:
        conn = _pg_pool.getconn()
        try:
            with conn.cursor() as cur:
                if next_run is not None:
                    cur.execute("UPDATE scheduled_tasks SET active = %s, next_run = %s WHERE id = %s AND user_id = %s", (active, next_run, task_id, user_id))
                else:
                    cur.execute("UPDATE scheduled_tasks SET active = %s WHERE id = %s AND user_id = %s", (active, task_id, user_id))
            conn.commit()
            return True
        finally:
            _pg_pool.putconn(conn)
    else:
        with sqlite3.connect(_sqlite_path) as conn:
            act_int = 1 if active else 0
            if next_run is not None:
                conn.execute("UPDATE scheduled_tasks SET active = ?, next_run = ? WHERE id = ? AND user_id = ?", (act_int, next_run, task_id, user_id))
            else:
                conn.execute("UPDATE scheduled_tasks SET active = ? WHERE id = ? AND user_id = ?", (act_int, task_id, user_id))
            conn.commit()
            return True

def delete_scheduled_task(task_id, user_id):
    """Delete a scheduled task."""
    if _active_db_type == DB_TYPE_POSTGRES and _pg_pool:
        conn = _pg_pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM scheduled_tasks WHERE id = %s AND user_id = %s", (task_id, user_id))
            conn.commit()
            return True
        finally:
            _pg_pool.putconn(conn)
    else:
        with sqlite3.connect(_sqlite_path) as conn:
            conn.execute("DELETE FROM scheduled_tasks WHERE id = ? AND user_id = ?", (task_id, user_id))
            conn.commit()
            return True

# --- USER PLUGINS CONFIGURATION ---
def get_user_plugins(user_id):
    """Retrieve saved plugin configurations for a user."""
    import json
    if _active_db_type == DB_TYPE_POSTGRES and _pg_pool:
        conn = _pg_pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT plugins_config FROM user_plugins WHERE user_id = %s", (user_id,))
                row = cur.fetchone()
                if row and row[0]:
                    return json.loads(row[0])
                return None
        except Exception:
            return None
        finally:
            _pg_pool.putconn(conn)
    else:
        with sqlite3.connect(_sqlite_path) as conn:
            cur = conn.cursor()
            cur.execute("SELECT plugins_config FROM user_plugins WHERE user_id = ?", (user_id,))
            row = cur.fetchone()
            if row and row[0]:
                try:
                    return json.loads(row[0])
                except Exception:
                    pass
            return None

def save_user_plugins(user_id, plugins_dict):
    """Save user plugin configuration."""
    import json
    cfg_json = json.dumps(plugins_dict)
    if _active_db_type == DB_TYPE_POSTGRES and _pg_pool:
        conn = _pg_pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO user_plugins (user_id, plugins_config, last_updated)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (user_id) DO UPDATE SET
                        plugins_config = EXCLUDED.plugins_config,
                        last_updated = EXCLUDED.last_updated;
                """, (user_id, cfg_json, datetime.now(timezone.utc)))
            conn.commit()
            return True
        finally:
            _pg_pool.putconn(conn)
    else:
        with sqlite3.connect(_sqlite_path) as conn:
            now_iso = datetime.now(timezone.utc).isoformat()
            conn.execute("""
                INSERT INTO user_plugins (user_id, plugins_config, last_updated)
                VALUES (?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    plugins_config = excluded.plugins_config,
                    last_updated = excluded.last_updated;
            """, (user_id, cfg_json, now_iso))
            conn.commit()
            return True

# --- USER IMAGES & GENERATIVE ASSETS ---
def get_user_images(user_id):
    """Retrieve all AI generated images for a user."""
    if not user_id:
        return []
    if _active_db_type == DB_TYPE_POSTGRES and _pg_pool:
        conn = _pg_pool.getconn()
        try:
            with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM image_history WHERE user_id = %s ORDER BY created_at DESC", (user_id,))
                rows = cur.fetchall()
                imgs = []
                for r in rows:
                    d = dict(r)
                    if isinstance(d.get('created_at'), datetime):
                        d['created_at'] = d['created_at'].isoformat()
                    imgs.append(d)
                return imgs
        finally:
            _pg_pool.putconn(conn)
    else:
        with sqlite3.connect(_sqlite_path) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute("SELECT * FROM image_history WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
            return [dict(r) for r in cur.fetchall()]

def save_user_image(user_id, session_id, original_prompt, enhanced_prompt, image_url):
    """Save generated image record."""
    img_id = f"img_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    if _active_db_type == DB_TYPE_POSTGRES and _pg_pool:
        conn = _pg_pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO image_history (id, user_id, session_id, original_prompt, enhanced_prompt, image_url, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s);
                """, (img_id, user_id, session_id, original_prompt, enhanced_prompt, image_url, now))
            conn.commit()
            return img_id
        finally:
            _pg_pool.putconn(conn)
    else:
        with sqlite3.connect(_sqlite_path) as conn:
            conn.execute("""
                INSERT INTO image_history (id, user_id, session_id, original_prompt, enhanced_prompt, image_url, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?);
            """, (img_id, user_id, session_id, original_prompt, enhanced_prompt, image_url, now.isoformat()))
            conn.commit()
            return img_id

# Auto-initialize database on load
init_database()
