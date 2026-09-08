// --- IMPORTANT: CONFIGURE YOUR BACKEND URL ---
const BACKEND_API_BASE_URL = "http://127.0.0.1:5000"; // Should match your Flask app.run(port=...)

const userDisplayNameInput = document.getElementById('user-display-name-input');
const usernameInput = document.getElementById('username-input');
const passwordInput = document.getElementById('password-input');
const loginButton = document.getElementById('login-button'); // For traditional login
const loginErrorMessage = document.getElementById('login-error-message');
const traditionalLoginForm = document.getElementById('traditional-login-form'); // The form itself

// --- Simulated Traditional Login Logic ---
const CORRECT_USERNAME = "user";
const CORRECT_PASSWORD = "password";
const USER_LOGIN_STATUS_KEY = "phantom_2_o_logged_in";
const USER_DISPLAY_NAME_KEY = "phantom_2_o_user_name";

function getInitials(name) {
    if (!name) return "U";
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    } else if (parts.length >= 2) {
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return "U";
}

// Event listener for the traditional login form submission
if (traditionalLoginForm) {
    traditionalLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent default form submission
        const displayName = userDisplayNameInput.value.trim();
        const email = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!displayName) {
            loginErrorMessage.textContent = "Please enter your name.";
            loginErrorMessage.classList.remove('hidden');
            userDisplayNameInput.focus();
            return;
        }
        if (!email) {
            loginErrorMessage.textContent = "Please enter a username (or email).";
            loginErrorMessage.classList.remove('hidden');
            usernameInput.focus();
            return;
        }

        if (email === CORRECT_USERNAME && password === CORRECT_PASSWORD) {
            localStorage.setItem(USER_LOGIN_STATUS_KEY, "true");
            localStorage.setItem(USER_DISPLAY_NAME_KEY, displayName);
            
            // --- Send login info to backend for tracing (simulated) ---
            try {
                const response = await fetch(`${BACKEND_API_BASE_URL}/api/register_user_info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, displayName: displayName })
                });
                const result = await response.json();
                if (!response.ok) {
                    console.error("Backend user info registration failed:", result.message || response.statusText);
                } else {
                    console.log("User info registered with backend:", result.message);
                }
            } catch (error) {
                console.error("Error sending user info to backend:", error);
            }
            
            // Redirect to dashboard manually after successful (simulated) login
            window.location.href = `${BACKEND_API_BASE_URL}/dashboard`;

        } else {
            loginErrorMessage.textContent = "Invalid username or password.";
            loginErrorMessage.classList.remove('hidden');
        }
    });
}

// Initial state for login page
document.addEventListener('DOMContentLoaded', () => {
    // Pre-fill name if it was saved from a previous session
    userDisplayNameInput.value = localStorage.getItem(USER_DISPLAY_NAME_KEY) || '';
    if (userDisplayNameInput.value === '') {
        userDisplayNameInput.focus();
    } else {
        usernameInput.focus();
    }
});

// Allow Enter key to move between fields/submit
userDisplayNameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') usernameInput.focus(); });
usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') passwordInput.focus(); });
passwordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') loginButton.click(); });