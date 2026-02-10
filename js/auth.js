// js/auth.js
// =====================================================
// AUTHENTICATION MODULE — Login, Logout, Session, SSO
// =====================================================

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

    // [FIX 3] Rate Limiting — ตรวจว่าถูกล็อคหรือไม่
    if (window.isLoginLocked && window.isLoginLocked()) {
        const remaining = Math.ceil((window.LOGIN_RATE_LIMIT?.lockedUntil - Date.now()) / 1000);
        errorMsg.textContent = `ล็อคการเข้าสู่ระบบ กรุณารอ ${remaining} วินาที`;
        errorMsg.classList.remove('hidden');
        return;
    }

    // Validation
    if (!usernameInput || !passwordInput) {
        errorMsg.textContent = 'กรุณากรอก username และ password';
        errorMsg.classList.remove('hidden');
        return;
    }

    // [FIX 5] Input Sanitization
    const sanitizedUsername = window.sanitizeInput ? window.sanitizeInput(usernameInput) : usernameInput;

    // Show loading state
    loginBtn.disabled = true;
    loginBtnText.classList.add('hidden');
    loginSpinner.classList.remove('hidden');

    try {
        // [FIX 2] Hash password ด้วย SHA-256 ก่อน query
        let passwordToCompare = passwordInput;
        if (window.hashPassword) {
            passwordToCompare = await window.hashPassword(passwordInput);
        }

        // Query user from Supabase with hashed password
        const { data, error } = await window.supabaseClient
            .from('users')
            .select('*')
            .eq('username', sanitizedUsername)
            .eq('password', passwordToCompare)
            .single();

        if (error) {
            console.error('Login error:', error);
            if (error.code === 'PGRST116') {
                errorMsg.textContent = 'Username หรือ Password ไม่ถูกต้อง';
            } else {
                errorMsg.textContent = 'เกิดข้อผิดพลาด กรุณาลองใหม่';
            }
            errorMsg.classList.remove('hidden');

            // [FIX 3] Record failed attempt
            if (window.recordFailedLogin) {
                window.recordFailedLogin();
            }
            return;
        }

        // [FIX 3] Reset attempts on success
        if (window.resetLoginAttempts) {
            window.resetLoginAttempts();
        }

        // [FIX 4] Login Success — เพิ่ม loginTime สำหรับ session expiry
        window.currentUser = {
            ...data,
            loginTime: new Date().toISOString()
        };
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

window.checkSession = async function () {
    // Check for saved session in localStorage
    const savedUser = localStorage.getItem('currentUser');

    if (savedUser) {
        try {
            const userData = JSON.parse(savedUser);

            // [FIX 4] Validate session integrity & expiry
            if (window.validateSession && !window.validateSession(userData)) {
                console.warn('Session invalid or expired, forcing logout');
                localStorage.removeItem('currentUser');
                document.getElementById('loginSection').classList.remove('hidden');
                document.getElementById('mainApp').classList.add('hidden');

                // แสดงข้อความ session หมดอายุ
                const errorMsg = document.getElementById('loginError');
                if (errorMsg) {
                    errorMsg.textContent = 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่';
                    errorMsg.classList.remove('hidden');
                }
                return;
            }

            // Re-fetch role from database to sync with any admin changes
            if (window.supabaseClient && (userData.dbId || userData.id || userData.username)) {
                try {
                    // Use dbId (DB primary key) if available, otherwise query by username
                    let query = window.supabaseClient
                        .from('users')
                        .select('id, role');

                    if (userData.dbId) {
                        query = query.eq('id', userData.dbId);
                    } else if (userData.username) {
                        query = query.eq('username', userData.username);
                    } else {
                        query = query.eq('id', userData.id);
                    }

                    const { data: freshUser, error } = await query.single();

                    if (!error && freshUser) {
                        if (userData.role !== freshUser.role) {
                            console.log(`Role updated: ${userData.role} → ${freshUser.role}`);
                        }
                        userData.role = freshUser.role;
                        userData.dbId = freshUser.id; // Cache dbId for future use
                    }
                } catch (syncErr) {
                    console.warn('Could not sync role from DB:', syncErr);
                    // Continue with cached role if DB is unreachable
                }
            }

            window.currentUser = userData;
            localStorage.setItem('currentUser', JSON.stringify(window.currentUser));
            console.log('Session restored for user:', window.currentUser.username, 'role:', window.currentUser.role);
            window.showMainApp();
        } catch (e) {
            console.error('Failed to parse saved session:', e);
            localStorage.removeItem('currentUser');
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
