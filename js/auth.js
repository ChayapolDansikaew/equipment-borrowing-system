// js/auth.js

console.log('Auth loaded');

// --- Auth Logic ---

window.handleLogin = async function () {
    const usernameInput = document.getElementById('loginUsername').value.trim();
    const passwordInput = document.getElementById('loginPassword').value.trim();
    const errorMsg = document.getElementById('loginError');
    const loginBtn = document.getElementById('loginBtn');
    const loginBtnText = document.getElementById('loginBtnText');
    const loginSpinner = document.getElementById('loginSpinner');

    // Hide previous errors
    errorMsg.classList.add('hidden');

    // Validation
    if (!usernameInput || !passwordInput) {
        errorMsg.textContent = 'กรุณากรอก username และ password';
        errorMsg.classList.remove('hidden');
        return;
    }

    // Show loading state
    loginBtn.disabled = true;
    loginBtnText.classList.add('hidden');
    loginSpinner.classList.remove('hidden');

    try {
        // Query user from Supabase
        // WARNING: In production, use Supabase Auth or hashed passwords.
        // This is a simple demo bypass/query.
        const { data, error } = await window.supabaseClient
            .from('users')
            .select('*')
            .eq('username', usernameInput)
            .eq('password', passwordInput)
            .single();

        if (error) {
            console.error('Login error:', error);
            if (error.code === 'PGRST116') {
                errorMsg.textContent = 'Username หรือ Password ไม่ถูกต้อง';
            } else {
                errorMsg.textContent = 'เกิดข้อผิดพลาด: ' + error.message;
            }
            errorMsg.classList.remove('hidden');
            return;
        }

        // Login Success
        window.currentUser = data;
        localStorage.setItem('currentUser', JSON.stringify(window.currentUser));
        window.showMainApp();

    } catch (err) {
        console.error('Login exception:', err);
        errorMsg.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
        errorMsg.classList.remove('hidden');
    } finally {
        // Reset button state
        loginBtn.disabled = false;
        loginBtnText.classList.remove('hidden');
        loginSpinner.classList.add('hidden');
    }
};

window.handleLogout = function () {
    window.currentUser = null;
    localStorage.removeItem('currentUser');
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('loginSection').classList.remove('hidden');

    // Clear login form
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginError').classList.add('hidden');
};

window.checkSession = function () {
    // Check for saved session in localStorage
    const savedUser = localStorage.getItem('currentUser');

    if (savedUser) {
        try {
            window.currentUser = JSON.parse(savedUser);
            console.log('Session restored for user:', window.currentUser.username);
            window.showMainApp();
        } catch (e) {
            console.error('Failed to parse saved session:', e);
            localStorage.removeItem('currentUser');
            // Show login page
            document.getElementById('loginSection').classList.remove('hidden');
            document.getElementById('mainApp').classList.add('hidden');
        }
    } else {
        // No saved session, show login
        console.log('No saved session, showing login page');
        document.getElementById('loginSection').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
    }
};

// Helper function to fill demo account credentials
window.fillDemoAccount = function (username, password) {
    document.getElementById('loginUsername').value = username;
    document.getElementById('loginPassword').value = password;
    document.getElementById('loginError').classList.add('hidden');

    // Add a nice visual feedback
    const usernameInput = document.getElementById('loginUsername');
    const passwordInput = document.getElementById('loginPassword');

    usernameInput.classList.add('ring-2', 'ring-brand-yellow');
    passwordInput.classList.add('ring-2', 'ring-brand-yellow');

    setTimeout(() => {
        usernameInput.classList.remove('ring-2', 'ring-brand-yellow');
        passwordInput.classList.remove('ring-2', 'ring-brand-yellow');
    }, 500);
};

// =====================================================
// CHULA SSO LOGIN
// =====================================================

// SSO Configuration
const SSO_CONFIG = {
    baseUrl: 'https://account.it.chula.ac.th',
    callbackUrl: window.location.origin + '/callback.html'
};

// Redirect to Chula SSO login page
window.loginWithChulaSso = function () {
    const serviceUrl = encodeURIComponent(SSO_CONFIG.callbackUrl);
    const ssoLoginUrl = `${SSO_CONFIG.baseUrl}/login?service=${serviceUrl}`;

    console.log('Redirecting to Chula SSO:', ssoLoginUrl);
    window.location.href = ssoLoginUrl;
};
