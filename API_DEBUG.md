When your **Phantom 2.o API shows “Sorry, something went wrong”** or is not responding, don’t panic—this is very common. Here’s a clean, practical way to debug it step by step:

---

## 🔍 1. Check if server is running

* Make sure Flask backend is running on port 5000.
* Run:

  ```bash
  cd "c:/Users/yashk/OneDrive/Documents/vscode/Phantom_2.o-main"
  python app.py
  ```

* Verify:
  ```bash
  python check_port.py
  ```
  Should say: `Port 5000 is OPEN`

* Visit: http://127.0.0.1:5000 → Should show landing page.

---

## 🌐 2. Verify API URL

* Main endpoints:
  * Chat: `POST http://127.0.0.1:5000/api/chat`
  * Code exec: `POST http://127.0.0.1:5000/api/run_code`
  * Login: `POST http://127.0.0.1:5000/api/login`
* Test in browser/Postman → Expect 401/503 initially (no session/DB).

---

## 📡 3. Check network request (IMPORTANT)

* Open **DevTools → Network tab**
* Trigger action (Send message, Run code)
* Look for:

  * ❌ **401** → `"Unauthorized or MongoDB not connected"` (no login session)
  * ❌ **503** → `"MongoDB not connected"` (DB down)
  * ❌ **500** → Gemini API fail (`"Backend: Error connecting to Gemini API"`)
  * ❌ **504** → `/api/chat` timeout (20s → model slow)
  * ❌ **Failed** → Server unreachable (port closed)

* Filter: `chat` → Red entries show exact error.

---

## 🧠 4. Check backend logs (MOST USEFUL)

Terminal running `python app.py` shows **real issues**:

```
CRITICAL ERROR: Failed to connect to MongoDB: ...
MongoDB not connected — retrying in 30s...
Backend: Error connecting to Gemini API: 429 (quota exceeded)
```

* Mongo TLS: `python debug_mongo_connect.py`
* API tests: `python test_api.py` / `python quick_test.py`

**server.log** (auto-created) → Full tracebacks.

---

## 🔑 5. API Keys / Environment (.env)

```
FLASK_SECRET_KEY=your_random_secret_here
GEMINI_API_KEY=AIza... (required for /api/chat)
MONGO_URI=mongodb+srv://... (or mongodb:// for local)
MONGO_DB_NAME=phantom  # No dots!
GOOGLE_CLIENT_ID=...   # OAuth
```

* Missing GEMINI → 500 on chat
* Invalid MONGO_DB_NAME → Mongo validation fail
* Run: `python print_redirect.py` → OAuth URIs

---

## 🔄 6. CORS issue (rare here)

CORS already enabled: `CORS(app, resources={r"/api/*": {"origins": "*"}})`

If blocked:
```bash
pip install flask-cors  # Already in requirements.txt
```

---

## ⏳ 7. Timeout / Slow response

* `/api/chat`: 20s → 504 if Gemini slow/quota
* `/api/run_code`: 10s subprocess timeout → 408
* Increase: Edit app.py `timeout=30`

---

## 🧪 8. Test with Postman / curl

```bash
# No session (expected 401)
curl -X POST http://127.0.0.1:5000/api/chat \\
  -H "Content-Type: application/json" \\
  -d &#39;{"contents": [], "session_id": "test"}&#39;

# Full test suite
python test_api.py
python quick_test.py
```

Expected:
```
[Test 4] POST /api/chat (no session) → Status: 401
```

---

## ⚠️ 9. Common Phantom mistakes

* **No session**: Login first → 401 on all /api/*
* **Mongo down**: 503 everywhere (background retry every 30s)
* **Wrong method**: GET /api/chat → 405
* **Missing headers**: No `Content-Type: application/json`
* **OAuth**: `redirect_uri_mismatch` → Run `python print_redirect.py`, add to Google Console
* **Gemini quota**: 429 → Check GEMINI_API_KEY limits

```js
// JS always needs:
headers: { "Content-Type": "application/json" }
```

---

## 🛠️ Quick checklist

✔ **Port 5000 OPEN** (`python check_port.py`)
✔ **Correct URL** (`http://127.0.0.1:5000/api/chat`)
✔ **Network tab** (401=session, 503=Mongo, 500=Gemini)
✔ **Backend logs** (Mongo/Gemini errors)
✔ **.env keys** (GEMINI_API_KEY, MONGO_URI)
✔ **Login session** (F12 → Application → Cookies)
✔ **OAuth URIs** (Google Console + `print_redirect.py`)

---

**Pro Tip**: Run `python test_api.py` → Instantly see 401/503 statuses matching Network tab.

**Still stuck?** Share:
👉 **Network tab screenshot** (red request)
👉 **Terminal output** (`python app.py`)
👉 **test_api.py results**

I’ll pinpoint **exact** fix in 30 seconds.

