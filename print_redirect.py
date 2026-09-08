from app import app
from flask import url_for
import os

print("\n" + "="*70)
print("GOOGLE OAUTH REDIRECT URI HELPER")
print("="*70)

# Check if GOOGLE_REDIRECT_URI is set in environment
env_redirect = os.getenv('GOOGLE_REDIRECT_URI')
if env_redirect:
    print(f"\n✓ Using redirect URI from GOOGLE_REDIRECT_URI env var:")
    print(f"  {env_redirect}")
else:
    print("\n✓ No GOOGLE_REDIRECT_URI env var found. Using generated URIs:")
    
    # Test with 127.0.0.1
    with app.test_request_context('/', base_url='http://127.0.0.1:5000'):
        uri_127 = url_for('authorize', _external=True)
        print(f"\n  For http://127.0.0.1:5000:")
        print(f"  {uri_127}")
    
    # Test with localhost
    with app.test_request_context('/', base_url='http://localhost:5000'):
        uri_localhost = url_for('authorize', _external=True)
        print(f"\n  For http://localhost:5000:")
        print(f"  {uri_localhost}")

print("\n" + "="*70)
print("INSTRUCTIONS TO FIX redirect_uri_mismatch ERROR:")
print("="*70)
print("\n1. Go to: https://console.cloud.google.com/apis/credentials")
print("2. Click on your OAuth 2.0 Client ID")
print("3. Under 'Authorized redirect URIs', click 'ADD URI'")
if env_redirect:
    print(f"4. Add this EXACT URI: {env_redirect}")
else:
    print(f"4. Add BOTH of these URIs:")
    print(f"   - {uri_127}")
    print(f"   - {uri_localhost}")
print("5. Click 'SAVE'")
print("6. Wait 1-2 minutes for changes to propagate")
print("7. Try logging in again")
print("\n" + "="*70 + "\n")
