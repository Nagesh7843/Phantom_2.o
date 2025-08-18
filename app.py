import os
from flask import Flask, request, jsonify, render_template, redirect, url_for, session
from flask_cors import CORS
import requests
from dotenv import load_dotenv
from authlib.integrations.flask_client import OAuth
import jwt # For decoding JWTs (like Google's id_token)
from pymongo import MongoClient # For MongoDB connection
from werkzeug.security import generate_password_hash, check_password_hash # For password hashing
from datetime import datetime, timezone
from bson.objectid import ObjectId # For generating unique MongoDB ObjectIDs
from flask import Flask, render_template, request, redirect, url_for, flash, session

# Load environment variables from .env file at the very beginning
load_dotenv()

app = Flask(__name__,
            template_folder='templates',
            static_folder='static')

CORS(app, resources={r"/api/*": {"origins": "*"}}) 

# --- Flask Secret Key for Sessions ---
app.secret_key = os.getenv("FLASK_SECRET_KEY")
if not app.secret_key:
    app.secret_key = "a_fallback_secret_key_for_dev_ONLY_change_in_prod_1234567890"
    print("WARNING: FLASK_SECRET_KEY not found in .env! Using a fallback. PLEASE SET IT IN .env FOR SECURITY.")

app.config['SESSION_COOKIE_NAME'] = 'phantom-login-session'

# --- Google OAuth Configuration ---
oauth = OAuth(app)

# DEBUG: Print loaded environment variables to check if they are picked up
print(f"DEBUG: GOOGLE_CLIENT_ID loaded: {os.getenv('GOOGLE_CLIENT_ID') is not None and len(os.getenv('GOOGLE_CLIENT_ID', '')) > 5}")
print(f"DEBUG: GOOGLE_CLIENT_SECRET loaded: {os.getenv('GOOGLE_CLIENT_SECRET') is not None and len(os.getenv('GOOGLE_CLIENT_SECRET', '')) > 5}")
print(f"DEBUG: GEMINI_API_KEY loaded: {os.getenv('GEMINI_API_KEY') is not None and len(os.getenv('GEMINI_API_KEY', '')) > 5}")
print(f"DEBUG: FLASK_SECRET_KEY loaded correctly: {app.secret_key is not None and len(app.secret_key) > 20 and app.secret_key != 'a_fallback_secret_key_for_dev_ONLY_change_in_prod_1234567890'}")


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

mongo_client = None
mongo_db = None
users_collection = None
chat_sessions_collection = None
messages_collection = None

if not MONGO_URI or not MONGO_DB_NAME:
    print("CRITICAL WARNING: MongoDB URI or DB Name not set in .env! MongoDB features will be disabled.")
else:
    try:
        mongo_client = MongoClient(MONGO_URI)
        mongo_db = mongo_client[MONGO_DB_NAME]
        print(f"DEBUG: Successfully connected to MongoDB database: {MONGO_DB_NAME}")
        users_collection = mongo_db['users']
        chat_sessions_collection = mongo_db['chat_sessions']
        messages_collection = mongo_db['messages']
    except Exception as e:
        print(f"CRITICAL ERROR: Failed to connect to MongoDB: {e}")
        print("MongoDB features will be disabled due to connection error.")
        mongo_client = None


# --- Gemini API Configuration (Backend Only) ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

# --- Helper to save/update user info (used by both Google and traditional login) ---
def save_user_info_to_db(email, display_name, google_id=None, picture_url=None, password_hash=None):
    if users_collection is None:
        print(f"--- BACKEND: User {email} info not saved (MongoDB not connected). ---")
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


# --- Flask Routes ---

@app.route('/')
def index():
    # If the user is already logged in, send them to the dashboard.
    if 'user' in session:
        return redirect(url_for('dashboard'))
    # Otherwise, show them the new landing page.
    return render_template('index.html')

@app.route('/login')
def login():
    return render_template('login.html')


# NEW: A dedicated route to simply show the registration page.
@app.route('/register')
def register():
    # You will need to create a 'register.html' file in your templates folder.
    return render_template('register.html')


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index')) # Redirect to landing page after logout

@app.route('/dashboard')
def dashboard():
    user = session.get('user')
    if not user:
        # If no user in session, redirect to the login page
        return redirect(url_for('login')) 
    
    # If user exists, show the dashboard
    return render_template('dashboard.html', 
                           user_display_name=session.get('user_display_name', 'Guest'),
                           user_email=session.get('user_email', ''),
                           user_picture_url=session.get('user_picture'),
                           user_theme=session.get('user_theme', 'theme-dark'),
                           user_language=session.get('user_language', 'en-US'),
                           user_voice=session.get('user_voice', '')
                           )

@app.route('/login/google')
def login_google():
    redirect_uri = url_for('authorize', _external=True)
    return google.authorize_redirect(redirect_uri)

@app.route('/authorize')
def authorize():
    try:
        token = google.authorize_access_token()
        
        if not token or 'id_token' not in token:
            app.logger.error(f"Google Authorization failed: No id_token in response: {token}")
            return render_template('login.html', error_message="Authorization failed: No ID token from Google.")
        
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
        user_doc = users_collection.find_one({'google_id': session['google_id']})
        if user_doc:
            session['user_theme'] = user_doc.get('theme', 'theme-dark')
            session['user_language'] = user_doc.get('language', 'en-US')
            session['user_voice'] = user_doc.get('voice', '')
        else: # Set defaults if new user (should be handled by save_user_info_to_db, but for safety)
            session['user_theme'] = 'theme-dark'
            session['user_language'] = 'en-US'
            session['user_voice'] = ''


        return redirect(url_for('dashboard'))
    except Exception as e:
        app.logger.error(f"Google Authorization final step failed: {str(e)}", exc_info=True)
        return render_template('login.html', error_message=f"Login failed: {str(e)}")

# --- NEW: API for Traditional User Registration ---
@app.route('/api/register', methods=['POST'])
def register_user():
    if users_collection is None:
        return jsonify({"error": "MongoDB not connected. Registration unavailable."}), 500

    data = request.json
    display_name = data.get('displayName')
    username = data.get('username') # Using username as email for simplicity
    password = data.get('password')

    if not display_name or not username or not password:
        return jsonify({"error": "Missing display name, username, or password."}), 400

    if users_collection.find_one({'email': username}):
        return jsonify({"error": "User with this email/username already exists."}), 409

    hashed_password = generate_password_hash(password)

    try:
        user_id = str(ObjectId()) # Generate a unique ID for traditional users
        users_collection.insert_one({
            "_id": ObjectId(user_id), # Store as ObjectId
            "email": username,
            "display_name": display_name,
            "password_hash": hashed_password,
            "google_id": None, # Not a Google user
            "picture_url": None,
            "last_login": datetime.now(timezone.utc),
            "theme": "theme-dark", # Default settings
            "language": "en-US",
            "voice": ""
        })
        # Log in the user immediately after registration
        session['user'] = {'email': username, 'name': display_name, 'sub': user_id}
        session['user_email'] = username
        session['user_display_name'] = display_name
        session['google_id'] = user_id # Use this for consistency in session management
        session['user_picture'] = None
        session['user_theme'] = 'theme-dark'
        session['user_language'] = 'en-US'
        session['user_voice'] = ''

        return jsonify({"message": "Registration successful", "user_id": user_id}), 201
    except Exception as e:
        app.logger.error(f"Error during registration: {e}", exc_info=True)
        return jsonify({"error": "Registration failed due to server error."}), 500

# --- NEW: API for Traditional User Login ---
@app.route('/api/login', methods=['GET','POST'])
def login_user():
    if users_collection is None:
        return jsonify({"error": "MongoDB not connected. Login unavailable."}), 500

    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Missing username or password."}), 400

    user = users_collection.find_one({'email': username})

    if user and check_password_hash(user['password_hash'], password):
        # Determine the user_id to use in session (ObjectId for traditional, google_id for Google)
        session_user_id = str(user['_id']) if '_id' in user else user.get('google_id')

        # Update last login time
        users_collection.update_one(
            {'$or': [{'_id': user.get('_id')}, {'google_id': user.get('google_id')}]},
            {'$set': {'last_login': datetime.now(timezone.utc)}}
        )
        # Set session variables
        session['user'] = {'email': user['email'], 'name': user['display_name'], 'sub': session_user_id}
        session['user_email'] = user['email']
        session['user_display_name'] = user['display_name']
        session['google_id'] = session_user_id # Use this for consistency
        session['user_picture'] = user.get('picture_url')
        session['user_theme'] = user.get('theme', 'theme-dark')
        session['user_language'] = user.get('language', 'en-US')
        session['user_voice'] = user.get('voice', '')

        return jsonify({"message": "Login successful"}), 200
    else:
        return jsonify({"error": "Invalid username or password."}), 401

# --- NEW: API for updating user profile and settings ---
@app.route('/api/update_profile', methods=['PUT'])
def update_profile():
    if not session.get('user') or users_collection is None:
        return jsonify({"error": "Unauthorized or MongoDB not connected."}), 401

    user_id = session['google_id'] # This is the 'sub' from Google or '_id' from traditional login
    data = request.json
    
    try:
        # Construct query filter to find the user, handling both ObjectId and string google_id
        query_filter = {'_id': ObjectId(user_id)} if ObjectId.is_valid(user_id) else {'google_id': user_id}

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

        users_collection.update_one(
            query_filter,
            {'$set': update_fields}
        )
        
        # Refresh session with new data
        updated_user = users_collection.find_one(query_filter)
        if updated_user:
            session['user_display_name'] = updated_user.get('display_name')
            session['user_email'] = updated_user.get('email')
            session['user_picture'] = updated_user.get('picture_url')
            session['user_theme'] = updated_user.get('theme', 'theme-dark')
            session['user_language'] = updated_user.get('language', 'en-US')
            session['user_voice'] = updated_user.get('voice', '')

        return jsonify({
            "message": "Profile updated successfully",
            "user": {
                "displayName": session['user_display_name'],
                "email": session['user_email'],
                "pictureUrl": session['user_picture'],
                "theme": session['user_theme'],
                "language": session['user_language'],
                "voice": session['user_voice']
            }
        }), 200
    except Exception as e:
        app.logger.error(f"Error updating profile for user {user_id}: {e}", exc_info=True)
        return jsonify({"error": "Failed to update profile."}), 500

# --- NEW: API for getting all chat sessions for a user ---
@app.route('/api/all_sessions', methods=['GET'])
def get_all_sessions():
    if not session.get('user') or chat_sessions_collection is None:
        return jsonify({"error": "Unauthorized or MongoDB not connected."}), 401

    user_id = session['google_id'] # Use google_id or _id for traditional users
    try:
        sessions_cursor = chat_sessions_collection.find(
            {'user_id': user_id}
        ).sort('last_updated', -1)  # Sort by most recent update first
        
        all_sessions = []
        for s in sessions_cursor:
            session_title = s.get('title', 'New Chat Session')
            # If title is still default, try to get it from the first message
            if session_title == "New Chat Session": # Original default title
                first_message = messages_collection.find_one({'session_id': s['_id'], 'role': 'user'})
                if first_message:
                    session_title = first_message.get('content', 'Untitled Chat')[:40]
                    if len(first_message.get('content', '')) > 40:
                        session_title += '...'
                    # Update the title in the DB to avoid re-calculating next time
                    chat_sessions_collection.update_one({'_id': s['_id']}, {'$set': {'title': session_title}})
            
            all_sessions.append({
                "session_id": str(s['_id']),
                "title": session_title,
                "last_updated": s.get('last_updated', s['created_at']).isoformat()
            })
        
        return jsonify({"sessions": all_sessions}), 200
    except Exception as e:
        app.logger.error(f"Error fetching all sessions for user {user_id}: {e}", exc_info=True)
        return jsonify({"error": "Failed to load chat history."}), 500

# --- NEW: API for starting a new chat session ---
@app.route('/api/new_chat_session', methods=['POST'])
def new_chat_session_api():
    if not session.get('user') or chat_sessions_collection is None:
        return jsonify({"error": "Unauthorized or MongoDB not connected."}), 401
    
    user_id = session['google_id']
    new_session_id = str(ObjectId())
    
    chat_session_data = {
        "_id": ObjectId(new_session_id), # Store as ObjectId
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc),
        "last_updated": datetime.now(timezone.utc),
        "title": "New Chat Session" # Default title
    }
    chat_sessions_collection.insert_one(chat_session_data)
    print(f"DEBUG: New chat session created in DB: {new_session_id}")

    # Optionally, set this as the current session in Flask session
    session['current_chat_session_id'] = new_session_id

    return jsonify({"message": "New chat session created", "session_id": new_session_id}), 200

# --- MODIFIED: Backend API Endpoint for Chat Proxy ---
@app.route('/api/chat', methods=['POST'])
def chat_api():
    if not session.get('user') or mongo_db is None:
        return jsonify({"error": "Unauthorized or MongoDB not connected."}), 401

    if not GEMINI_API_KEY:
        app.logger.error("Backend Error: GEMINI_API_KEY is not set in environment variables.")
        return jsonify({"error": "Server: API key not configured on the backend."}), 500

    user_id = session['google_id']
    try:
        client_payload = request.json
        # Ensure session_id is always provided by the client for existing sessions
        current_session_id = client_payload.get('session_id') 
        if not current_session_id:
            return jsonify({"error": {"message": "session_id is required in the payload."}}), 400

        # Update the session's last_updated time
        chat_sessions_collection.update_one(
            {'_id': ObjectId(current_session_id)}, # Convert to ObjectId for query
            {'$set': {'last_updated': datetime.now(timezone.utc)}},
            upsert=False
        )

        messages_for_gemini = client_payload['contents']
        language_name = client_payload.get('language_name', 'English').strip()
        if not language_name:
            language_name = 'English'

        new_user_message_content = ""
        # Process image data if present and extract user message text
        if messages_for_gemini and messages_for_gemini[-1]['role'] == 'user':
            for part in messages_for_gemini[-1]['parts']:
                if 'text' in part:
                    new_user_message_content += part['text'] + " "
                elif 'inlineData' in part and 'data' in part['inlineData']:
                    mime_type = part['inlineData']['mimeType']
                    data = part['inlineData']['data']
                    # Basic validation for image type and size
                    if not mime_type.startswith('image/'):
                        return jsonify({"error": {"message": "Unsupported inline data type. Only images are allowed."}}), 400
                    # Example: Limit image size to 5MB (base64 is approx 1.33x original size)
                    if len(data) * 0.75 / (1024 * 1024) > 5: # Convert base64 length to approx MB
                        return jsonify({"error": {"message": "Image size exceeds 5MB limit."}}), 413
                    new_user_message_content += "[Image Data] " # Indicate image data


        if new_user_message_content.strip() and messages_collection is not None: 
            messages_collection.insert_one({
                "session_id": ObjectId(current_session_id), # Store as ObjectId
                "user_id": user_id,
                "role": "user",
                "content": new_user_message_content.strip(),
                "timestamp": datetime.now(timezone.utc),
                "type": "text" # Assuming text for now, can be 'image' if image content is stored differently
            })
            print(f"DEBUG: Saved user message to DB: {new_user_message_content.strip()}")
        elif new_user_message_content.strip():
            print("DEBUG: messages_collection not available, user message not saved to DB.")


        instruction_text = f"""
        instruction_text = f
You are Phantom_2.o, an advanced AI assistant created and trained by Nagesh Gaikwad.
Your role is to provide clear, structured, and helpful responses to user queries.

Use emojis naturally in your answers.  
Always format responses in this style:

 A short, relevant title for the response,\n

A detailed but friendly explanation. Add emojis where suitable to make it engaging.\n

 Example (only if it makes sense):

IMPORTANT:
- Ensure all content fits within these sections.
- If you provide code, always use proper Markdown code blocks (e.g., ```python\\nprint('Hello');\\n```).
- If you reference information, mention it generally (e.g., "Based on my knowledge..." or "Data indicates..."). Do not hallucinate specific sources if you don't have them.
- Ensure your response is in {language_name} language.
"""
        
        final_contents = [{"role": "user", "parts": [{"text": instruction_text}]}]
        final_contents.extend(messages_for_gemini)


        gemini_payload = {
            "contents": final_contents
        }

        response = requests.post(
            f"{GEMINI_API_URL}?key={GEMINI_API_KEY}",
            json=gemini_payload,
            timeout=20
        )
        response.raise_for_status()

        gemini_response = response.json()
        model_response_text = "Error: Could not get a response."
        if gemini_response.get('candidates') and gemini_response['candidates'][0].get('content') and gemini_response['candidates'][0]['content'].get('parts'):
            model_response_text = gemini_response['candidates'][0]['content']['parts'][0]['text']
        elif gemini_response.get('promptFeedback') and gemini_response['promptFeedback'].get('blockReason'):
            model_response_text = f"Sorry, your request was blocked due to: {gemini_response['promptFeedback']['blockReason']}."
        elif gemini_response.get('error') and gemini_response['error'].get('message'):
            model_response_text = f"Gemini API Error: {gemini_response['error']['message']}"
        

        if model_response_text.strip() and model_response_text != "Error: Could not get a response." and messages_collection is not None:
            messages_collection.insert_one({
                "session_id": ObjectId(current_session_id), # Store as ObjectId
                "user_id": user_id,
                "role": "model",
                "content": model_response_text,
                "timestamp": datetime.now(timezone.utc),
                "type": "text"
            })
            print(f"DEBUG: Saved AI message to DB for session {current_session_id}: {model_response_text[:50]}...")
        elif model_response_text.strip():
            print("DEBUG: messages_collection not available, AI message not saved to DB.")


        return jsonify(gemini_response), 200

    except requests.exceptions.Timeout:
        app.logger.error("Backend: Gemini API request timed out (20 seconds).")
        return jsonify({"error": {"message": "Backend: Gemini API request timed out."}}), 504
    except requests.exceptions.HTTPError as e:
        status_code = e.response.status_code
        error_message = e.response.text
        app.logger.error(f"Backend HTTP Error calling Gemini API: Status {status_code}, Message: {error_message}")
        if status_code == 400 and "API key not valid" in error_message:
             return jsonify({"error": {"message": "Backend: API key not valid. Please check your backend's GEMINI_API_KEY configuration."}}), 400
        return jsonify({"error": {"message": f"Backend: Error from Gemini API: Status {status_code}, Details: {error_message}"}}), status_code
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Backend: Error connecting to Gemini API: {e}")
        return jsonify({"error": {"message": f"Backend: Error connecting to Gemini API: {e}"}}), 500
    except Exception as e:
        app.logger.error(f"Backend: An unexpected server error occurred: {e}", exc_info=True)
        return jsonify({"error": {"message": f"Backend: An unexpected error occurred: {str(e)}"}}), 500

# --- NEW: API for loading chat history for a session ---
@app.route('/api/history/<session_id>', methods=['GET'])
def get_session_history(session_id):
    if not session.get('user') or mongo_db is None:
        return jsonify({"error": "Unauthorized or MongoDB not connected."}), 401
    
    user_id = session['google_id']
    try:
        # Ensure the session_id is a valid ObjectId if coming from a traditional user
        session_id_obj = ObjectId(session_id) if ObjectId.is_valid(session_id) else session_id
        # Check if the user owns this session before fetching messages
        session_exists = chat_sessions_collection.find_one({'_id': session_id_obj, 'user_id': user_id})
        if not session_exists:
            return jsonify({"error": "Session not found or not authorized."}), 404

        if messages_collection is not None:
            messages_cursor = messages_collection.find(
                {'session_id': session_id_obj, 'user_id': user_id}
            ).sort('timestamp', 1)
            
            formatted_messages = []
            for msg in messages_cursor:
                formatted_msg = {
                    "role": msg['role'],
                    "parts": [{"text": msg['content']}],
                    "db_id": str(msg['_id'])
                }
                formatted_messages.append(formatted_msg)
            
            return jsonify({"history": formatted_messages}), 200
        else:
            print("DEBUG: messages_collection not available, cannot fetch history.")
            return jsonify({"history": []}), 200
    except Exception as e:
        app.logger.error(f"Error fetching chat history for session {session_id}: {e}", exc_info=True)
        return jsonify({"error": "Failed to load history for this session."}), 500

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


# --- Start the Flask server ---
if __name__ == '__main__':
    print("\n--- Starting Flask Backend Server ---")
    print("Ensure you have activated your Python virtual environment.")
    print("Ensure you have set FLASK_SECRET_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GEMINI_API_KEY in your .env file.")
    print("Also ensure MONGO_URI and MONGO_DB_NAME are set in .env if using MongoDB.")
    print("This server will run on http://127.0.0.1:5000\n")
    app.run(debug=True, port=5000)