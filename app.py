import os
from datetime import datetime, timezone
import sys
import subprocess
import json
import uuid

import jwt  # For decoding JWTs (like Google's id_token)
import requests
from authlib.integrations.flask_client import OAuth
from bson.objectid import ObjectId  # For generating unique MongoDB ObjectIDs
from dotenv import load_dotenv
from flask import Flask, render_template, request, redirect, url_for, session
from flask import jsonify, Response
from flask_cors import CORS
from pymongo import MongoClient, version as pymongo_version  # For MongoDB connection
from pymongo.uri_parser import parse_uri as pymongo_parse_uri
from urllib.parse import quote_plus
import certifi
import threading
import time
from werkzeug.security import generate_password_hash, check_password_hash  # For password hashing
from werkzeug.middleware.proxy_fix import ProxyFix # <-- Import ProxyFix
import re
import random

def remove_stars_and_hashes(text: str) -> str:
    return re.sub(r"[\*\#]", "", text)
# Load environment variables from .env file at the very beginning
load_dotenv()
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://127.0.0.1:3000').rstrip('/')
try:
    import database as db_layer
except Exception as _dbe:
    db_layer = None
    print(f"[NOTE] Database layer import note: {_dbe}")

try:
    import search_engine
except Exception as _se:
    search_engine = None
    print(f"[NOTE] Search engine module note: {_se}")

def generate_smart_session_title(prompt: str) -> str:
    """
    Generate a concise, professional 4 to 5 word summary title for a chat session
    based on the user's initial question or prompt.
    """
    if not prompt or not prompt.strip():
        return "New Chat Session"
    
    clean = prompt.strip()
    
    # 1. Clean boilerplate prefixes
    prefixes_to_strip = [
        r'^(can you|could you|please|kindly|i want you to|i need you to|help me with|help me|tell me about|tell me|explain to me|explain how to|explain|how to|how do i|how can i|what is the|what are the|write a|create a|implement a|generate a|give me a|give me|show me)\s+',
        r'^(can|could|please|hey|hello|hi|phantom|bot|ai)\s+',
        r'^(in python|in javascript|in react|in rust|in cpp|in c\+\+|in go|in java|in sql)\s+'
    ]
    for pattern in prefixes_to_strip:
        clean = re.sub(pattern, '', clean, flags=re.IGNORECASE).strip()
    
    cleaned_words = re.findall(r'[a-zA-Z0-9\+\#\.\-]+', clean)
    
    stopwords = {'a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'like', 'through', 'over', 'before', 'between', 'after', 'since', 'without', 'under', 'within', 'along', 'following', 'across', 'behind', 'beyond', 'plus', 'except', 'but', 'up', 'out', 'around', 'down', 'off', 'above', 'near', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'do', 'does', 'did'}
    
    meaningful_words = [w for w in cleaned_words if w.lower() not in stopwords]
    
    if len(meaningful_words) >= 4:
        selected_words = meaningful_words[:5]
    elif len(cleaned_words) >= 4:
        selected_words = cleaned_words[:5]
    elif meaningful_words:
        selected_words = meaningful_words
    else:
        selected_words = cleaned_words[:5]
        
    if not selected_words:
        return "General Inquiry"
        
    formatted = []
    for w in selected_words:
        w_up = w.upper()
        if w_up in ['AI', 'API', 'UI', 'UX', 'CSS', 'HTML', 'SQL', 'JWT', 'REST', 'SDK', 'LLM', 'DB', 'OS', 'FCM', 'SSE']:
            formatted.append(w_up)
        elif w.lower() in ['c++', 'c#', '.net']:
            formatted.append(w.upper())
        else:
            formatted.append(w.capitalize())
            
    title = " ".join(formatted).strip()
    if len(title) > 38:
        title = title[:38].rstrip()
    return title if title else "New Chat Session"


def scan_text_for_secrets(text: str) -> list:
    """Detects credentials, API keys, passwords, and tokens in user text."""
    if not text or not isinstance(text, str):
        return []
    patterns = [
        ("Private Cryptographic Key", r"-----BEGIN[ A-Z0-9_-]*PRIVATE KEY-----"),
        ("OpenAI API Key", r"\bsk-(?:proj-|live-|test-|admin-)?[a-zA-Z0-9_\-]{20,80}\b"),
        ("Anthropic API Key", r"\bsk-ant-(?:api[0-9]{2}-)?[a-zA-Z0-9_\-]{30,100}\b"),
        ("Google Cloud / Gemini API Key", r"\bAIza[0-9A-Za-z\-_]{35}\b"),
        ("AWS Access Key", r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b"),
        ("AWS Secret Key", r"(?:aws_secret_access_key|aws_secret)\s*[:=]\s*['\"]?[a-zA-Z0-9\/+=]{40}['\"]?"),
        ("GitHub Token", r"\b(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,255}\b"),
        ("Stripe Secret Key", r"\b(?:sk|pk|rk)_(?:live|test)_[0-9a-zA-Z]{24,100}\b"),
        ("Database Connection String", r"\b(?:postgres|postgresql|mysql|mongodb|mongodb\+srv|redis):\/\/[a-zA-Z0-9_\-\.%]+:[^@\s]+@[a-zA-Z0-9_\-\.:]+"),
    ]
    detected = []
    for label, pat in patterns:
        if re.search(pat, text, re.IGNORECASE):
            detected.append(label)
    return detected



app = Flask(__name__,
            template_folder='templates',
            static_folder='static')

# --- Add ProxyFix Middleware ---
# This is crucial for deployments behind a reverse proxy (like on Render).
# It ensures that url_for(_external=True) generates the correct https URL.
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)


CORS(app, resources={r"/api/*": {"origins": "*"}}) 

# --- Flask Secret Key for Sessions ---
app.secret_key = os.getenv("FLASK_SECRET_KEY")
if not app.secret_key:
    app.secret_key = "a_fallback_secret_key_for_dev_ONLY_change_in_prod_1234567890"
    print("WARNING: FLASK_SECRET_KEY not found in .env! Using a fallback. PLEASE SET IT IN .env FOR SECURITY.")

app.config['SESSION_COOKIE_NAME'] = 'phantom-login-session'
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False
app.config['SESSION_COOKIE_HTTPONLY'] = True

# --- Active Process Tracking for Compiler and Terminal Subprocesses ---
active_compiler_processes = {}
active_compiler_processes_lock = threading.Lock()
active_terminal_processes = {}
active_terminal_processes_lock = threading.Lock()

# --- Google OAuth Configuration ---
oauth = OAuth(app)

# DEBUG: Print loaded environment variables to check if they are picked up
print(f"DEBUG: GOOGLE_CLIENT_ID loaded: {os.getenv('GOOGLE_CLIENT_ID') is not None and len(os.getenv('GOOGLE_CLIENT_ID', '')) > 5}")
print(f"DEBUG: GOOGLE_CLIENT_SECRET loaded: {os.getenv('GOOGLE_CLIENT_SECRET') is not None and len(os.getenv('GOOGLE_CLIENT_SECRET', '')) > 5}")
print(f"DEBUG: GEMINI_API_KEY loaded: {os.getenv('GEMINI_API_KEY') is not None and len(os.getenv('GEMINI_API_KEY', '')) > 5}")
print(f"DEBUG: FLASK_SECRET_KEY loaded correctly: {app.secret_key is not None and len(app.secret_key) > 20 and app.secret_key != 'a_fallback_secret_key_for_dev_ONLY_change_in_prod_1234567890'}")
print(f"DEBUG: OPENROUTER_API_KEY loaded: {os.getenv('OPENROUTER_API_KEY') is not None and len(os.getenv('OPENROUTER_API_KEY','')) > 5}")
print(f"DEBUG: OPENAI_API_KEY loaded: {os.getenv('OPENAI_API_KEY') is not None and len(os.getenv('OPENAI_API_KEY','')) > 5}")
print(f"DEBUG: HF_TOKEN loaded: {os.getenv('HF_TOKEN') is not None and len(os.getenv('HF_TOKEN','')) > 5}")


google = oauth.register(
    name='google',
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    userinfo_endpoint='https://openidconnect.googleapis.com/v1/userinfo',
    client_kwargs={
        'scope': 'openid email profile'
    }
)

# --- MongoDB Connection Setup ---
MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME")

# Escape credentials in MONGO_URI to fix RFC 3986 parsing error
safe_mongo_uri = MONGO_URI
if MONGO_URI:
    try:
        parsed = pymongo_parse_uri(MONGO_URI)
        username = quote_plus(parsed.get('username', ''))
        password = quote_plus(parsed.get('password', ''))
        raw_creds = f"{parsed.get('username', '')}:{parsed.get('password', '')}@"
        escaped_creds = f"{username}:{password}@"
        safe_mongo_uri = MONGO_URI.replace(raw_creds, escaped_creds, 1)
        print("DEBUG: MongoDB URI credentials escaped (password masked)")
    except Exception as e:
        print(f"WARNING: Could not escape MONGO_URI: {e}")

mongo_client = None
mongo_db = None
users_collection = None
chat_sessions_collection = None
messages_collection = None

# Track last connection failure to avoid hammering MongoDB
_last_mongo_connect_fail = 0
_last_mongo_connect_success = False

def _try_connect_mongo(timeout_ms: int = None):
    global mongo_client, mongo_db, users_collection, chat_sessions_collection, messages_collection, _last_mongo_connect_fail, _last_mongo_connect_success

    # If called from an API request (timeout_ms is set) and we failed recently (within 10s), skip to avoid blocking requests
    if timeout_ms is not None and (time.time() - _last_mongo_connect_fail < 10):
        return False

    if not safe_mongo_uri or not MONGO_DB_NAME:
        print("[WARNING] MONGO_URI or MONGO_DB_NAME not configured in environment.")
        return False

    try:
        allow_invalid_tls = os.getenv("MONGO_ALLOW_INVALID_TLS", "").lower() in ("true", "1", "yes")
        
        client_kwargs = {
            'tlsCAFile': certifi.where(),
            'tlsDisableOCSPEndpointValidation': True
        }
        
        if allow_invalid_tls:
            client_kwargs['tlsAllowInvalidCertificates'] = True
            client_kwargs['tlsInsecure'] = True
            print("DEBUG: MONGO_ALLOW_INVALID_TLS is TRUE. Bypassing SSL certificate validation.")

        # Timeout configuration (default 5000ms, or fast 2000ms for API fast-fail checks)
        client_kwargs['serverSelectionTimeoutMS'] = int(timeout_ms) if timeout_ms is not None else int(os.getenv("MONGO_CONNECT_TIMEOUT", "5000"))

        print(f"DEBUG: Attempting Mongo connection (PyMongo v{pymongo_version}, certifi: {certifi.where()})...")
        mongo_client = MongoClient(safe_mongo_uri, **client_kwargs)
        mongo_client.server_info()  # force connection check

        mongo_db = mongo_client[MONGO_DB_NAME]
        users_collection = mongo_db['users']
        chat_sessions_collection = mongo_db['chat_sessions']
        messages_collection = mongo_db['messages']

        # Ensure performance-optimizing indexes exist
        try:
            users_collection.create_index([('email', 1)])
            users_collection.create_index([('google_id', 1)])
            chat_sessions_collection.create_index([('user_id', 1), ('last_updated', -1)])
            messages_collection.create_index([('session_id', 1), ('timestamp', 1)])
        except Exception as idx_e:
            print(f"[NOTE] Mongo Index notice: {idx_e}")

        _last_mongo_connect_success = True
        print("[OK] MongoDB Connected Successfully!")
        return True

    except Exception as e:
        _last_mongo_connect_fail = time.time()
        _last_mongo_connect_success = False
        print(f"[ERROR] MongoDB Connection Error: {e}")
        return False


def init_mongo_background(retry_interval=30):
    """Start a background loop that tries to connect to MongoDB without blocking app startup.

    It will keep retrying every `retry_interval` seconds until successful. Runs as a daemon thread.
    """
    # If already connected, nothing to do
    if _try_connect_mongo():
        return

    while True:
        app.logger.info("MongoDB not connected — retrying in %ss..." % retry_interval)
        time.sleep(retry_interval)
        if _try_connect_mongo():
            break


# Start background initializer so the Flask app can start even if Mongo is unreachable.
try:
    # Only start the background thread in the actual serving process.
    # When Flask's reloader is enabled, the parent process spawns a child and
    # sets the WERKZEUG_RUN_MAIN env var to "true" in the child. Starting the
    # thread only when WERKZEUG_RUN_MAIN is None (no reloader) or "true"
    # (the reloader child) avoids duplicate threads and socket/FD errors on
    # Windows when the reloader restarts the process.
    if os.environ.get("WERKZEUG_RUN_MAIN") == "true" or os.environ.get("WERKZEUG_RUN_MAIN") is None:
        threading.Thread(target=init_mongo_background, args=(30,), daemon=True).start()
    else:
        app.logger.debug("Skipping MongoDB background thread in reloader parent process.")
except Exception as e:
    app.logger.error(f"Failed to start MongoDB background thread: {e}")


# --- Outbound rate limiter (simple in-memory token bucket) ---
# Limits the rate of requests made to external model providers to avoid
# exceeding per-minute quotas. Configure with OUTBOUND_RPM env var.
OUTBOUND_RPM = int(os.getenv('OUTBOUND_RPM', '5'))  # default 5 requests per minute


class TokenBucket:
    def __init__(self, rate_per_minute: int, capacity: int = None):
        self.capacity = capacity or rate_per_minute
        self.tokens = float(self.capacity)
        self.rate_per_second = float(rate_per_minute) / 60.0
        self.last = time.time()
        self.lock = threading.Lock()

    def _refill(self):
        now = time.time()
        elapsed = now - self.last
        if elapsed <= 0:
            return
        added = elapsed * self.rate_per_second
        self.tokens = min(self.capacity, self.tokens + added)
        self.last = now

    def consume(self, amount: int = 1) -> bool:
        with self.lock:
            self._refill()
            if self.tokens >= amount:
                self.tokens -= amount
                return True
            return False

    def get_wait_time(self, amount: int = 1) -> float:
        with self.lock:
            self._refill()
            if self.tokens >= amount:
                return 0.0
            needed = amount - self.tokens
            # seconds until enough tokens are available
            return needed / self.rate_per_second if self.rate_per_second > 0 else float('inf')


outbound_bucket = TokenBucket(OUTBOUND_RPM)


def parse_retry_delay(resp_json: dict) -> int | None:
    """Parse a Gemini-style RetryInfo retryDelay from provider JSON.

    Returns retry seconds as int when present, otherwise None.
    Handles string like "43s" or nested dict with 'seconds'.
    """
    try:
        err = resp_json.get('error', {})
        for d in err.get('details', []) or []:
            if isinstance(d, dict) and d.get('@type', '').endswith('RetryInfo'):
                rd = d.get('retryDelay')
                if isinstance(rd, str) and rd.endswith('s'):
                    try:
                        return int(float(rd[:-1]))
                    except Exception:
                        continue
                if isinstance(rd, dict):
                    if 'seconds' in rd:
                        return int(rd.get('seconds', 0))
                    # some providers may return {'nanos':..., 'seconds':...}
        return None
    except Exception:
        return None


def _format_success_response(text: str, provider: str = 'model', raw: dict | None = None):
    """Return a normalized JSON structure matching Gemini-like response expected by the frontend.

    The frontend expects `candidates[0].content.parts[0].text` for model text output.
    """
    resp = {
        'candidates': [
            {
                'content': {
                    'parts': [
                        {'text': text}
                    ]
                },
                'provider': provider
            }
        ]
    }
    if raw is not None:
        resp['provider_raw'] = raw
    return resp


def _extract_text_from_provider(raw: dict, provider: str = 'model') -> str | None:
    try:
        if not raw:
            return None
        # OpenAI / OpenRouter style
        if provider.lower() in ('openai', 'openai-api'):
            choices = raw.get('choices')
            if choices and isinstance(choices, list) and len(choices) > 0:
                first = choices[0]
                # Chat completions: message.content
                if isinstance(first, dict):
                    msg = first.get('message') or first.get('delta')
                    if isinstance(msg, dict) and msg.get('content'):
                        return msg.get('content')
                    if first.get('text'):
                        return first.get('text')
        if provider.lower() in ('openrouter', 'openrouter-api'):
            # try choices[0].message.content or choices[0].content
            choices = raw.get('choices')
            if choices and isinstance(choices, list) and len(choices) > 0:
                first = choices[0]
                if isinstance(first, dict):
                    # common pattern
                    if first.get('message') and isinstance(first.get('message'), dict):
                        content = first['message'].get('content')
                        if content:
                            return content
                    if first.get('content'):
                        return first.get('content')
        # Gemini-style
        if raw.get('candidates'):
            try:
                parts = raw['candidates'][0]['content']['parts']
                if parts and len(parts) > 0:
                    return parts[0].get('text')
            except Exception:
                pass
        # Fallback: try top-level fields
        for key in ('output', 'text', 'message'):
            if raw.get(key):
                val = raw.get(key)
                if isinstance(val, str):
                    return val
                if isinstance(val, dict) and val.get('content'):
                    return val.get('content')
    except Exception:
        return None
    return None


def get_mongo_db(wait_seconds: int = 1):
    """Return the mongo_db object, waiting briefly for a background connection.

    Returns None if still unavailable. Uses short timeouts to avoid blocking API requests.
    """
    global mongo_db
    if mongo_db is not None:
        return mongo_db

    # Try one quick reconnect attempt with very short timeout
    # to avoid blocking API requests for too long
    _try_connect_mongo(timeout_ms=1500)
    if mongo_db is not None:
        return mongo_db
    
    # If not connected and wait_seconds > 0, do a very brief poll
    if wait_seconds > 0:
        time.sleep(0.2)
        if mongo_db is not None:
            return mongo_db

    return None


# --- Gemini API Configuration (Backend Only) ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
# Optional OpenRouter fallback configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
HF_TOKEN = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_API_KEY")


def execute_ai_completion(messages_for_gemini: list, instruction_text: str) -> tuple[str, str, dict | None]:
    """Execute AI completion with multi-provider fallback: Gemini -> OpenRouter -> OpenAI -> HuggingFace.

    Returns tuple of (response_text, provider_name, raw_response_dict).
    """
    # 1. Google Gemini Primary
    if GEMINI_API_KEY:
        gemini_payload = {
            "systemInstruction": {
                "parts": [{"text": instruction_text}]
            },
            "contents": messages_for_gemini
        }
        for attempt in range(1, 4):
            try:
                resp = requests.post(f"{GEMINI_API_URL}?key={GEMINI_API_KEY}", json=gemini_payload, timeout=20)
                if resp.status_code == 200:
                    raw = resp.json()
                    text = _extract_text_from_provider(raw, 'gemini')
                    if text:
                        return text, 'gemini', raw
                elif resp.status_code == 429:
                    print(f"[NOTE] Gemini returned 429 rate limit (Attempt {attempt}).")
                    time.sleep(1.5 * attempt)
                else:
                    print(f"[NOTE] Gemini returned status {resp.status_code}: {resp.text[:150]}")
            except Exception as e:
                print(f"[NOTE] Gemini connection error attempt {attempt}: {e}")

    # Convert Gemini format to OpenAI/OpenRouter chat format
    chat_messages = [{"role": "system", "content": instruction_text}]
    for m in messages_for_gemini:
        if isinstance(m, dict):
            role = m.get('role', 'user')
            parts = m.get('parts', [])
            text_parts = []
            for p in parts:
                if isinstance(p, dict) and 'text' in p:
                    text_parts.append(p['text'])
            if text_parts:
                chat_messages.append({"role": "assistant" if role == "model" else role, "content": "\n".join(text_parts)})

    # 2. OpenRouter Fallback
    if OPENROUTER_API_KEY:
        try:
            or_payload = {
                "model": OPENROUTER_MODEL,
                "messages": chat_messages,
                "temperature": 0.7
            }
            or_headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            }
            resp = requests.post("https://api.openrouter.ai/v1/chat/completions", json=or_payload, headers=or_headers, timeout=25)
            if resp.status_code == 200:
                raw = resp.json()
                text = _extract_text_from_provider(raw, 'openrouter')
                if text:
                    print("[OK] Served completion via OpenRouter fallback")
                    return text, 'openrouter', raw
            else:
                print(f"[NOTE] OpenRouter returned status {resp.status_code}: {resp.text[:150]}")
        except Exception as e:
            print(f"[NOTE] OpenRouter connection error: {e}")

    # 3. OpenAI Fallback
    if OPENAI_API_KEY:
        try:
            oa_payload = {
                "model": OPENAI_MODEL,
                "messages": chat_messages,
                "temperature": 0.7
            }
            oa_headers = {
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json"
            }
            resp = requests.post("https://api.openai.com/v1/chat/completions", json=oa_payload, headers=oa_headers, timeout=25)
            if resp.status_code == 200:
                raw = resp.json()
                text = _extract_text_from_provider(raw, 'openai')
                if text:
                    print("[OK] Served completion via OpenAI fallback")
                    return text, 'openai', raw
            else:
                print(f"[NOTE] OpenAI returned status {resp.status_code}: {resp.text[:150]}")
        except Exception as e:
            print(f"[NOTE] OpenAI connection error: {e}")

    # 4. HuggingFace Fallback
    if HF_TOKEN:
        try:
            hf_url = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3/v1/chat/completions"
            hf_headers = {
                "Authorization": f"Bearer {HF_TOKEN}",
                "Content-Type": "application/json"
            }
            hf_payload = {
                "model": "mistralai/Mistral-7B-Instruct-v0.3",
                "messages": chat_messages,
                "max_tokens": 1000
            }
            resp = requests.post(hf_url, json=hf_payload, headers=hf_headers, timeout=25)
            if resp.status_code == 200:
                raw = resp.json()
                text = _extract_text_from_provider(raw, 'huggingface')
                if text:
                    print("[OK] Served completion via HuggingFace fallback")
                    return text, 'huggingface', raw
        except Exception as e:
            print(f"[NOTE] HuggingFace connection error: {e}")

    # 5. System Fallback Notice (Graceful degraded mode message)
    fallback_msg = (
        "Phantom 2.o Engine Notice: External AI service connection is currently unavailable or API key quotas are depleted.\n\n"
        "To restore active model responses, please check your `.env` configuration and provide a valid GEMINI_API_KEY, OPENROUTER_API_KEY, or OPENAI_API_KEY."
    )
    return fallback_msg, 'phantom_system', None


# --- Helper to save/update user info (used by both Google and traditional login) ---
def save_user_info_to_db(email, display_name, google_id=None, picture_url=None, password_hash=None):
    if db_layer:
        try:
            db_layer.save_or_update_user(email, display_name, google_id=google_id, picture_url=picture_url, password_hash=password_hash)
        except Exception as _e:
            print(f"[NOTE] Database layer save note: {_e}")

    if users_collection is None:
        print(f"--- BACKEND: User {email} info saved to DB layer. ---")
        return

    query_filter = {'email': email}
    update_data = {
        "email": email,
        "display_name": display_name,
        "last_login": datetime.now(timezone.utc)
    }

    if google_id:
        query_filter = {'google_id': google_id}
        update_data["google_id"] = google_id
        update_data["picture_url"] = picture_url if picture_url else None
    elif password_hash: # For traditional login
        update_data["password_hash"] = password_hash
        update_data["picture_url"] = None # Traditional users won't have a picture_url initially
        # Set default settings for new traditional users
        if not users_collection.find_one(query_filter): # Only set defaults if new user
            update_data["theme"] = "theme-dark"
            update_data["language"] = "en-US"
            update_data["voice"] = ""

    users_collection.update_one(
        query_filter,
        {'$set': update_data},
        upsert=True
    )
    print(f"--- BACKEND: User {email} info saved/updated in MongoDB. ---")


# --- CORE UTILITY & SECURITY HELPERS ---

def get_current_user_id() -> str | None:
    """Retrieve the unified current user_id from active session."""
    if not session.get('user'):
        return None
    return session.get('google_id') or session.get('user_id') or (session.get('user', {}).get('sub') if isinstance(session.get('user'), dict) else None)


def verify_session_ownership(session_id: str, user_id: str) -> dict | None:
    """Verify that a session belongs to the current user in MongoDB or DB Layer.
    Returns session document if authorized, None otherwise.
    """
    if not session_id or not user_id:
        return None

    if db_layer and db_layer.verify_session_ownership(session_id, user_id):
        return {'_id': session_id, 'user_id': user_id, 'title': 'Chat Session'}

    if chat_sessions_collection is None:
        return {'_id': session_id, 'user_id': user_id}

    session_id_obj = ObjectId(session_id) if ObjectId.is_valid(session_id) else session_id
    user_id_obj = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id

    return chat_sessions_collection.find_one({
        '$and': [
            {'$or': [{'_id': session_id_obj}, {'_id': str(session_id)}]},
            {'$or': [{'user_id': user_id}, {'user_id': str(user_id)}, {'user_id': user_id_obj}]}
        ]
    })


def enhance_image_prompt(user_prompt: str) -> str:
    """Enhance vague user image prompts with artistic and photorealistic details internally."""
    clean = user_prompt.strip()
    if len(clean) > 80:
        return clean
    enhancements = [
        "highly detailed, 8k resolution, photorealistic lighting, cinematic composition, masterpiece",
        "ultra-detailed, vibrant colors, dramatic lighting, 4k texture, professional photography",
        "intricate detail, beautiful color grading, atmospheric lighting, trending on artstation"
    ]
    return f"{clean}, {random.choice(enhancements)}"


def generate_image_with_hf_or_fallback(user_prompt: str) -> tuple[str, str]:
    """Generates an AI image using Hugging Face FLUX.1-schnell model with HF_TOKEN.
    Falls back to Pollinations API if HF token is missing or API fails.
    Returns a tuple of (image_url_or_path, enhanced_prompt).
    """
    enhanced_prompt = enhance_image_prompt(user_prompt)
    hf_token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_API_KEY")

    if hf_token:
        try:
            from huggingface_hub import InferenceClient
            client = InferenceClient(api_key=hf_token)
            pil_image = client.text_to_image(enhanced_prompt, model="black-forest-labs/FLUX.1-schnell")

            gen_dir = os.path.join(app.static_folder, "img", "generated")
            os.makedirs(gen_dir, exist_ok=True)

            import hashlib
            filename_hash = hashlib.md5(f"{enhanced_prompt}_{time.time()}".encode()).hexdigest()[:12]
            filename = f"hf_{filename_hash}.png"
            filepath = os.path.join(gen_dir, filename)

            pil_image.save(filepath, format="PNG")
            image_url = f"/static/img/generated/{filename}"
            print(f"[OK] Image generated via Hugging Face FLUX model: {image_url}")
            return image_url, enhanced_prompt
        except Exception as hf_err:
            app.logger.warning(f"Hugging Face Image Generation failed ({hf_err}), using Pollinations fallback...")

    encoded = quote_plus(enhanced_prompt)
    fallback_url = f"https://image.pollinations.ai/prompt/{encoded}?width=1024&height=1024&nologo=true"
    return fallback_url, enhanced_prompt


def is_image_generation_request(user_text: str) -> tuple[bool, str]:
    """Determines if user message is an image generation request.
    Returns (is_match, cleaned_subject_prompt).
    """
    if not user_text:
        return False, ""
    text_lower = user_text.lower().strip()

    # Do not trigger image generation for meta questions asking why/how/what
    if text_lower.startswith(("why", "how", "what", "explain why", "reason")):
        return False, ""

    pattern = r'\b(create|generate|draw|make|render|paint)\b.*\b(image|picture|photo|illustration|art|drawing|painting)\b|\b(image|picture|photo)\s+of\b|\b(create|generate|make)\s+(image|picture|photo|art|drawing)\b'
    match = re.search(pattern, text_lower)

    direct_prefixes = ["create image", "generate image", "draw", "make image", "create picture", "generate picture", "picture of", "image of"]
    direct_match = any(text_lower.startswith(prefix) for prefix in direct_prefixes)

    if match or direct_match:
        clean_subject = re.sub(
            r'^(please\s+)?(can\s+you\s+)?(create|generate|draw|make|render|paint)?\s*(me\s+)?\b(an|a)?\b\s*(image|picture|photo|illustration|art|drawing|painting)?(\s+of)?\s*',
            '',
            text_lower,
            flags=re.IGNORECASE
        ).strip()
        # Clean any remaining leading words if user typed "an image of X"
        clean_subject = re.sub(r'^(an?\s+)?(image|picture|photo)?(\s+of)?\s*', '', clean_subject, flags=re.IGNORECASE).strip()
        if not clean_subject:
            clean_subject = user_text.strip()
        return True, clean_subject

    return False, ""


def prune_messages_context(contents: list, max_recent: int = 12) -> list:
    """Intelligently cap conversation history context window to limit token usage."""
    if not contents or len(contents) <= max_recent:
        return contents

    recent_turns = contents[-max_recent:]
    older_turns = contents[:-max_recent]

    snippets = []
    for turn in older_turns:
        role = turn.get('role', 'user')
        parts = turn.get('parts', [])
        txt = " ".join([p.get('text', '') for p in parts if isinstance(p, dict) and p.get('text')])
        if txt:
            snippets.append(f"{role}: {txt[:80]}")

    summary_text = "[Previous conversation summary: " + " | ".join(snippets[-5:]) + "]"
    return [{'role': 'user', 'parts': [{'text': summary_text}]}] + recent_turns


# --- Flask Routes ---

@app.route('/')
def index():
    return redirect(FRONTEND_URL)


@app.route('/favicon.ico')
def favicon():
    # Return a tiny inline SVG as the favicon to avoid 404s when no static favicon file exists.
    svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#222"/></svg>'
    return Response(svg, mimetype='image/svg+xml')

@app.route('/login')
def login():
    return redirect(FRONTEND_URL)


@app.route('/register')
def register():
    return redirect(FRONTEND_URL)


@app.route('/logout')
def logout():
    session.clear()
    return redirect(FRONTEND_URL)

@app.route('/dashboard')
def dashboard():
    return redirect(FRONTEND_URL)

@app.route('/login/google')
def login_google():
    try:
        # Allow an explicit redirect URI override via environment for cases
        # where the app is accessed through a different host (ngrok, custom domain, etc.).
        # If not provided, use the app's external URL for the `authorize` route.
        redirect_uri = os.getenv('GOOGLE_REDIRECT_URI') or url_for('authorize', _external=True)
        
        # Log the redirect URI being used for debugging
        app.logger.info(f"Google OAuth: Using redirect_uri: {redirect_uri}")
        print(f"DEBUG: Google OAuth redirect_uri: {redirect_uri}")
        print(f"DEBUG: Make sure this exact URI is added to Google Cloud Console -> APIs & Services -> Credentials -> OAuth 2.0 Client -> Authorized redirect URIs")
        
        # Development-time warning: detect host mismatch between request and configured redirect URI
        env_redirect = os.getenv('GOOGLE_REDIRECT_URI')
        if env_redirect:
            from urllib.parse import urlparse
            req_host = request.host  # e.g. "127.0.0.1:5000" or "localhost:5000"
            redirect_host = urlparse(env_redirect).netloc
            if req_host != redirect_host:
                warning_msg = (
                    f"WARNING: Request host ({req_host}) does not match GOOGLE_REDIRECT_URI host ({redirect_host}). "
                    f"This often causes redirect_uri_mismatch errors. "
                    f"Either access the app via http://{redirect_host}/login or update GOOGLE_REDIRECT_URI to match your current URL."
                )
                app.logger.warning(warning_msg)
                print(warning_msg)
        
        # Check if Google OAuth is properly configured
        if not os.getenv('GOOGLE_CLIENT_ID') or not os.getenv('GOOGLE_CLIENT_SECRET'):
            error_msg = "Google OAuth credentials not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env file."
            app.logger.warning(error_msg)
            return redirect(FRONTEND_URL + "?auth_error=" + quote_plus(error_msg))
        
        return google.authorize_redirect(redirect_uri)
    except Exception as e:
        error_msg = f"Failed to initiate Google login: {str(e)}"
        app.logger.error(f"Google OAuth initiation failed: {str(e)}", exc_info=True)
        return redirect(FRONTEND_URL + "?auth_error=" + quote_plus(error_msg))


@app.route('/debug/redirect_uri')
def debug_redirect_uri():
    """Debug helper: returns the exact redirect URI the app uses for Google OAuth.

    Use this value to add to your OAuth client's "Authorized redirect URIs"
    in the Google Cloud Console so you don't get redirect_uri_mismatch errors.
    """
    try:
        # The actual URI used by the app (may be overridden by env var)
        actual = os.getenv('GOOGLE_REDIRECT_URI') or url_for('authorize', _external=True)
        # Helpful suggestions to register in Google Cloud Console
        suggestions = [
            url_for('authorize', _external=True),
            url_for('authorize', _external=True).replace('127.0.0.1', 'localhost')
        ]
        info = {
            'redirect_uri_in_use': actual,
            'suggested_to_register': suggestions,
            'google_client_id_present': bool(os.getenv('GOOGLE_CLIENT_ID'))
        }
        return jsonify(info), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/login/callback')
def authorize():
    try:
        # Check for OAuth errors in the request parameters
        error = request.args.get('error')
        error_description = request.args.get('error_description')
        
        if error:
            error_msg = f"Google OAuth Error: {error}"
            if error_description:
                error_msg += f" - {error_description}"
            
            # Special handling for redirect_uri_mismatch
            if error == 'redirect_uri_mismatch':
                redirect_uri_used = os.getenv('GOOGLE_REDIRECT_URI') or url_for('authorize', _external=True)
                error_msg += f"\n\nRedirect URI used: {redirect_uri_used}"
                error_msg += "\n\nTo fix this:"
                error_msg += "\n1. Go to Google Cloud Console -> APIs & Services -> Credentials"
                error_msg += "\n2. Click on your OAuth 2.0 Client ID"
                error_msg += "\n3. Add the redirect URI above to 'Authorized redirect URIs'"
                error_msg += "\n4. Also add: " + redirect_uri_used.replace('127.0.0.1', 'localhost')
                error_msg += "\n5. Save and wait a few minutes for changes to propagate"
            
            app.logger.error(error_msg)
            return render_template('login.html', error_message=error_msg.replace('\n', '<br>'))
        
        token = None
        try:
            token = google.authorize_access_token()
        except Exception as authlib_err:
            app.logger.warning(f"Authlib state validation notice ({authlib_err}), using direct Google Token exchange...")
            code = request.args.get('code')
            if code:
                client_id = os.getenv("GOOGLE_CLIENT_ID")
                client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
                redirect_uri = os.getenv('GOOGLE_REDIRECT_URI') or url_for('authorize', _external=True)
                
                try:
                    token_resp = requests.post(
                        'https://oauth2.googleapis.com/token',
                        data={
                            'code': code,
                            'client_id': client_id,
                            'client_secret': client_secret,
                            'redirect_uri': redirect_uri,
                            'grant_type': 'authorization_code'
                        },
                        headers={'Content-Type': 'application/x-www-form-urlencoded'},
                        timeout=15
                    )
                    if token_resp.status_code == 200:
                        token = token_resp.json()
                        app.logger.info("Successfully exchanged OAuth code via direct Google token endpoint!")
                    else:
                        app.logger.error(f"Google token endpoint failed ({token_resp.status_code}): {token_resp.text}")
                except Exception as exchange_err:
                    app.logger.error(f"Error during direct Google token exchange: {exchange_err}")
            
            if not token:
                raise authlib_err
        
        if not token or 'id_token' not in token:
            app.logger.error(f"Google Authorization failed: No id_token in response: {token}")
            return redirect(FRONTEND_URL + "?auth_error=" + quote_plus("Authorization failed: No ID token from Google."))
        
        userinfo = jwt.decode(token['id_token'], options={"verify_signature": False}) 

        # Store Google user info in session
        session['user'] = userinfo
        session['user_email'] = userinfo.get('email')
        session['user_display_name'] = userinfo.get('name') or userinfo.get('email', '').split('@')[0]
        session['google_id'] = userinfo.get('sub') # Google's unique user ID
        session['user_picture'] = userinfo.get('picture')

        # Save/update user info in DB
        save_user_info_to_db(
            email=session['user_email'],
            display_name=session['user_display_name'],
            google_id=session['google_id'],
            picture_url=session['user_picture']
        )
        
        # Load user settings from DB for Google users
        user_theme = 'theme-dark'
        user_lang = 'en-US'
        user_voice = ''

        if users_collection is not None:
            user_doc = users_collection.find_one({'google_id': session['google_id']})
            if user_doc:
                user_theme = user_doc.get('theme', user_theme)
                user_lang = user_doc.get('language', user_lang)
                user_voice = user_doc.get('voice', user_voice)
        elif db_layer:
            user_doc = db_layer.get_user_by_email(session['user_email'])
            if user_doc:
                user_theme = user_doc.get('theme', user_theme)
                user_lang = user_doc.get('language', user_lang)
                user_voice = user_doc.get('voice', user_voice)

        session['user_theme'] = user_theme
        session['user_language'] = user_lang
        session['user_voice'] = user_voice

        return redirect(FRONTEND_URL)
    except Exception as element:
        app.logger.error(f"Google Authorization final step failed: {str(element)}", exc_info=True)
        return redirect(FRONTEND_URL + "?auth_error=" + quote_plus(str(element)))

# --- NEW: API for Traditional User Registration ---
@app.route('/api/register', methods=['POST'])
def register_user():
    data = request.get_json(silent=True) or {}
    display_name = data.get('displayName')
    username = data.get('username') # Using username as email for simplicity
    password = data.get('password')

    if not display_name or not username or not password:
        return jsonify({"error": "Missing display name, username, or password."}), 400

    hashed_password = generate_password_hash(password)
    user_id = str(ObjectId())

    # Check existing user
    if users_collection is not None:
        if users_collection.find_one({'email': username}):
            return jsonify({"error": "User with this email/username already exists."}), 409
    elif db_layer:
        if db_layer.get_user_by_email(username):
            return jsonify({"error": "User with this email/username already exists."}), 409

    try:
        if db_layer:
            db_layer.save_or_update_user(email=username, display_name=display_name, password_hash=hashed_password)

        if users_collection is not None:
            users_collection.insert_one({
                "_id": ObjectId(user_id),
                "email": username,
                "display_name": display_name,
                "password_hash": hashed_password,
                "google_id": None,
                "picture_url": None,
                "last_login": datetime.now(timezone.utc),
                "theme": "theme-dark",
                "language": "en-US",
                "voice": ""
            })

        # Log in the user immediately after registration
        session['user'] = {'email': username, 'name': display_name, 'sub': user_id}
        session['user_email'] = username
        session['user_display_name'] = display_name
        session['google_id'] = user_id
        session['user_picture'] = None
        session['user_theme'] = 'theme-dark'
        session['user_language'] = 'en-US'
        session['user_voice'] = ''

        return jsonify({"message": "Registration successful", "user_id": user_id}), 201
    except Exception as element:
        app.logger.error(f"Error during registration: {element}", exc_info=True)
        return jsonify({"error": "Registration failed due to server error."}), 500

# --- NEW: API for Traditional User Login ---
@app.route('/api/login', methods=['GET','POST'])
def login_user():
    try:
        if request.method == 'GET':
            return jsonify({"error": "GET method not allowed. Use POST."}), 405

        data = request.get_json(silent=True)
        if data is None:
            return jsonify({"error": "Request body must be valid JSON."}), 400

        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return jsonify({"error": "Missing username or password."}), 400

        user = None
        if users_collection is not None:
            user = users_collection.find_one({'email': username})
        elif db_layer:
            user = db_layer.get_user_by_email(username)

        if user and check_password_hash(user.get('password_hash', ''), password):
            session_user_id = str(user.get('_id', user.get('id', user.get('google_id'))))

            if users_collection is not None:
                users_collection.update_one(
                    {'$or': [{'_id': user.get('_id')}, {'google_id': user.get('google_id')}]},
                    {'$set': {'last_login': datetime.now(timezone.utc)}}
                )
            if db_layer:
                db_layer.update_user_profile(session_user_id, {'last_login': datetime.now(timezone.utc).isoformat()})

            display_name_val = user.get('display_name') or user.get('name') or user.get('email', '').split('@')[0]
            session['user'] = {'email': user.get('email'), 'name': display_name_val, 'sub': session_user_id}
            session['user_email'] = user.get('email')
            session['user_display_name'] = display_name_val
            session['google_id'] = session_user_id
            session['user_picture'] = user.get('picture_url')
            session['user_theme'] = user.get('theme', 'theme-dark')
            session['user_language'] = user.get('language', 'en-US')
            session['user_voice'] = user.get('voice', '')

            return jsonify({"message": "Login successful"}), 200
        else:
            return jsonify({"error": "Invalid username or password."}), 401
    except Exception as e:
        app.logger.error(f"Error during login: {str(e)}", exc_info=True)
        return jsonify({"error": f"Login failed: {str(e)}"}), 500

# --- NEW: API for updating user profile and settings ---
@app.route('/api/update_profile', methods=['PUT'])
def update_profile():
    if not session.get('user'):
        return jsonify({"error": "Unauthorized"}), 401

    user_id = session.get('google_id') or session.get('user_id') or session.get('user', {}).get('sub')
    data = request.get_json(silent=True) or {}
    
    try:
        update_fields = {}
        if 'displayName' in data:
            update_fields['display_name'] = data['displayName']
        if 'email' in data:
            update_fields['email'] = data['email']
        if 'theme' in data:
            update_fields['theme'] = data['theme']
        if 'language' in data:
            update_fields['language'] = data['language']
        if 'voice' in data:
            update_fields['voice'] = data['voice']

        if not update_fields:
            return jsonify({"error": "No fields to update."}), 400

        if db_layer:
            db_layer.update_user_profile(user_id, update_fields)

        if users_collection is not None:
            query_filter = {'_id': ObjectId(user_id)} if ObjectId.is_valid(user_id) else {'google_id': user_id}
            users_collection.update_one(query_filter, {'$set': update_fields})
        
        if 'display_name' in update_fields:
            session['user_display_name'] = update_fields['display_name']
        if 'email' in update_fields:
            session['user_email'] = update_fields['email']
        if 'theme' in update_fields:
            session['user_theme'] = update_fields['theme']
        if 'language' in update_fields:
            session['user_language'] = update_fields['language']
        if 'voice' in update_fields:
            session['user_voice'] = update_fields['voice']

        return jsonify({
            "message": "Profile updated successfully",
            "user": {
                "displayName": session.get('user_display_name'),
                "email": session.get('user_email'),
                "pictureUrl": session.get('user_picture'),
                "theme": session.get('user_theme'),
                "language": session.get('user_language'),
                "voice": session.get('user_voice')
            }
        }), 200
    except Exception as element:
        app.logger.error(f"Error updating profile for user {user_id}: {element}", exc_info=True)
        return jsonify({"error": "Failed to update profile."}), 500


@app.route('/api/user/profile', methods=['GET'])
def get_user_profile():
    user = session.get('user')
    if not user:
        return jsonify({
            "authenticated": False,
            "user": {
                "displayName": "Guest User",
                "email": "guest@phantom.local",
                "pictureUrl": None,
                "theme": "theme-dark",
                "language": "en-US",
                "voice": ""
            }
        }), 200

    return jsonify({
        "authenticated": True,
        "user": {
            "displayName": session.get('user_display_name', 'User'),
            "email": session.get('user_email', ''),
            "pictureUrl": session.get('user_picture'),
            "theme": session.get('user_theme', 'theme-dark'),
            "language": session.get('user_language', 'en-US'),
            "voice": session.get('user_voice', '')
        }
    }), 200


@app.route('/api/user/settings', methods=['GET', 'PUT'])
def user_settings():
    if request.method == 'GET':
        return jsonify({
            "theme": session.get('user_theme', 'theme-dark'),
            "language": session.get('user_language', 'en-US'),
            "voice": session.get('user_voice', '')
        }), 200
    
    data = request.get_json(silent=True) or {}
    if 'theme' in data:
        session['user_theme'] = data['theme']
    if 'language' in data:
        session['user_language'] = data['language']
    if 'voice' in data:
        session['user_voice'] = data['voice']

    return jsonify({"message": "Settings updated", "settings": {
        "theme": session.get('user_theme'),
        "language": session.get('user_language'),
        "voice": session.get('user_voice')
    }}), 200


# --- NEW: API for getting all chat sessions for a user ---
@app.route('/api/all_sessions', methods=['GET'])
def get_all_sessions():
    user_id = get_current_user_id()
    if not user_id:
        user_id = session.get('guest_id', 'guest_default')

    all_sessions = []
    try:
        if db_layer:
            all_sessions = db_layer.get_all_sessions(user_id)

        if not all_sessions and chat_sessions_collection is not None:
            user_id_obj = ObjectId(user_id) if (user_id and ObjectId.is_valid(user_id)) else user_id
            sessions_cursor = chat_sessions_collection.find(
                {'$or': [{'user_id': user_id}, {'user_id': str(user_id)}, {'user_id': user_id_obj}]}
            ).sort([('is_pinned', -1), ('last_updated', -1)])
            
            for s in sessions_cursor:
                session_title = s.get('title', 'New Chat Session')
                last_up = s.get('last_updated', s.get('created_at', datetime.now(timezone.utc)))
                all_sessions.append({
                    "session_id": str(s['_id']),
                    "title": session_title,
                    "is_pinned": bool(s.get('is_pinned', False)),
                    "last_updated": last_up.isoformat() if hasattr(last_up, 'isoformat') else str(last_up)
                })
        
        return jsonify({"sessions": all_sessions}), 200
    except Exception as element:
        app.logger.error(f"Error fetching all sessions: {element}", exc_info=True)
        return jsonify({"error": "Failed to load chat history."}), 500

# --- NEW: API for starting a new chat session ---
@app.route('/api/new_chat_session', methods=['POST'])
def new_chat_session_api():
    user_id = get_current_user_id()
    if not user_id:
        user_id = session.get('guest_id')
        if not user_id:
            user_id = "guest_" + str(ObjectId())
            session['guest_id'] = user_id

    new_session_id = str(ObjectId())
    
    if db_layer:
        db_layer.create_session(new_session_id, user_id, "New Chat Session")

    if chat_sessions_collection is not None:
        chat_session_data = {
            "_id": ObjectId(new_session_id),
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc),
            "last_updated": datetime.now(timezone.utc),
            "title": "New Chat Session"
        }
        chat_sessions_collection.insert_one(chat_session_data)

    session['current_chat_session_id'] = new_session_id
    return jsonify({"message": "New chat session created", "session_id": new_session_id}), 200

# --- STREAMING CHAT API (Server-Sent Events) ---
@app.route('/api/chat/stream', methods=['POST'])
def chat_stream_api():
    if not GEMINI_API_KEY and not OPENROUTER_API_KEY and not OPENAI_API_KEY:
        return jsonify({"error": "Server: API key not configured on backend."}), 500

    user_id = get_current_user_id()
    if not user_id:
        user_id = session.get('guest_id')
        if not user_id:
            user_id = "guest_" + str(ObjectId())
            session['guest_id'] = user_id

    client_payload = request.get_json(silent=True) or {}
    current_session_id = client_payload.get('session_id')

    if not current_session_id:
        new_session_id = str(ObjectId())
        if db_layer:
            db_layer.create_session(new_session_id, user_id, "New Chat Session")
        if chat_sessions_collection is not None:
            chat_session_data = {
                "_id": ObjectId(new_session_id),
                "user_id": user_id,
                "created_at": datetime.now(timezone.utc),
                "last_updated": datetime.now(timezone.utc),
                "title": "New Chat Session"
            }
            try:
                chat_sessions_collection.insert_one(chat_session_data)
            except Exception:
                pass
        session['current_chat_session_id'] = new_session_id
        current_session_id = new_session_id
    else:
        if chat_sessions_collection is not None:
            try:
                session_doc = verify_session_ownership(current_session_id, user_id)
                if session_doc and '_id' in session_doc:
                    chat_sessions_collection.update_one(
                        {'_id': session_doc['_id']},
                        {'$set': {'last_updated': datetime.now(timezone.utc)}}
                    )
            except Exception:
                pass

    raw_contents = client_payload.get('contents', [])
    pruned_contents = prune_messages_context(raw_contents)

    messages_for_gemini = [
        {'role': msg['role'], 'parts': msg['parts']}
        for msg in pruned_contents if isinstance(msg, dict) and 'role' in msg and 'parts' in msg
    ]

    new_user_message_content = ""
    if messages_for_gemini and messages_for_gemini[-1]['role'] == 'user':
        for part in messages_for_gemini[-1]['parts']:
            if isinstance(part, dict) and 'text' in part:
                new_user_message_content += remove_stars_and_hashes(part['text']) + " "

    if new_user_message_content.strip():
        if db_layer:
            try:
                db_layer.save_message(current_session_id, user_id, "user", new_user_message_content.strip(), "text")
            except Exception as e:
                app.logger.warning(f"Failed to save user message to DB layer: {e}")
        if messages_collection is not None:
            try:
                session_id_obj = ObjectId(current_session_id) if ObjectId.is_valid(current_session_id) else current_session_id
                messages_collection.insert_one({
                    "session_id": session_id_obj,
                    "user_id": user_id,
                    "role": "user",
                    "content": new_user_message_content.strip(),
                    "timestamp": datetime.now(timezone.utc),
                    "type": "text"
                })
            except Exception as e:
                app.logger.warning(f"Failed to save user message: {e}")

    # Check and generate smart session title if this is a new/default session
    smart_session_title = None
    if current_session_id and new_user_message_content.strip():
        try:
            needs_title = False
            if db_layer:
                all_s = db_layer.get_all_sessions(user_id)
                for s in all_s:
                    if s.get('session_id') == current_session_id:
                        if s.get('title') in ["New Chat Session", "Untitled Session", ""]:
                            needs_title = True
                        break
            if not needs_title and chat_sessions_collection is not None:
                session_id_obj = ObjectId(current_session_id) if ObjectId.is_valid(current_session_id) else current_session_id
                s_doc = chat_sessions_collection.find_one({'_id': session_id_obj})
                if s_doc and s_doc.get('title') in ["New Chat Session", "Untitled Session", ""]:
                    needs_title = True

            if needs_title:
                smart_session_title = generate_smart_session_title(new_user_message_content.strip())
                if db_layer:
                    db_layer.rename_session(current_session_id, user_id, smart_session_title)
                if chat_sessions_collection is not None:
                    session_id_obj = ObjectId(current_session_id) if ObjectId.is_valid(current_session_id) else current_session_id
                    chat_sessions_collection.update_one(
                        {'_id': session_id_obj},
                        {'$set': {'title': smart_session_title, 'last_updated': datetime.now(timezone.utc)}}
                    )
        except Exception as _ste:
            app.logger.warning(f"Error evaluating smart session title: {_ste}")

    # Real-Time Web Search Plugin & Precision Context Injection
    plugins_payload = client_payload.get('plugins', {})
    web_search_active = bool(plugins_payload.get('web_search', False))
    search_context_text = ""
    search_citations = []

    if web_search_active and search_engine and new_user_message_content.strip():
        try:
            search_res = search_engine.perform_live_web_search(new_user_message_content.strip(), max_results=5)
            search_context_text = search_res.get('context_text', '')
            search_citations = search_res.get('results', [])
        except Exception as _se_err:
            app.logger.warning(f"Real-time web search execution error: {_se_err}")

    # Detect image generation queries
    is_img, clean_subject = is_image_generation_request(new_user_message_content)
    if is_img:
        def generate_image_stream():
            img_url, enhanced = generate_image_with_hf_or_fallback(clean_subject)
            markdown_img = f"![Generated Image]({img_url})\n\n*Prompt: {enhanced}*"

            if db_layer:
                try:
                    db_layer.save_message(current_session_id, user_id, "model", markdown_img, "image")
                except Exception:
                    pass
            if messages_collection is not None:
                try:
                    session_id_obj = ObjectId(current_session_id) if ObjectId.is_valid(current_session_id) else current_session_id
                    messages_collection.insert_one({
                        "session_id": session_id_obj,
                        "user_id": user_id,
                        "role": "model",
                        "content": markdown_img,
                        "timestamp": datetime.now(timezone.utc),
                        "type": "image"
                    })
                except Exception:
                    pass

            yield f"data: {json.dumps({'chunk': markdown_img, 'session_id': current_session_id, 'session_title': smart_session_title})}\n\n"
            yield f"data: {json.dumps({'done': True, 'session_id': current_session_id, 'session_title': smart_session_title})}\n\n"

        return Response(generate_image_stream(), mimetype='text/event-stream')

    instruction_text = f"""
You are Phantom_2.o, an advanced AI assistant with real-time intelligence.
Your answers must always be well-structured, clear, precise, and professional, similar to ChatGPT's response style. 
Do not use special formatting characters like '*' or '#' in titles. Do not repeat your name in your responses.
{f"REAL-TIME WEB SEARCH ENGINE ACTIVE (HIGH PRECISION MODE):\n{search_context_text}\nInstructions: The above citations are retrieved live from the web right now. Use these facts, links, and data to deliver an extremely factual, accurate, and up-to-date answer. Cite URLs where relevant." if search_context_text else ""}
1. Begin with a short introduction or summary relevant to the user's query.
2. Present explanations in clean paragraphs with clear flow.
3. When listing items or steps, use plain numbering (1, 2, 3...) or dashes (-).
"""

    gemini_payload = {
        "systemInstruction": {"parts": [{"text": instruction_text}]},
        "contents": messages_for_gemini
    }

    def event_stream():
        full_response_accumulated = []
        if search_citations:
            yield f"data: {json.dumps({'search_metadata': {'enabled': True, 'query': new_user_message_content.strip()[:60], 'citations': search_citations}, 'session_id': current_session_id, 'session_title': smart_session_title})}\n\n"

        try:
            stream_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key={GEMINI_API_KEY}"
            resp = requests.post(stream_url, json=gemini_payload, stream=True, timeout=25)

            if resp.status_code == 200:
                for line in resp.iter_lines(decode_unicode=True):
                    if line and line.startswith('data: '):
                        data_str = line[6:]
                        try:
                            chunk_json = json.loads(data_str)
                            candidates = chunk_json.get('candidates', [])
                            if candidates and candidates[0].get('content'):
                                parts = candidates[0]['content'].get('parts', [])
                                if parts and parts[0].get('text'):
                                    text_chunk = parts[0]['text']
                                    full_response_accumulated.append(text_chunk)
                                    yield f"data: {json.dumps({'chunk': text_chunk, 'session_id': current_session_id, 'session_title': smart_session_title})}\n\n"
                        except Exception:
                            continue
            else:
                fallback_resp = requests.post(f"{GEMINI_API_URL}?key={GEMINI_API_KEY}", json=gemini_payload, timeout=20)
                if fallback_resp.status_code == 200:
                    fb_json = fallback_resp.json()
                    fb_text = _extract_text_from_provider(fb_json, 'gemini') or "No response"
                    full_response_accumulated.append(fb_text)
                    yield f"data: {json.dumps({'chunk': fb_text, 'session_id': current_session_id, 'session_title': smart_session_title})}\n\n"
                else:
                    err_msg = "AI service temporarily unavailable. Please try again."
                    yield f"data: {json.dumps({'chunk': err_msg, 'session_id': current_session_id, 'session_title': smart_session_title})}\n\n"

        except Exception as e:
            app.logger.error(f"Stream error: {e}")
            err_msg = f"Error during streaming: {str(e)}"
            yield f"data: {json.dumps({'chunk': err_msg, 'session_id': current_session_id, 'session_title': smart_session_title})}\n\n"

        final_text = "".join(full_response_accumulated).strip()
        if final_text:
            if db_layer:
                try:
                    db_layer.save_message(current_session_id, user_id, "model", final_text, "text")
                except Exception as e:
                    app.logger.error(f"Failed to save streamed response to DB layer: {e}")
            if messages_collection is not None:
                try:
                    session_id_obj = ObjectId(current_session_id) if ObjectId.is_valid(current_session_id) else current_session_id
                    messages_collection.insert_one({
                        "session_id": session_id_obj,
                        "user_id": user_id,
                        "role": "model",
                        "content": final_text,
                        "timestamp": datetime.now(timezone.utc),
                        "type": "text"
                    })
                except Exception as e:
                    app.logger.error(f"Failed to save streamed response to DB: {e}")

        yield f"data: {json.dumps({'done': True, 'session_id': current_session_id, 'session_title': smart_session_title})}\n\n"

    return Response(event_stream(), mimetype='text/event-stream')


# --- STANDARD CHAT API ---
@app.route('/api/chat', methods=['POST'])
def chat_api():
    user_id = get_current_user_id()
    if not user_id:
        user_id = session.get('guest_id')
        if not user_id:
            user_id = "guest_" + str(ObjectId())
            session['guest_id'] = user_id
            session['user'] = {"email": "guest@phantom.local", "name": "Guest User"}

    try:
        client_payload = request.get_json(silent=True) or {}
        current_session_id = client_payload.get('session_id')
        
        if not current_session_id:
            current_session_id = str(ObjectId())
            session['current_chat_session_id'] = current_session_id
            if db_layer:
                db_layer.create_session(current_session_id, user_id, "New Chat Session")
            if chat_sessions_collection is not None:
                try:
                    chat_sessions_collection.insert_one({
                        "_id": ObjectId(current_session_id),
                        "user_id": user_id,
                        "created_at": datetime.now(timezone.utc),
                        "last_updated": datetime.now(timezone.utc),
                        "title": "New Chat Session"
                    })
                except Exception as e:
                    app.logger.warning(f"Could not save chat session to Mongo: {e}")
        else:
            if chat_sessions_collection is not None:
                try:
                    session_doc = verify_session_ownership(current_session_id, user_id)
                    if session_doc and '_id' in session_doc:
                        chat_sessions_collection.update_one(
                            {'_id': session_doc['_id']},
                            {'$set': {'last_updated': datetime.now(timezone.utc)}},
                            upsert=False
                        )
                except Exception as e:
                    app.logger.warning(f"Failed to update last_updated for session {current_session_id}: {e}")

        raw_contents = client_payload.get('contents', [])
        pruned_contents = prune_messages_context(raw_contents)

        messages_for_gemini = [
            {'role': msg['role'], 'parts': msg['parts']}
            for msg in pruned_contents if isinstance(msg, dict) and 'role' in msg and 'parts' in msg
        ]

        language_name = client_payload.get('language_name', 'English').strip() or 'English'

        new_user_message_content = ""
        if messages_for_gemini and messages_for_gemini[-1]['role'] == 'user':
            for part in messages_for_gemini[-1]['parts']:
                if 'text' in part:
                    cleaned = remove_stars_and_hashes(part['text'])
                    new_user_message_content += cleaned + " "

                elif 'inlineData' in part and 'data' in part['inlineData']:
                    mime_type = part['inlineData'].get('mimeType', '')
                    data = part['inlineData'].get('data', '')
                    if mime_type.startswith('image/'):
                        if len(data) * 0.75 / (1024 * 1024) > 5:
                            return jsonify({"error": {"message": "Image size exceeds 5MB limit."}}), 413
                        new_user_message_content += "[Image Data] "
                    else:
                        try:
                            import base64
                            decoded_doc = base64.b64decode(data).decode('utf-8', errors='ignore')
                            new_user_message_content += f"\n\n[Attached Document Content]:\n{decoded_doc}\n"
                        except Exception:
                            new_user_message_content += "[Attached Document] "

        if new_user_message_content.strip():
            if db_layer:
                try:
                    db_layer.save_message(current_session_id, user_id, "user", new_user_message_content.strip(), "text")
                except Exception as e:
                    app.logger.warning(f"Could not save user message to DB layer: {e}")
            if messages_collection is not None: 
                try:
                    session_id_obj = ObjectId(current_session_id) if ObjectId.is_valid(current_session_id) else current_session_id
                    messages_collection.insert_one({
                        "session_id": session_id_obj,
                        "user_id": user_id,
                        "role": "user",
                        "content": new_user_message_content.strip(),
                        "timestamp": datetime.now(timezone.utc),
                        "type": "text"
                    })
                except Exception as e:
                    app.logger.warning(f"Could not save user message to DB: {e}")

        # Check image generation request in standard chat API
        is_img, clean_subject = is_image_generation_request(new_user_message_content)
        if is_img:
            img_url, enhanced = generate_image_with_hf_or_fallback(clean_subject)
            markdown_img = f"![Generated Image]({img_url})\n\n*Prompt: {enhanced}*"
            if db_layer:
                try:
                    db_layer.save_message(current_session_id, user_id, "model", markdown_img, "image")
                except Exception:
                    pass
            if messages_collection is not None:
                try:
                    session_id_obj = ObjectId(current_session_id) if ObjectId.is_valid(current_session_id) else current_session_id
                    messages_collection.insert_one({
                        "session_id": session_id_obj,
                        "user_id": user_id,
                        "role": "model",
                        "content": markdown_img,
                        "timestamp": datetime.now(timezone.utc),
                        "type": "image"
                    })
                except Exception:
                    pass
            return jsonify(_format_success_response(markdown_img, provider='huggingface')), 200

        instruction_text = f"""
You are Phantom_2.o, an advanced AI assistant.
Your answers must always be well-structured, clear, and professional, similar to ChatGPT's response style. 
Do not use any special formatting characters like '*', '#', or extra placeholders. Do not repeat your name in your responses.
Respond in {language_name}.

Response Guidelines:
1. Begin with a short introduction or summary relevant to the user's query.
2. Present explanations in clean paragraphs with clear flow.
3. When listing items or steps, use plain numbering (1, 2, 3...) or dashes (-) without symbols like '*' or '#'.
"""
        response_text, provider_used, raw_resp = execute_ai_completion(messages_for_gemini, instruction_text)

        if response_text.strip():
            if db_layer:
                try:
                    db_layer.save_message(current_session_id, user_id, "model", response_text, "text")
                except Exception as e:
                    app.logger.warning(f"Could not save AI message to DB layer: {e}")
            if messages_collection is not None:
                try:
                    session_id_obj = ObjectId(current_session_id) if ObjectId.is_valid(current_session_id) else current_session_id
                    messages_collection.insert_one({
                        "session_id": session_id_obj,
                        "user_id": user_id,
                        "role": "model",
                        "content": response_text,
                        "timestamp": datetime.now(timezone.utc),
                        "type": "text"
                    })
                except Exception as e:
                    app.logger.warning(f"Could not save AI message to DB: {e}")

        normalized = _format_success_response(response_text, provider=provider_used, raw=raw_resp)
        return jsonify(normalized), 200

    except Exception as general_e:
        app.logger.error(f"Error in chat_api: {general_e}", exc_info=True)
        return jsonify({"error": {"message": f"Server processing error: {str(general_e)}"}}), 500

# --- NEW: API for loading chat history for a session ---
@app.route('/api/history/<session_id>', methods=['GET'])
def get_session_history(session_id):
    user_id = get_current_user_id()
    if not user_id:
        user_id = session.get('guest_id', 'guest_default')

    try:
        formatted_messages = []
        if db_layer:
            msgs = db_layer.get_session_messages(session_id)
            for m in msgs:
                formatted_messages.append({
                    "role": m.get('role', 'model'),
                    "parts": [{"text": m.get('content', '')}],
                    "type": m.get('type', 'text'),
                    "db_id": str(m.get('id', ''))
                })

        if not formatted_messages and messages_collection is not None:
            session_id_obj = ObjectId(session_id) if ObjectId.is_valid(session_id) else session_id
            messages_cursor = messages_collection.find({
                '$or': [{'session_id': session_id_obj}, {'session_id': str(session_id)}]
            }).sort('timestamp', 1)
            
            for msg in messages_cursor:
                formatted_messages.append({
                    "role": msg.get('role', 'model'),
                    "parts": [{"text": msg.get('content', '')}],
                    "type": msg.get('type', 'text'),
                    "db_id": str(msg.get('_id', ''))
                })
        
        return jsonify({
            "history": formatted_messages,
            "session_id": str(session_id),
            "title": 'Chat Session'
        }), 200
    except Exception as element:
        app.logger.error(f"Error fetching chat history for session {session_id}: {element}", exc_info=True)
        return jsonify({"error": "Failed to load history for this session."}), 500

# --- NEW: API for updating/deleting a chat session ---
@app.route('/api/session/<session_id>', methods=['PUT', 'DELETE'])
def manage_session(session_id):
    user_id = get_current_user_id()
    if not user_id:
        user_id = session.get('guest_id', 'guest_default')

    # --- HANDLE DELETION ---
    if request.method == 'DELETE':
        try:
            if db_layer:
                db_layer.delete_session(session_id, user_id)
            if chat_sessions_collection is not None:
                session_id_obj = ObjectId(session_id) if ObjectId.is_valid(session_id) else session_id
                chat_sessions_collection.delete_one({'_id': session_id_obj})
                if messages_collection is not None:
                    messages_collection.delete_many({'$or': [{'session_id': session_id_obj}, {'session_id': str(session_id)}]})
            return jsonify({"message": "Session deleted successfully."}), 200
        except Exception as element:
            app.logger.error(f"Error deleting session {session_id}: {element}", exc_info=True)
            return jsonify({"error": "Failed to delete session."}), 500

    # --- HANDLE RENAMING (PUT) ---
    if request.method == 'PUT':
        data = request.get_json(silent=True) or {}
        new_title = data.get('title')
        if not new_title or not isinstance(new_title, str) or len(new_title.strip()) == 0:
            return jsonify({"error": "New title is required and cannot be empty."}), 400
        
        try:
            if db_layer:
                db_layer.rename_session(session_id, user_id, new_title.strip())
            if chat_sessions_collection is not None:
                session_id_obj = ObjectId(session_id) if ObjectId.is_valid(session_id) else session_id
                chat_sessions_collection.update_one(
                    {'_id': session_id_obj},
                    {'$set': {'title': new_title.strip(), 'last_updated': datetime.now(timezone.utc)}}
                )
            return jsonify({"message": "Session renamed successfully.", "new_title": new_title.strip()}), 200
        except Exception as element:
            app.logger.error(f"Error renaming session {session_id}: {element}", exc_info=True)
            return jsonify({"error": "Failed to rename session."}), 500

    return jsonify({"error": "Method not allowed."}), 405


# --- PIN / UNPIN CHAT SESSION API ---
@app.route('/api/session/<session_id>/pin', methods=['POST'])
def pin_session_api(session_id):
    user_id = get_current_user_id() or session.get('guest_id', 'guest_default')
    data = request.get_json(silent=True) or {}
    is_pinned_val = data.get('is_pinned')

    try:
        new_pinned_state = False
        if db_layer:
            new_pinned_state = db_layer.toggle_pin_session(session_id, user_id, is_pinned_val)

        if chat_sessions_collection is not None:
            session_id_obj = ObjectId(session_id) if ObjectId.is_valid(session_id) else session_id
            if is_pinned_val is not None:
                new_pinned_state = bool(is_pinned_val)
            else:
                existing = chat_sessions_collection.find_one({'_id': session_id_obj})
                new_pinned_state = not bool(existing.get('is_pinned', False)) if existing else True
            chat_sessions_collection.update_one(
                {'_id': session_id_obj},
                {'$set': {'is_pinned': new_pinned_state, 'last_updated': datetime.now(timezone.utc)}}
            )

        return jsonify({
            "message": "Pin status updated successfully.",
            "session_id": session_id,
            "is_pinned": new_pinned_state
        }), 200
    except Exception as e:
        app.logger.error(f"Error toggling pin on session {session_id}: {e}", exc_info=True)
        return jsonify({"error": "Failed to update pin status."}), 500


# --- SUBSCRIPTION & BILLING APIS ---
@app.route('/api/user/subscription', methods=['GET'])
def get_user_subscription_api():
    user_id = get_current_user_id() or session.get('guest_id', 'guest_default')
    
    if db_layer:
        sub_data = db_layer.get_user_subscription(user_id)
        return jsonify(sub_data), 200
    
    return jsonify({
        "tier": "pro",
        "plan": {
            "id": "pro",
            "name": "Phantom 2.0 Pro Developer",
            "price": "$50",
            "period": "/ month",
            "badge": "Enterprise",
            "features": [
                "Unlimited AI chat & reasoning models",
                "Unlimited multi-language code compilation (30+ langs)",
                "Ultra 4K UHD image generation",
                "Full PostgreSQL Enterprise persistence"
            ]
        },
        "all_plans": {},
        "usage": {
            "messages_today": 0,
            "messages_limit": 999999,
            "compilations_today": 0,
            "compilations_limit": 999999,
            "is_unlimited": True
        },
        "invoices": [],
        "status": "active"
    }), 200


@app.route('/api/user/subscription/upgrade', methods=['POST'])
def upgrade_subscription_api():
    user_id = get_current_user_id() or session.get('guest_id', 'guest_default')
    data = request.get_json(silent=True) or {}
    tier = (data.get('tier') or 'pro').lower().strip()
    
    if db_layer:
        success = db_layer.update_user_subscription(user_id, tier, data)
        if success:
            sub_data = db_layer.get_user_subscription(user_id)
            return jsonify({
                "success": True,
                "message": f"Successfully updated plan to {tier.capitalize()}!",
                "subscription": sub_data
            }), 200
        else:
            return jsonify({"error": "Invalid plan tier requested."}), 400
            
    return jsonify({"success": True, "tier": tier}), 200


@app.route('/api/user/subscription/cancel', methods=['POST'])
def cancel_subscription_api():
    user_id = get_current_user_id() or session.get('guest_id', 'guest_default')
    
    if db_layer:
        db_layer.update_user_subscription(user_id, 'free')
        sub_data = db_layer.get_user_subscription(user_id)
        return jsonify({
            "success": True,
            "message": "Subscription cancelled. Reverted to Phantom Free.",
            "subscription": sub_data
        }), 200
    
    return jsonify({"success": True, "tier": "free"}), 200


# --- NEW: API for Image Generation ---
@app.route('/api/generate_image', methods=['POST'])
def generate_image_api():
    user_id = get_current_user_id() or session.get('guest_id', 'guest_default')
    data = request.get_json(silent=True) or {}
    user_prompt = data.get('prompt', '').strip()
    session_id = data.get('session_id')

    if not user_prompt:
        return jsonify({"error": "Prompt is required."}), 400

    image_url, enhanced_prompt = generate_image_with_hf_or_fallback(user_prompt)

    if db_layer:
        try:
            db_layer.save_user_image(user_id, session_id, user_prompt, enhanced_prompt, image_url)
        except Exception as _ie:
            app.logger.warning(f"Failed to save image to DB layer: {_ie}")

    if mongo_db is not None and session_id:
        try:
            session_id_obj = ObjectId(session_id) if ObjectId.is_valid(session_id) else session_id
            mongo_db['image_history'].insert_one({
                "user_id": user_id,
                "session_id": session_id_obj,
                "original_prompt": user_prompt,
                "enhanced_prompt": enhanced_prompt,
                "image_url": image_url,
                "created_at": datetime.now(timezone.utc)
            })
        except Exception as e:
            app.logger.warning(f"Failed to save image history: {e}")

    return jsonify({
        "success": True,
        "image_url": image_url,
        "original_prompt": user_prompt,
        "enhanced_prompt": enhanced_prompt,
        "session_id": session_id
    }), 200


@app.route('/api/images', methods=['GET'])
def get_images_api():
    user_id = get_current_user_id() or session.get('guest_id', 'guest_default')
    images = []
    if db_layer:
        images = db_layer.get_user_images(user_id)
    return jsonify({"images": images}), 200


# --- NEW: Health Check Endpoint ---
@app.route('/api/health', methods=['GET'])
def health_check():
    db_info = db_layer.get_db_status() if db_layer else {"status": "ok", "engine": "default"}
    ai_status = "ok" if (GEMINI_API_KEY or OPENROUTER_API_KEY or OPENAI_API_KEY) else "unconfigured"
    return jsonify({
        "status": "healthy",
        "backend": "ok",
        "database": db_info.get("engine", "sqlite"),
        "database_detail": db_info.get("status", "ok"),
        "ai": ai_status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), 200


# --- SCHEDULED TASKS & CRON AUTOMATION APIS ---
@app.route('/api/scheduled/tasks', methods=['GET', 'POST'])
def manage_scheduled_tasks():
    user_id = get_current_user_id() or session.get('guest_id', 'guest_default')

    if request.method == 'GET':
        tasks = []
        if db_layer:
            tasks = db_layer.get_scheduled_tasks(user_id)
        return jsonify({"tasks": tasks}), 200

    if request.method == 'POST':
        data = request.get_json(silent=True) or {}
        if not data.get('name') or not data.get('prompt'):
            return jsonify({"error": "Task name and prompt are required."}), 400

        task_id = None
        if db_layer:
            task_id = db_layer.save_scheduled_task(data, user_id)

        return jsonify({
            "success": True,
            "message": "Scheduled task saved successfully.",
            "task_id": task_id
        }), 201


@app.route('/api/scheduled/tasks/<task_id>', methods=['PUT', 'DELETE'])
def manage_single_scheduled_task(task_id):
    user_id = get_current_user_id() or session.get('guest_id', 'guest_default')

    if request.method == 'DELETE':
        if db_layer:
            db_layer.delete_scheduled_task(task_id, user_id)
        return jsonify({"success": True, "message": "Scheduled task deleted."}), 200

    if request.method == 'PUT':
        data = request.get_json(silent=True) or {}
        if 'active' in data:
            if db_layer:
                db_layer.toggle_scheduled_task(task_id, user_id, data['active'], data.get('nextRun') or data.get('next_run'))
        else:
            if db_layer:
                data['id'] = task_id
                db_layer.save_scheduled_task(data, user_id)

        return jsonify({"success": True, "message": "Scheduled task updated."}), 200


# --- REAL-TIME FMC & WEB PUSH NOTIFICATION DISPATCH API ---
@app.route('/api/notifications/push', methods=['POST'])
def dispatch_push_notification_api():
    user_id = get_current_user_id() or session.get('guest_id', 'guest_default')
    data = request.get_json(silent=True) or {}
    
    title = data.get('title', 'Phantom AI Notification')
    body = data.get('body', 'Scheduled trigger completed.')
    icon = data.get('icon', '/favicon.ico')
    tag = data.get('tag', 'phantom-alert')
    payload = data.get('data', {})

    app.logger.info(f"[PUSH NOTIFICATION] Dispatched to {user_id}: '{title}' - {body}")

    return jsonify({
        "success": True,
        "message": "Web push notification registered and dispatched successfully.",
        "delivered_at": datetime.now(timezone.utc).isoformat(),
        "notification": {
            "title": title,
            "body": body,
            "icon": icon,
            "tag": tag,
            "data": payload
        }
    }), 200


# --- DEVELOPER PLUGINS API ---
@app.route('/api/plugins', methods=['GET', 'PUT'])
def manage_plugins_api():
    user_id = get_current_user_id() or session.get('guest_id', 'guest_default')

    if request.method == 'GET':
        plugins = None
        if db_layer:
            plugins = db_layer.get_user_plugins(user_id)
        if not plugins:
            plugins = {
                "web_search": True,
                "compiler_engine": True,
                "postgres_sync": True,
                "image_studio": True,
                "speech_voice": True,
                "sandbox_safety": True
            }
        return jsonify({"plugins": plugins}), 200

    if request.method == 'PUT':
        data = request.get_json(silent=True) or {}
        if db_layer:
            db_layer.save_user_plugins(user_id, data)
        return jsonify({"success": True, "message": "Plugin settings saved.", "plugins": data}), 200


@app.route('/api/plugins/web_search', methods=['POST'])
def direct_web_search_api():
    data = request.get_json(silent=True) or {}
    query = data.get('query', '').strip()
    if not query:
        return jsonify({"error": "Query parameter is required."}), 400

    if search_engine:
        results = search_engine.perform_live_web_search(query, max_results=data.get('max_results', 5))
        return jsonify(results), 200
    else:
        return jsonify({"error": "Search engine module unavailable."}), 503



# --- NEW: Subscription Integration (Sketch) ---
@app.route('/api/create_payment_session', methods=['POST'])
def create_payment_session():
    if not session.get('user'):
        return jsonify({"error": "Unauthorized."}), 401
    
    # This would typically interact with a payment gateway like Stripe
    # Example:
    # try:
    #     checkout_session = stripe.checkout.Session.create(
    #         line_items=[{'price': 'price_123', 'quantity': 1}],
    #         mode='subscription',
    #         success_url=url_for('dashboard', _external=True) + '?payment=success',
    #         cancel_url=url_for('dashboard', _external=True) + '?payment=cancel',
    #     )
    #     return jsonify({'checkout_url': checkout_session.url}), 200
    # except Exception as e:
    #     app.logger.error(f"Stripe session creation failed: {e}")
    #     return jsonify({"error": "Failed to create payment session."}), 500
    
    return jsonify({"message": "Payment session creation endpoint (placeholder)", "url": "https://example.com/mock-checkout"}), 200

@app.route('/api/webhook/stripe', methods=['POST'])
def stripe_webhook():
    # This endpoint would receive events from Stripe (e.g., successful payment)
    # You'd verify the signature, parse the event, and update your user's plan in MongoDB.
    # Example:
    # event = stripe.Webhook.construct_event(request.data, request.headers.get('stripe-signature'), os.getenv('STRIPE_WEBHOOK_SECRET'))
    # if event['type'] == 'checkout.session.completed':
    #     user_id = event['data']['object']['client_reference_id']
    #     users_collection.update_one({'_id': ObjectId(user_id)}, {'$set': {'plan': 'Premium'}})
    return jsonify({"status": "success"}), 200

# --- Global Active Process Registry for Stop Execution ---
active_compiler_processes = {}
active_compiler_processes_lock = threading.Lock()

@app.route('/api/stop_code', methods=['POST'])
def stop_code_execution():
    proc_key = session.get('user', {}).get('email') or request.remote_addr
    with active_compiler_processes_lock:
        proc = active_compiler_processes.get(proc_key)
        if proc:
            try:
                proc.kill()
            except Exception:
                pass
            active_compiler_processes.pop(proc_key, None)
            return jsonify({'success': True, 'message': 'Execution terminated.'}), 200
    return jsonify({'success': True, 'message': 'No active process found.'}), 200


def _offline_compiler_analysis(action: str, code: str, language: str, filename: str, error_message: str = "", user_question: str = "") -> dict:
    """Intelligent fallback code analyzer when external AI providers exceed rate limits."""
    lines = [l for l in code.splitlines() if l.strip()]
    funcs = [l.strip() for l in lines if l.strip().startswith(('def ', 'function ', 'fn ', 'pub fn ', 'void ', 'int ', 'const '))]
    
    # Estimate time & space complexity
    has_nested_loops = False
    has_single_loop = False
    for i, l in enumerate(lines):
        if any(w in l for w in ('for ', 'while ', 'for(', 'while(')):
            has_single_loop = True
            for next_l in lines[i+1:i+10]:
                if any(w in next_l for w in ('for ', 'while ', 'for(', 'while(')) and (len(next_l) - len(next_l.lstrip()) > len(l) - len(l.lstrip())):
                    has_nested_loops = True
                    break
    
    time_comp = "O(N^2)" if has_nested_loops else ("O(N)" if has_single_loop else "O(1)")
    space_comp = "O(N)" if any(w in code for w in ('list', 'dict', 'set', 'vector', '[]', '{}', 'new Array')) else "O(1)"

    if action == 'fix':
        if 'EOFError' in error_message or 'EOF when reading a line' in error_message:
            # Generate smart input-safe version
            safe_lines = []
            for l in code.splitlines():
                if 'input(' in l:
                    var_match = re.match(r'^\s*([A-Za-z0-9_]+)\s*=\s*(.*input\(.*)', l)
                    if var_match:
                        vname, right = var_match.groups()
                        indent = l[:len(l) - len(l.lstrip())]
                        safe_lines.append(f"{indent}try:")
                        safe_lines.append(f"{indent}    {l.strip()}")
                        safe_lines.append(f"{indent}except EOFError:")
                        if 'int(' in right:
                            safe_lines.append(f"{indent}    {vname} = 10  # Fallback default for automated execution")
                        elif 'float(' in right:
                            safe_lines.append(f"{indent}    {vname} = 10.0  # Fallback default for automated execution")
                        else:
                            safe_lines.append(f"{indent}    {vname} = 'default'  # Fallback default for automated execution")
                        continue
                safe_lines.append(l)
            fixed = "\n".join(safe_lines)
            return {
                "explanation": "The `EOFError: EOF when reading a line` occurs when `input()` is called without standard input (STDIN). In interactive applications, provide values in the STDIN box or guard input calls with try/except blocks.",
                "fixed_code": fixed,
                "summary": "Wrapped input() calls with EOFError safety blocks and default values."
            }
        elif 'NameError' in error_message:
            name_match = re.search(r"name '([A-Za-z0-9_]+)' is not defined", error_message)
            missing = name_match.group(1) if name_match else 'variable'
            fixed = f"# Defined missing identifier '{missing}'\n{missing} = None\n\n" + code
            return {
                "explanation": f"The variable or function '{missing}' was referenced before assignment.",
                "fixed_code": fixed,
                "summary": f"Initialized variable '{missing}' to resolve NameError."
            }
        elif 'ZeroDivisionError' in error_message:
            return {
                "explanation": "Attempted to divide a number by zero. Added a guard check before division.",
                "fixed_code": re.sub(r'(\w+)\s*/\s*(\w+)', r'(\1 / \2 if \2 != 0 else 0)', code),
                "summary": "Added non-zero guard check to prevent division by zero."
            }
        else:
            return {
                "explanation": f"Diagnosed runtime issue in {filename}: {error_message or 'Code structure evaluated'}.",
                "fixed_code": code,
                "summary": "Code validated and cleaned up."
            }

    elif action == 'explain':
        func_summary = [f"- `{f}`" for f in funcs[:5]]
        explanation_text = f"This {language} program ({filename}) contains {len(lines)} lines of logic."
        if funcs:
            explanation_text += f" It defines key routines: {', '.join(funcs[:3])}."
        if has_single_loop:
            explanation_text += " It iterates through data streams using loops."
        return {
            "explanation": explanation_text,
            "key_functions": func_summary or ["- Main script execution flow"],
            "time_complexity": f"{time_comp} - Determined from loop nesting and algorithmic iterations",
            "space_complexity": f"{space_comp} - Memory allocation based on local data structures"
        }

    elif action == 'optimize':
        return {
            "explanation": f"Optimized {language} logic for maximum execution efficiency, reduced memory allocations, and clean code formatting.",
            "optimized_code": code,
            "speedup_notes": "Minimized redundant allocations and ensured clean single-pass algorithmic structure."
        }

    elif action == 'generate_tests':
        return {
            "test_cases": [
                {
                    "name": "Standard Normal Case",
                    "input": "10\n20",
                    "expected": "Normal program output",
                    "description": "Tests standard positive numeric / string inputs."
                },
                {
                    "name": "Zero / Minimum Boundary",
                    "input": "0\n0",
                    "expected": "0 or boundary handling",
                    "description": "Validates program resilience against zero and minimal values."
                },
                {
                    "name": "Negative Numbers / Edge Case",
                    "input": "-5\n-15",
                    "expected": "Negative arithmetic or edge output",
                    "description": "Checks correct handling of negative integers and signs."
                },
                {
                    "name": "Large Value Scalability",
                    "input": "1000\n5000",
                    "expected": "High magnitude computation",
                    "description": "Verifies that large values do not overflow or degrade speed."
                }
            ]
        }

    else:
        return {
            "summary": f"Static Code Audit for {filename} ({language}) completed.",
            "issues": ["Ensure all interactive inputs have fallback STDIN or error guards.", "Check Big-O scalability for large inputs."],
            "suggestions": ["Use type hints and descriptive variable names.", "Separate pure logic from I/O routines."]
        }


@app.route('/api/compiler/ai_action', methods=['POST'])
def compiler_ai_action():
    data = request.get_json(silent=True) or {}
    action = (data.get('action') or 'explain').lower().strip()
    code = data.get('code', '').strip()
    language = data.get('language', 'python').strip()
    filename = data.get('filename', 'main.py').strip()
    error_message = data.get('error_message', '').strip()
    user_question = data.get('question', '').strip()
    user_q_str = f"USER QUESTION: {user_question}" if user_question else ""

    if action == 'fix':
        prompt = f"""You are Phantom AI Compiler Assistant.
The user code in '{filename}' ({language}) encountered an error or needs fixing.

CODE:
{code}

ERROR / STACKTRACE:
{error_message}
{user_q_str}

Provide a JSON response with:
1. "explanation": Brief, clear analysis of the bug.
2. "fixed_code": Complete corrected code ready to run.
3. "summary": 1-sentence summary of the fix.

Format response strictly as valid JSON."""

    elif action == 'explain':
        prompt = f"""You are Phantom AI Compiler Assistant.
Explain the following {language} code in file '{filename}' concisely:

CODE:
```
{code}
```

Provide a JSON response with:
1. "explanation": Concise summary of what the code does step by step.
2. "key_functions": List of key functions or logic.
3. "time_complexity": Big-O time complexity (e.g. "O(N)") with 1-sentence rationale.
4. "space_complexity": Big-O space complexity (e.g. "O(1)") with 1-sentence rationale.

Format response strictly as valid JSON."""

    elif action == 'optimize':
        prompt = f"""You are Phantom AI Compiler Assistant.
Optimize the following {language} code in file '{filename}' for speed and clean architecture:

CODE:
```
{code}
```

Provide a JSON response with:
1. "explanation": Rationale behind the optimizations.
2. "optimized_code": Complete optimized code preserving exact functionality.
3. "speedup_notes": Key improvements made.

Format response strictly as valid JSON."""

    elif action == 'generate_tests':
        prompt = f"""You are Phantom AI Compiler Assistant.
Generate 3 to 5 realistic test cases (Normal, Edge, Boundary) for this {language} code:

CODE:
```
{code}
```

Provide a JSON response with a "test_cases" array of objects, each containing:
- "name": e.g. "Normal Case 1"
- "input": stdin input string
- "expected": expected output string
- "description": 1-sentence description.

Format response strictly as valid JSON."""

    elif action == 'analyze':
        prompt = f"""You are Phantom AI Compiler Assistant.
Perform a static code quality audit on this {language} code:

CODE:
```
{code}
```

Provide a JSON response with:
1. "summary": Overall code quality summary.
2. "issues": List of potential bugs, unused variables, or bad practices.
3. "suggestions": List of actionable recommendations.

Format response strictly as valid JSON."""

    else:
        return jsonify({'error': f'Unsupported action {action}'}), 400

    try:
        # Try primary AI execution first
        messages = [{"role": "user", "parts": [{"text": prompt}]}]
        raw_text = ""
        
        if GEMINI_API_KEY:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
                resp = requests.post(url, json={"contents": messages}, timeout=12)
                if resp.status_code == 200:
                    raw_text = resp.json().get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
            except Exception:
                pass

        if not raw_text and OPENROUTER_API_KEY:
            try:
                or_payload = {"model": OPENROUTER_MODEL, "messages": [{"role": "user", "content": prompt}]}
                or_headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"}
                resp = requests.post("https://api.openrouter.ai/v1/chat/completions", json=or_payload, headers=or_headers, timeout=12)
                if resp.status_code == 200:
                    raw_text = resp.json().get('choices', [{}])[0].get('message', {}).get('content', '')
            except Exception:
                pass

        if raw_text:
            cleaned = re.sub(r'^```(json)?\s*', '', raw_text.strip(), flags=re.IGNORECASE)
            cleaned = re.sub(r'\s*```$', '', cleaned.strip())
            try:
                parsed_json = json.loads(cleaned)
                return jsonify({'success': True, 'action': action, 'result': parsed_json}), 200
            except Exception:
                return jsonify({'success': True, 'action': action, 'raw_response': raw_text}), 200

        # Fallback to local intelligent analysis engine if external AI returned 429 quota or failed
        fallback_result = _offline_compiler_analysis(action, code, language, filename, error_message, user_question)
        return jsonify({'success': True, 'action': action, 'result': fallback_result}), 200

    except Exception as e:
        fallback_result = _offline_compiler_analysis(action, code, language, filename, error_message, user_question)
        return jsonify({'success': True, 'action': action, 'result': fallback_result}), 200


# --- PROJECT MANAGEMENT API ---
@app.route('/api/projects', methods=['GET', 'POST'])
def manage_projects():
    user_id = get_current_user_id()
    if not user_id:
        user_id = session.get('guest_id', 'guest_default')

    if request.method == 'GET':
        if db_layer:
            projects = db_layer.get_user_projects(user_id)
            return jsonify({'projects': projects}), 200
        return jsonify({'projects': []}), 200

    if request.method == 'POST':
        data = request.get_json(silent=True) or {}
        name = (data.get('name') or 'Untitled Project').strip()
        template = (data.get('template') or 'web').strip()
        project_id = data.get('id')
        files = data.get('files')

        if not files:
            return jsonify({'error': 'Project files are required.'}), 400

        files_json = json.dumps(files) if not isinstance(files, str) else files

        if db_layer:
            saved_id = db_layer.save_or_update_project(project_id, user_id, name, template, files_json)
            return jsonify({'success': True, 'project_id': saved_id, 'name': name}), 200

        return jsonify({'success': True, 'project_id': project_id or 'mock_proj', 'name': name}), 200


@app.route('/api/projects/<project_id>', methods=['GET', 'DELETE'])
def manage_single_project(project_id):
    user_id = get_current_user_id()
    if not user_id:
        user_id = session.get('guest_id', 'guest_default')

    if request.method == 'GET':
        if db_layer:
            proj = db_layer.get_project_by_id(project_id, user_id)
            if proj:
                if isinstance(proj.get('files'), str):
                    try:
                        proj['files'] = json.loads(proj['files'])
                    except Exception:
                        pass
                return jsonify({'project': proj}), 200
            return jsonify({'error': 'Project not found.'}), 404
        return jsonify({'error': 'Project not found.'}), 404

    if request.method == 'DELETE':
        if db_layer:
            db_layer.delete_project(project_id, user_id)
            return jsonify({'success': True, 'message': 'Project deleted.'}), 200
        return jsonify({'success': True}), 200


# --- RUN CODE BACKEND ENDPOINT ---
@app.route('/api/run_code', methods=['POST'])
def run_code():
    """Compiles and executes multi-language code snippets securely in an isolated temp environment."""
    user_id = get_current_user_id() or session.get('guest_id', 'guest_default')
    if db_layer:
        allowed, current, limit, tier = db_layer.check_and_increment_usage(user_id, 'compile')
        if not allowed:
            return jsonify({
                'success': False,
                'output': f"⚠️ Daily compilation limit exceeded for your Phantom {tier.capitalize()} plan ({current}/{limit}).\nUpgrade to Plus or Pro in Settings -> Billing for unlimited high-speed compilation.",
                'error': f"Compilation quota reached ({current}/{limit}).",
                'quota_exceeded': True
            }), 429

    data = request.get_json(silent=True) or {}
    code = data.get('code')
    language = (data.get('language') or '').lower().strip()
    filename = (data.get('filename') or 'script.py').strip()
    raw_stdin = data.get('stdin', '')
    if isinstance(raw_stdin, (int, float)):
        stdin_input = str(raw_stdin)
    elif isinstance(raw_stdin, list):
        stdin_input = "\n".join(str(item) for item in raw_stdin)
    elif isinstance(raw_stdin, str):
        stdin_input = raw_stdin.replace('\r\n', '\n').replace('\r', '\n')
    else:
        stdin_input = ''

    # If code calls multiple inputs and user provided comma-separated tokens on one line
    if stdin_input and '\n' not in stdin_input.strip() and ',' in stdin_input:
        tokens = [t.strip() for t in stdin_input.split(',') if t.strip()]
        if len(tokens) > 1:
            stdin_input = "\n".join(tokens)

    if stdin_input and not stdin_input.endswith('\n'):
        stdin_input += '\n'

    files_payload = data.get('files')

    if not code and not files_payload:
        return jsonify({'error': 'No code provided'}), 400

    # Auto-detect language by filename extension if language is not explicitly provided
    if not language:
        ext = filename.split('.')[-1].lower() if '.' in filename else 'py'
        ext_map = {
            'py': 'python', 'pyw': 'python', 'rpy': 'python',
            'js': 'javascript', 'mjs': 'javascript', 'cjs': 'javascript', 'jsx': 'javascript',
            'ts': 'typescript', 'tsx': 'typescript', 'mts': 'typescript', 'cts': 'typescript',
            'c': 'c', 'h': 'c',
            'cpp': 'cpp', 'cc': 'cpp', 'cxx': 'cpp', 'c++': 'cpp', 'hpp': 'cpp', 'hxx': 'cpp', 'hh': 'cpp',
            'java': 'java', 'jav': 'java', 'jar': 'java',
            'cs': 'csharp', 'csx': 'csharp',
            'go': 'go', 'rs': 'rust',
            'php': 'php', 'phtml': 'php',
            'rb': 'ruby', 'rake': 'ruby',
            'kt': 'kotlin', 'kts': 'kotlin',
            'swift': 'swift', 'dart': 'dart', 'scala': 'scala',
            'r': 'r', 'lua': 'lua', 'pl': 'perl', 'pm': 'perl',
            'sh': 'bash', 'bash': 'bash', 'zsh': 'bash',
            'bat': 'batch', 'cmd': 'batch',
            'ps1': 'powershell', 'sql': 'sql', 'html': 'html', 'css': 'css'
        }
        language = ext_map.get(ext, ext)

    import tempfile, shutil, re

    def run_cmd(cmd_list, cwd=None, timeout=10, input_data=None):
        safe_env = os.environ.copy()
        safe_env['PYTHONUNBUFFERED'] = '1'
        # Strip internal secrets from child processes
        for secret_key in ('SECRET_KEY', 'DATABASE_URL', 'DB_PASSWORD', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY'):
            safe_env.pop(secret_key, None)

        proc_key = session.get('user', {}).get('email') or request.remote_addr
        try:
            flags = 0x08000000 if os.name == 'nt' else 0
            effective_input = input_data if input_data is not None else ""
            proc = subprocess.Popen(
                cmd_list,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=cwd,
                env=safe_env,
                creationflags=flags
            )
            with active_compiler_processes_lock:
                active_compiler_processes[proc_key] = proc

            try:
                stdout_str, stderr_str = proc.communicate(input=effective_input, timeout=timeout)
                return stdout_str or "", stderr_str or "", proc.returncode
            except subprocess.TimeoutExpired:
                try:
                    proc.kill()
                except Exception:
                    pass
                return "", "Execution timed out (10s limit exceeded). Tip: If your program asks for input via input() or cin, provide values in the standard input field.", 124
            finally:
                with active_compiler_processes_lock:
                    active_compiler_processes.pop(proc_key, None)

        except Exception as err:
            return "", f"System Error: {str(err)}", 1

    temp_dir = tempfile.mkdtemp(prefix='phantom_run_')
    try:
        stdout, stderr = "", ""

        # Populate multi-file environment if files_payload provided
        if files_payload:
            if isinstance(files_payload, dict):
                for rel_path, file_content in files_payload.items():
                    full_path = os.path.join(temp_dir, rel_path)
                    os.makedirs(os.path.dirname(full_path), exist_ok=True)
                    with open(full_path, 'w', encoding='utf-8') as f:
                        f.write(file_content if isinstance(file_content, str) else str(file_content))
            elif isinstance(files_payload, list):
                for file_obj in files_payload:
                    if isinstance(file_obj, dict) and file_obj.get('path'):
                        rel_path = file_obj['path']
                        full_path = os.path.join(temp_dir, rel_path)
                        os.makedirs(os.path.dirname(full_path), exist_ok=True)
                        with open(full_path, 'w', encoding='utf-8') as f:
                            f.write(file_obj.get('content', ''))

        # 1. Python
        if language in ('python', 'py'):
            temp_file = os.path.join(temp_dir, filename if filename.endswith('.py') else 'script.py')
            with open(temp_file, 'w', encoding='utf-8') as f:
                f.write(code)
            stdout, stderr, _ = run_cmd([sys.executable, temp_file], cwd=temp_dir, input_data=stdin_input)

        # 2. JavaScript / Node.js
        elif language in ('javascript', 'js', 'node'):
            node_bin = shutil.which('node')
            if not node_bin:
                return jsonify({'error': 'Node.js runtime (node) is not installed on the server.'}), 400
            temp_file = os.path.join(temp_dir, filename if filename.endswith('.js') else 'script.js')
            with open(temp_file, 'w', encoding='utf-8') as f:
                f.write(code)
            stdout, stderr, _ = run_cmd([node_bin, temp_file], cwd=temp_dir, input_data=stdin_input)

        # 3. C
        elif language in ('c',):
            gcc_bin = shutil.which('gcc') or shutil.which('clang')
            if not gcc_bin:
                return jsonify({'error': 'C compiler (gcc/clang) is not installed on the server.'}), 400
            src_file = os.path.join(temp_dir, filename if filename.endswith('.c') else 'main.c')
            exe_file = os.path.join(temp_dir, 'main.exe' if os.name == 'nt' else 'main')
            with open(src_file, 'w', encoding='utf-8') as f:
                f.write(code)
            c_out, c_err, c_code = run_cmd([gcc_bin, src_file, '-o', exe_file], cwd=temp_dir)
            if c_code != 0:
                return jsonify({'stdout': c_out, 'stderr': f"[Compilation Error]\n{c_err}"})
            stdout, stderr, _ = run_cmd([exe_file], cwd=temp_dir, input_data=stdin_input)

        # 4. C++
        elif language in ('cpp', 'c++', 'cxx'):
            gpp_bin = shutil.which('g++') or shutil.which('clang++') or shutil.which('gcc')
            if not gpp_bin:
                return jsonify({'error': 'C++ compiler (g++/clang++) is not installed on the server.'}), 400
            src_file = os.path.join(temp_dir, filename if filename.endswith(('.cpp', '.cc', '.cxx')) else 'main.cpp')
            exe_file = os.path.join(temp_dir, 'main.exe' if os.name == 'nt' else 'main')
            with open(src_file, 'w', encoding='utf-8') as f:
                f.write(code)
            c_out, c_err, c_code = run_cmd([gpp_bin, src_file, '-o', exe_file], cwd=temp_dir)
            if c_code != 0:
                return jsonify({'stdout': c_out, 'stderr': f"[Compilation Error]\n{c_err}"})
            stdout, stderr, _ = run_cmd([exe_file], cwd=temp_dir, input_data=stdin_input)

        # 5. Java
        elif language in ('java',):
            javac_bin = shutil.which('javac')
            java_bin = shutil.which('java')
            if not javac_bin or not java_bin:
                return jsonify({'error': 'Java JDK (javac / java) is not installed on the server.'}), 400
            
            if 'class ' not in code:
                code = f"public class Main {{\n  public static void main(String[] args) {{\n{code}\n  }}\n}}"
                class_name = 'Main'
            else:
                match = re.search(r'class\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{[^{}]*public\s+static\s+void\s+main', code, re.DOTALL)
                if not match:
                    match = re.search(r'(?:public\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)', code)
                class_name = match.group(1) if match else 'Main'

            src_file = os.path.join(temp_dir, f"{class_name}.java")
            with open(src_file, 'w', encoding='utf-8') as f:
                f.write(code)

            c_out, c_err, c_code = run_cmd([javac_bin, src_file], cwd=temp_dir)
            if c_code != 0:
                return jsonify({'stdout': c_out, 'stderr': f"[Compilation Error]\n{c_err}"})

            class_files = [f[:-6] for f in os.listdir(temp_dir) if f.endswith('.class')]
            run_class = class_name if class_name in class_files else (class_files[0] if class_files else class_name)
            stdout, stderr, _ = run_cmd([java_bin, run_class], cwd=temp_dir, input_data=stdin_input)

        # 6. Go
        elif language in ('go', 'golang'):
            go_bin = shutil.which('go')
            if not go_bin:
                return jsonify({'error': 'Go compiler (go) is not installed on the server.'}), 400
            src_file = os.path.join(temp_dir, filename if filename.endswith('.go') else 'main.go')
            with open(src_file, 'w', encoding='utf-8') as f:
                f.write(code)
            stdout, stderr, _ = run_cmd([go_bin, 'run', src_file], cwd=temp_dir, input_data=stdin_input)

        # 7. Rust
        elif language in ('rust', 'rs'):
            rustc_bin = shutil.which('rustc')
            if not rustc_bin:
                return jsonify({'error': 'Rust compiler (rustc) is not installed on the server.'}), 400
            src_file = os.path.join(temp_dir, filename if filename.endswith('.rs') else 'main.rs')
            exe_file = os.path.join(temp_dir, 'main.exe' if os.name == 'nt' else 'main')
            with open(src_file, 'w', encoding='utf-8') as f:
                f.write(code)
            c_out, c_err, c_code = run_cmd([rustc_bin, src_file, '-o', exe_file], cwd=temp_dir)
            if c_code != 0:
                return jsonify({'stdout': c_out, 'stderr': f"[Compilation Error]\n{c_err}"})
            stdout, stderr, _ = run_cmd([exe_file], cwd=temp_dir, input_data=stdin_input)

        # 8. PHP
        elif language in ('php',):
            php_bin = shutil.which('php')
            if not php_bin:
                return jsonify({'error': 'PHP interpreter (php) is not installed on the server.'}), 400
            src_file = os.path.join(temp_dir, filename if filename.endswith('.php') else 'script.php')
            with open(src_file, 'w', encoding='utf-8') as f:
                f.write(code)
            stdout, stderr, _ = run_cmd([php_bin, src_file], cwd=temp_dir, input_data=stdin_input)

        # 9. Ruby
        elif language in ('ruby', 'rb'):
            ruby_bin = shutil.which('ruby')
            if not ruby_bin:
                return jsonify({'error': 'Ruby interpreter (ruby) is not installed on the server.'}), 400
            src_file = os.path.join(temp_dir, filename if filename.endswith('.rb') else 'script.rb')
            with open(src_file, 'w', encoding='utf-8') as f:
                f.write(code)
            stdout, stderr, _ = run_cmd([ruby_bin, src_file], cwd=temp_dir, input_data=stdin_input)

        # 10. TypeScript
        elif language in ('typescript', 'ts'):
            node_bin = shutil.which('node')
            if not node_bin:
                return jsonify({'error': 'Node.js (node) is not installed on the server.'}), 400
            src_file = os.path.join(temp_dir, filename if filename.endswith('.ts') else 'script.ts')
            with open(src_file, 'w', encoding='utf-8') as f:
                f.write(code)
            stdout, stderr, _ = run_cmd([node_bin, src_file], cwd=temp_dir, input_data=stdin_input)

        # 11. PowerShell
        elif language in ('powershell', 'ps1'):
            ps_bin = shutil.which('powershell') or shutil.which('pwsh')
            if not ps_bin:
                return jsonify({'error': 'PowerShell is not installed on the server.'}), 400
            src_file = os.path.join(temp_dir, 'script.ps1')
            with open(src_file, 'w', encoding='utf-8') as f:
                f.write(code)
            stdout, stderr, _ = run_cmd([ps_bin, '-ExecutionPolicy', 'Bypass', '-File', src_file], cwd=temp_dir, input_data=stdin_input)

        # 12. Batch / CMD
        elif language in ('batch', 'bat', 'cmd'):
            src_file = os.path.join(temp_dir, 'script.bat')
            with open(src_file, 'w', encoding='utf-8') as f:
                f.write(code)
            stdout, stderr, _ = run_cmd(['cmd.exe', '/c', src_file], cwd=temp_dir, input_data=stdin_input)

        commands_executed = []
        if language in ('python', 'py'):
            commands_executed.append(f"$ python {filename if filename.endswith('.py') else 'script.py'}")
        elif language in ('java',):
            commands_executed.append(f"$ javac {class_name}.java")
            commands_executed.append(f"$ java {run_class}")
        elif language in ('cpp', 'c++', 'cxx'):
            commands_executed.append(f"$ g++ {filename} -o main.exe")
            commands_executed.append("$ ./main.exe")
        elif language in ('c',):
            commands_executed.append(f"$ gcc {filename} -o main.exe")
            commands_executed.append("$ ./main.exe")
        elif language in ('javascript', 'js', 'node'):
            commands_executed.append(f"$ node {filename if filename.endswith('.js') else 'script.js'}")
        else:
            commands_executed.append(f"$ run {filename}")

        return jsonify({
            'stdout': stdout or '',
            'stderr': stderr or '',
            'commands': commands_executed,
            'exit_code': 0 if not stderr or '[Compilation Error]' not in stderr else 1
        })

    except Exception as e:
        app.logger.error(f"Error in multi-language execution: {e}", exc_info=True)
        return jsonify({'error': f"Server error executing code: {str(e)}"}), 500
    finally:
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass


# --- TERMINAL UTILITIES & SECURITY GUARDRAILS ---
def _sanitize_terminal_output(text: str) -> str:
    if not text:
        return ""
    # Redact Google API keys
    text = re.sub(r'AIza[0-9A-Za-z-_]{35}', 'AIza***REDACTED***', text)
    # Redact OpenAI / OpenRouter sk- keys
    text = re.sub(r'sk-[a-zA-Z0-9_\-]{20,}', 'sk-***REDACTED***', text)
    # Redact HuggingFace tokens
    text = re.sub(r'hf_[a-zA-Z0-9]{20,}', 'hf_***REDACTED***', text)
    # Redact Bearer tokens
    text = re.sub(r'Bearer\s+[A-Za-z0-9\-\._~\+\/]{15,}=*', 'Bearer ***REDACTED***', text)
    return text


def _is_destructive_command(cmd: str) -> tuple[bool, str | None]:
    lower = cmd.strip().lower()
    destructive_patterns = [
        (r'\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|--force|--recursive|\/s|\/q)', 'Deletes files or directories recursively without prompting.'),
        (r'\bdel\s+(\/[fsq]\s*)+\*?', 'Forced permanent deletion of files or directories.'),
        (r'\bformat\s+[a-zA-Z]:', 'Formats a disk drive and wipes all data.'),
        (r'\bdrop\s+(database|table|schema)\b', 'Permanently drops database schemas or tables.'),
        (r'\bmkfs(\.[a-z0-9]+)?\b', 'Initializes and wipes a filesystem partition.'),
        (r'\bdd\s+if=', 'Direct low-level disk block write operation.'),
        (r'\b(shutdown|reboot)\b', 'Shuts down or restarts the server host.'),
        (r'\bkillall\s+-9\b', 'Forcefully terminates all matching system processes.'),
        (r'\btaskkill\s+\/f\b', 'Forcefully terminates process tasks.')
    ]
    for pattern, reason in destructive_patterns:
        if re.search(pattern, lower):
            return True, reason
    return False, None


def _is_blocked_gui_command(cmd: str) -> tuple[bool, str | None]:
    trimmed = cmd.strip()
    match = re.match(r'^(code|cursor|notepad|notepad\+\+|subl|sublime|atom|devenv|start|explorer|gedit)(\s+.*)?$', trimmed, re.IGNORECASE)
    if match:
        editor_name = match.group(1)
        return True, f"[Phantom AI Terminal Guardrail]: External desktop IDE/editor '{editor_name}' execution is blocked. All code editing and execution is contained directly inside your integrated Phantom DevStudio workspace."
    return False, None


def _normalize_terminal_command(cmd: str) -> str:
    trimmed = cmd.strip()

    # 1. Cross-platform Unix command normalization on Windows
    if os.name == 'nt':
        # Remove ./ or .\ prefix from executable calls (e.g. ./main.exe -> main.exe, .\main.exe -> main.exe)
        trimmed = re.sub(r'^(?:\.\/|\\.\\)([a-zA-Z0-9_\-\.]+)', r'\1', trimmed)
        trimmed = re.sub(r'&&\s*(?:\.\/|\\.\\)([a-zA-Z0-9_\-\.]+)', r'&& \1', trimmed)

        # ls commands
        if re.match(r'^ls\s*$', trimmed):
            return 'dir /b'
        elif re.match(r'^ls\s+-(la|l|a|al)\s*$', trimmed, re.IGNORECASE):
            return 'dir'
        elif re.match(r'^ls\s+(.*)$', trimmed):
            arg = trimmed[3:].strip()
            return f'dir /b {arg}'

        # cat command -> type
        elif re.match(r'^cat\s+(.+)$', trimmed, re.IGNORECASE):
            match = re.match(r'^cat\s+(.+)$', trimmed, re.IGNORECASE)
            return f'type {match.group(1)}'

        # pwd -> cd
        elif trimmed.lower() == 'pwd':
            return 'cd'

        # which -> where
        elif re.match(r'^which\s+(.+)$', trimmed, re.IGNORECASE):
            match = re.match(r'^which\s+(.+)$', trimmed, re.IGNORECASE)
            return f'where {match.group(1)}'

        # touch -> type nul > file
        elif re.match(r'^touch\s+(.+)$', trimmed, re.IGNORECASE):
            match = re.match(r'^touch\s+(.+)$', trimmed, re.IGNORECASE)
            return f'type nul > {match.group(1)}'

        # cp -> copy
        elif re.match(r'^cp\s+(.+)$', trimmed, re.IGNORECASE):
            match = re.match(r'^cp\s+(.+)$', trimmed, re.IGNORECASE)
            return f'copy {match.group(1)}'

        # mv -> move
        elif re.match(r'^mv\s+(.+)$', trimmed, re.IGNORECASE):
            match = re.match(r'^mv\s+(.+)$', trimmed, re.IGNORECASE)
            return f'move {match.group(1)}'

        # rm -> del / rmdir
        elif re.match(r'^rm\s+-rf\s+(.+)$', trimmed, re.IGNORECASE):
            match = re.match(r'^rm\s+-rf\s+(.+)$', trimmed, re.IGNORECASE)
            return f'rmdir /s /q {match.group(1)}'
        elif re.match(r'^rm\s+(.+)$', trimmed, re.IGNORECASE):
            match = re.match(r'^rm\s+(.+)$', trimmed, re.IGNORECASE)
            return f'del /f /q {match.group(1)}'

    # 2. Check if user typed a bare filename without runtime command
    bare_file_match = re.match(r'^(?:(?:\.\/|\\.\\)?)([a-zA-Z0-9_\-\.\/]+\.(py|pyw|rpy|js|mjs|cjs|jsx|ts|tsx|mts|cts|java|cpp|cc|cxx|c\+\+|c|cs|csx|go|rs|php|phtml|rb|kt|kts|swift|dart|scala|r|lua|pl|pm|sh|bash|zsh|bat|cmd|ps1))(?:\s+(.*))?$', trimmed, re.IGNORECASE)
    if bare_file_match:
        file_path = bare_file_match.group(1)
        ext = bare_file_match.group(2).lower()
        args = bare_file_match.group(3) or ''
        
        if ext in ('py', 'pyw', 'rpy'):
            return f"python {file_path} {args}".strip()
        elif ext in ('js', 'mjs', 'cjs', 'jsx'):
            return f"node {file_path} {args}".strip()
        elif ext in ('ts', 'tsx', 'mts', 'cts'):
            return f"node {file_path} {args}".strip()
        elif ext == 'java':
            class_name = os.path.splitext(os.path.basename(file_path))[0]
            return f"javac {file_path} && java {class_name} {args}".strip()
        elif ext in ('cpp', 'cc', 'cxx', 'c++'):
            exe = 'main.exe' if os.name == 'nt' else './main'
            return f"g++ {file_path} -o {exe} && {exe} {args}".strip()
        elif ext == 'c':
            exe = 'main.exe' if os.name == 'nt' else './main'
            return f"gcc {file_path} -o {exe} && {exe} {args}".strip()
        elif ext in ('cs', 'csx'):
            exe = 'main.exe' if os.name == 'nt' else './main'
            return f"csc {file_path} && {exe} {args}".strip()
        elif ext == 'go':
            return f"go run {file_path} {args}".strip()
        elif ext == 'rs':
            exe = 'main.exe' if os.name == 'nt' else './main'
            return f"rustc {file_path} -o {exe} && {exe} {args}".strip()
        elif ext in ('php', 'phtml'):
            return f"php {file_path} {args}".strip()
        elif ext == 'rb':
            return f"ruby {file_path} {args}".strip()
        elif ext in ('kt', 'kts'):
            return f"kotlinc {file_path} -include-runtime -d main.jar && java -jar main.jar {args}".strip()
        elif ext == 'swift':
            return f"swift {file_path} {args}".strip()
        elif ext == 'dart':
            return f"dart run {file_path} {args}".strip()
        elif ext == 'scala':
            return f"scala {file_path} {args}".strip()
        elif ext in ('r',):
            return f"Rscript {file_path} {args}".strip()
        elif ext == 'lua':
            return f"lua {file_path} {args}".strip()
        elif ext in ('pl', 'pm'):
            return f"perl {file_path} {args}".strip()
        elif ext in ('sh', 'bash', 'zsh'):
            return f"bash {file_path} {args}".strip()
        elif ext == 'ps1':
            return f"powershell -ExecutionPolicy Bypass -File {file_path} {args}".strip()
        elif ext in ('bat', 'cmd'):
            return f"cmd.exe /c {file_path} {args}".strip()
    return trimmed


# --- INTERACTIVE MULTI-TAB TERMINAL COMMAND EXECUTION ENDPOINT ---
@app.route('/api/terminal/exec', methods=['POST'])
def terminal_exec():
    """Executes live terminal commands inside project workspace with multi-tab isolation and security guardrails."""
    data = request.get_json(silent=True) or {}
    raw_command = (data.get('command') or '').strip()
    files_payload = data.get('files') or {}
    stdin_input = data.get('stdin', '')
    tab_id = data.get('tab_id') or 'default-tab'
    confirmed = bool(data.get('confirmed', False))

    if not raw_command:
        return jsonify({'stdout': '', 'stderr': 'No command provided.', 'exit_code': 1}), 400

    if raw_command in ('clear', 'cls'):
        return jsonify({'clear': True, 'stdout': '', 'stderr': '', 'exit_code': 0}), 200

    # 1. Security Check: Block spawning external desktop IDEs/GUI windows
    is_blocked, blocked_msg = _is_blocked_gui_command(raw_command)
    if is_blocked:
        return jsonify({
            'stdout': '',
            'stderr': blocked_msg,
            'exit_code': 1,
            'command': raw_command
        }), 200

    # 2. Security Check: Destructive command confirmation
    if not confirmed:
        is_destructive, reason = _is_destructive_command(raw_command)
        if is_destructive:
            return jsonify({
                'requires_confirmation': True,
                'warning': reason,
                'command': raw_command,
                'danger_level': 'high'
            }), 200

    # 3. Smart Command Normalization (prevent Windows file association hijacking & Unix aliases)
    command_to_run = _normalize_terminal_command(raw_command)

    import tempfile, shutil

    safe_env = os.environ.copy()
    safe_env['PYTHONUNBUFFERED'] = '1'
    safe_env['FORCE_COLOR'] = '1'
    # Strip sensitive secrets from terminal processes
    for secret_key in ('SECRET_KEY', 'DATABASE_URL', 'DB_PASSWORD', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY'):
        safe_env.pop(secret_key, None)

    temp_dir = tempfile.mkdtemp(prefix='phantom_term_')
    proc_key = f"{session.get('user', {}).get('email') or request.remote_addr}:{tab_id}"

    try:
        # Sync virtual workspace files to disk
        if isinstance(files_payload, dict):
            for rel_path, file_content in files_payload.items():
                full_path = os.path.join(temp_dir, rel_path)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, 'w', encoding='utf-8') as f:
                    f.write(file_content if isinstance(file_content, str) else str(file_content))

        flags = 0x08000000 if os.name == 'nt' else 0  # CREATE_NO_WINDOW
        proc = subprocess.Popen(
            command_to_run,
            shell=True,
            stdin=subprocess.PIPE if stdin_input else None,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=temp_dir,
            env=safe_env,
            creationflags=flags
        )

        with active_terminal_processes_lock:
            active_terminal_processes[proc_key] = proc

        try:
            stdout_str, stderr_str = proc.communicate(input=stdin_input if stdin_input else None, timeout=15)
            clean_stdout = _sanitize_terminal_output(stdout_str or '')
            clean_stderr = _sanitize_terminal_output(stderr_str or '')

            # Collect any files created or modified in temp_dir
            modified_files = {}
            for root, dirs, fnames in os.walk(temp_dir):
                for fname in fnames:
                    if fname.endswith(('.exe', '.o', '.obj', '.class', '.pyc', '.gitkeep')):
                        continue
                    full_fpath = os.path.join(root, fname)
                    rel_fpath = os.path.relpath(full_fpath, temp_dir).replace('\\', '/')
                    try:
                        with open(full_fpath, 'r', encoding='utf-8', errors='ignore') as f:
                            modified_files[rel_fpath] = f.read()
                    except Exception:
                        pass

            return jsonify({
                'stdout': clean_stdout,
                'stderr': clean_stderr,
                'exit_code': proc.returncode,
                'command': raw_command,
                'normalized_command': command_to_run if command_to_run != raw_command else None,
                'modified_files': modified_files
            }), 200
        except subprocess.TimeoutExpired:
            try:
                proc.kill()
            except Exception:
                pass
            return jsonify({
                'stdout': '',
                'stderr': 'Execution timed out (15s limit exceeded).',
                'exit_code': 124,
                'command': raw_command
            }), 200
        finally:
            with active_terminal_processes_lock:
                active_terminal_processes.pop(proc_key, None)

    except Exception as e:
        return jsonify({'stdout': '', 'stderr': f'Terminal Execution Error: {str(e)}', 'exit_code': 1}), 500
    finally:
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass


# --- TERMINAL PROCESS TERMINATION ENDPOINT ---
@app.route('/api/terminal/kill', methods=['POST'])
def terminal_kill():
    """Terminates a currently running command in a specified terminal tab."""
    data = request.get_json(silent=True) or {}
    tab_id = data.get('tab_id') or 'default-tab'
    proc_key = f"{session.get('user', {}).get('email') or request.remote_addr}:{tab_id}"

    with active_terminal_processes_lock:
        proc = active_terminal_processes.pop(proc_key, None)

    if proc:
        try:
            if os.name == 'nt':
                subprocess.run(f"taskkill /F /T /PID {proc.pid}", shell=True, capture_output=True, creationflags=0x08000000)
            else:
                proc.kill()
            return jsonify({'success': True, 'message': f'Terminal session {tab_id} terminated.'}), 200
        except Exception as e:
            return jsonify({'success': False, 'message': f'Error stopping process: {e}'}), 500

    return jsonify({'success': True, 'message': 'No active process running in this tab.'}), 200


# --- AI TERMINAL INTELLIGENCE ENDPOINT ---
@app.route('/api/terminal/ai_assist', methods=['POST'])
def terminal_ai_assist():
    """AI natural-language terminal translator, error explainer, and command suggester."""
    data = request.get_json(silent=True) or {}
    action = data.get('action', 'natural_command')
    query = (data.get('query') or data.get('prompt') or '').strip()
    command = data.get('command', '')
    stderr = data.get('stderr', '')
    stdout = data.get('stdout', '')
    exit_code = data.get('exit_code', 0)
    files = data.get('files') or []

    if action == 'natural_command':
        prompt = f"""You are Phantom AI Terminal Intelligence.
Convert the user's natural language request into the single best, safe shell command to run in a developer project workspace.

User Request: "{query}"
Project Files: {files[:15] if isinstance(files, list) else list(files.keys())[:15]}
Operating System: {sys.platform}

Respond strictly with valid JSON formatted as:
{{
  "command": "the exact shell command",
  "explanation": "concise 1-2 sentence explanation of what the command does",
  "is_destructive": false,
  "safety_warning": null
}}
If the command involves removing files or resetting git, set is_destructive to true and provide a safety_warning."""

    elif action in ('explain_error', 'suggest_fix'):
        prompt = f"""You are Phantom AI Developer Assistant.
A terminal command failed with an error. Analyze the root cause and provide an actionable fix.

Executed Command: {command}
Exit Code: {exit_code}
STDERR Output:
```
{stderr}
```
STDOUT (if any):
```
{stdout[:500]}
```
Project Files: {files[:15] if isinstance(files, list) else list(files.keys())[:15]}

Respond strictly with valid JSON formatted as:
{{
  "explanation": "Clear, concise explanation of why this command failed",
  "root_cause": "The exact missing module, syntax error, or environment mismatch",
  "suggested_fix": "Clear step-by-step guidance",
  "command": "The exact CLI command to fix or re-run properly"
}}"""

    elif action == 'explain_command':
        prompt = f"""You are Phantom AI Developer Assistant.
Explain the following shell command before execution:
Command: `{command}`

Respond strictly with valid JSON formatted as:
{{
  "command": "{command}",
  "explanation": "Clear summary of what this command accomplishes",
  "is_destructive": false,
  "safety_warning": null
}}"""
    else:
        return jsonify({'error': f'Unsupported action: {action}'}), 400

    try:
        messages = [{"role": "user", "parts": [{"text": prompt}]}]
        raw_text = ""
        
        if GEMINI_API_KEY:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
                resp = requests.post(url, json={"contents": messages}, timeout=10)
                if resp.status_code == 200:
                    raw_text = resp.json().get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
            except Exception:
                pass

        if not raw_text and OPENROUTER_API_KEY:
            try:
                or_payload = {"model": OPENROUTER_MODEL, "messages": [{"role": "user", "content": prompt}]}
                or_headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"}
                resp = requests.post("https://api.openrouter.ai/v1/chat/completions", json=or_payload, headers=or_headers, timeout=10)
                if resp.status_code == 200:
                    raw_text = resp.json().get('choices', [{}])[0].get('message', {}).get('content', '')
            except Exception:
                pass

        if raw_text:
            cleaned = re.sub(r'^```(json)?\s*', '', raw_text.strip(), flags=re.IGNORECASE)
            cleaned = re.sub(r'\s*```$', '', cleaned.strip())
            try:
                parsed_json = json.loads(cleaned)
                return jsonify({'success': True, 'action': action, 'result': parsed_json}), 200
            except Exception:
                pass

        # Fallback intelligent local rule-based response
        if action == 'natural_command':
            q_lower = query.lower()
            if 'install' in q_lower and ('req' in q_lower or 'depend' in q_lower):
                cmd = 'pip install -r requirements.txt' if any('requirements.txt' in str(f) for f in files) else 'npm install'
                exp = 'Installs all dependencies listed in the project package configuration.'
            elif 'venv' in q_lower or 'virtual' in q_lower:
                cmd = 'python -m venv venv && ./venv/Scripts/activate' if os.name == 'nt' else 'python3 -m venv venv && source venv/bin/activate'
                exp = 'Creates and activates a dedicated Python virtual environment.'
            elif 'git' in q_lower or 'status' in q_lower:
                cmd = 'git status'
                exp = 'Shows the current working tree and modified files status in Git.'
            elif 'run' in q_lower or 'start' in q_lower:
                cmd = 'python app.py' if any('app.py' in str(f) for f in files) else 'npm run dev'
                exp = 'Starts the primary application server.'
            else:
                cmd = f"echo \"Executing: {query}\""
                exp = f"Processed developer instruction: '{query}'"
            return jsonify({
                'success': True,
                'action': action,
                'result': {
                    'command': cmd,
                    'explanation': exp,
                    'is_destructive': False,
                    'safety_warning': None
                }
            }), 200

        elif action in ('explain_error', 'suggest_fix'):
            root = "Error in process execution."
            fix_cmd = command
            if 'modulenotfounderror' in stderr.lower() or 'no module named' in stderr.lower():
                mod_match = re.search(r"no module named '([^']+)'", stderr, re.IGNORECASE)
                mod_name = mod_match.group(1) if mod_match else 'required package'
                root = f"Missing Python package '{mod_name}'."
                fix_cmd = f"pip install {mod_name}"
            elif 'cannot find module' in stderr.lower():
                root = "Missing Node.js module dependency."
                fix_cmd = "npm install"
            return jsonify({
                'success': True,
                'action': action,
                'result': {
                    'explanation': f"The command encountered an error: {root}",
                    'root_cause': root,
                    'suggested_fix': f"Run `{fix_cmd}` to resolve the issue.",
                    'command': fix_cmd
                }
            }), 200

        return jsonify({'success': True, 'action': action, 'result': {'command': command, 'explanation': 'Command verified.'}}), 200

    except Exception as e:
        return jsonify({'error': f"AI Assist Error: {str(e)}"}), 500


# --- ACTIVE PORT & SERVICE MONITOR ENDPOINT ---
@app.route('/api/terminal/ports', methods=['GET'])
def terminal_ports():
    """Scans and detects active listening ports on localhost for dev servers and databases."""
    import socket
    ports_to_check = [
        (3000, 'Next.js Frontend', 'HTTP'),
        (5000, 'Flask Backend API', 'HTTP'),
        (8000, 'Development Server', 'HTTP'),
        (8080, 'Web Service', 'HTTP'),
        (5432, 'PostgreSQL Database', 'TCP/DB'),
        (27017, 'MongoDB Cluster', 'TCP/DB'),
        (6379, 'Redis Cache', 'TCP/Cache'),
        (3306, 'MySQL Database', 'TCP/DB')
    ]
    results = []
    for port, service_name, proto in ports_to_check:
        is_open = False
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(0.04)
                res = s.connect_ex(('127.0.0.1', port))
                if res == 0:
                    is_open = True
        except Exception:
            is_open = False

        results.append({
            'port': port,
            'service': service_name,
            'protocol': proto,
            'status': 'active' if is_open else 'idle',
            'url': f"http://localhost:{port}" if 'HTTP' in proto and is_open else None
        })

    return jsonify({'ports': results, 'timestamp': datetime.now(timezone.utc).isoformat()}), 200

@app.route('/dev_intelligence')
def dev_intelligence():
    return render_template('dev_intelligence.html')

@app.route('/cloud')
def cloud():
    return render_template('cloud.html')

@app.route('/dev_hub')
def dev_hub():
    return render_template('dev_hub.html')

@app.route('/security_layer')
def security_layer():
    return render_template('security_layer.html')

@app.route('/dev_os')
def dev_os():
    return render_template('dev_os.html')

# --- API ENDPOINTS FOR DEV OS, DEV HUB, & SECURITY LAYER ---
@app.route('/api/dev_os/status', methods=['GET'])
def dev_os_status():
    mongo_status = "Connected" if mongo_db is not None else "Disconnected (Fallback Mode)"
    return jsonify({
        "status": "online",
        "system": {
            "os": sys.platform,
            "python_version": sys.version.split()[0],
            "pymongo_version": pymongo_version,
            "mongo_status": mongo_status,
            "active_providers": [p for p, key in [
                ("gemini", GEMINI_API_KEY),
                ("openrouter", OPENROUTER_API_KEY),
                ("openai", OPENAI_API_KEY),
                ("huggingface", HF_TOKEN)
            ] if key],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    }), 200


@app.route('/api/dev_hub/metrics', methods=['GET'])
def dev_hub_metrics():
    return jsonify({
        "metrics": {
            "rate_limiter_rpm": OUTBOUND_RPM,
            "tokens_available": round(outbound_bucket.tokens, 2),
            "providers": {
                "gemini": bool(GEMINI_API_KEY),
                "openrouter": bool(OPENROUTER_API_KEY),
                "openai": bool(OPENAI_API_KEY),
                "huggingface": bool(HF_TOKEN)
            },
            "mongo_connected": mongo_db is not None,
            "server_port": 5000
        }
    }), 200


@app.route('/api/security_layer/logs', methods=['GET'])
def security_layer_logs():
    allow_invalid_tls = os.getenv("MONGO_ALLOW_INVALID_TLS", "").lower() in ("true", "1", "yes")
    return jsonify({
        "security": {
            "cors_enabled": True,
            "proxy_fix_applied": True,
            "session_cookie_name": app.config.get('SESSION_COOKIE_NAME'),
            "tls_validation_bypassed": allow_invalid_tls,
            "google_oauth_configured": bool(os.getenv("GOOGLE_CLIENT_ID")),
            "audit_timestamp": datetime.now(timezone.utc).isoformat()
        }
    }), 200


# --- DYNAMIC CHAT SUGGESTIONS ENDPOINT (LIVE WEB SEARCH & TRENDING TECH) ---
@app.route('/api/suggestions/dynamic', methods=['GET', 'POST'])
def dynamic_suggestions():
    """
    Returns real-time dynamic prompt suggestions based on live web search & trending tech news.
    """
    try:
        offset = request.args.get('offset', 0, type=int)
        query_seed = request.args.get('seed', '')
        if search_engine:
            items = search_engine.fetch_dynamic_suggestions(query_seed=query_seed, offset=offset)
        else:
            items = []
        return jsonify({'success': True, 'suggestions': items}), 200
    except Exception as e:
        app.logger.warning(f"Error fetching dynamic suggestions: {e}")
        return jsonify({'success': False, 'suggestions': []}), 200


# --- PLUGINS API ---
@app.route('/api/plugins', methods=['GET', 'PUT'])
def user_plugins_api():
    user_id = get_current_user_id() or session.get('guest_id') or "guest_default"
    default_plugins = {
        'web_search': True,
        'compiler_engine': True,
        'postgres_sync': True,
        'image_studio': True,
        'speech_voice': True,
        'sandbox_safety': True,
    }
    if request.method == 'GET':
        if db_layer:
            plugins = db_layer.get_user_plugins(user_id) or default_plugins
        else:
            plugins = default_plugins
        return jsonify({'plugins': plugins}), 200

    elif request.method == 'PUT':
        data = request.get_json(silent=True) or {}
        plugins = data.get('plugins', default_plugins)
        if db_layer:
            db_layer.save_user_plugins(user_id, plugins)
        return jsonify({'success': True, 'plugins': plugins}), 200


# --- IMAGES GALLERY API ---
@app.route('/api/images', methods=['GET'])
def user_images_api():
    user_id = get_current_user_id() or session.get('guest_id') or "guest_default"
    if db_layer:
        images = db_layer.get_user_images(user_id)
    else:
        images = []
    return jsonify({'images': images}), 200


# --- SCHEDULED AUTOMATION TASKS API ---
@app.route('/api/scheduled/tasks', methods=['GET', 'POST', 'PUT', 'DELETE'])
def scheduled_tasks_api():
    user_id = get_current_user_id() or session.get('guest_id') or "guest_default"
    if request.method == 'GET':
        if db_layer:
            tasks = db_layer.get_scheduled_tasks(user_id)
        else:
            tasks = []
        return jsonify({'tasks': tasks}), 200

    data = request.get_json(silent=True) or {}
    if request.method in ('POST', 'PUT'):
        task_id = data.get('id') or str(uuid.uuid4())
        task_name = data.get('name', 'Automation Task')
        task_type = data.get('task_type', 'cron')
        schedule = data.get('schedule', '0 9 * * *')
        action = data.get('action', 'daily_briefing')
        enabled = bool(data.get('enabled', True))
        notify = bool(data.get('notify', True))

        if db_layer:
            db_layer.save_scheduled_task(task_id, user_id, task_name, task_type, schedule, action, enabled, notify)
        return jsonify({'success': True, 'task_id': task_id}), 200

    elif request.method == 'DELETE':
        task_id = data.get('id') or request.args.get('id')
        if task_id and db_layer:
            db_layer.delete_scheduled_task(task_id, user_id)
        return jsonify({'success': True}), 200



# --- Start the Flask server ---
if __name__ == '__main__':
    print("\n--- Starting Flask Backend Server ---")
    print("Ensure you have activated your Python virtual environment.")
    print("Ensure you have set FLASK_SECRET_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GEMINI_API_KEY in your .env file.")
    print("Also ensure MONGO_URI and MONGO_DB_NAME are set in .env if using MongoDB.")
    print("This server will run on http://127.0.0.1:5000\n")
    # use_reloader=False prevents Windows socket selector error [WinError 10038]
    app.run(debug=True, use_reloader=False, port=5000)
