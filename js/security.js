// js/security.js
// =====================================================
// SECURITY UTILITIES — ป้องกัน XSS & Input Sanitization
// =====================================================

console.log('Security module loaded');

/**
 * Escape HTML entities เพื่อป้องกัน XSS
 * ใช้กับ user input ก่อนแสดงผลใน HTML
 */
window.sanitizeHTML = function (str) {
    if (typeof str !== 'string') return str;
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
        '/': '&#x2F;',
        '`': '&#x60;'
    };
    return str.replace(/[&<>"'`/]/g, (char) => map[char]);
};

/**
 * Sanitize user input — ลบ script tags, event handlers, และ dangerous patterns
 * ใช้กับ input forms ก่อนส่งไป database
 */
window.sanitizeInput = function (str) {
    if (typeof str !== 'string') return str;

    return str
        // ลบ script tags
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // ลบ event handlers (onclick, onerror, onload, etc.)
        .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/\bon\w+\s*=\s*[^\s>]*/gi, '')
        // ลบ javascript: protocol
        .replace(/javascript\s*:/gi, '')
        // ลบ data: protocol (ป้องกัน data URI attacks)
        .replace(/data\s*:\s*text\/html/gi, '')
        // ลบ expression() CSS
        .replace(/expression\s*\(/gi, '')
        // Trim whitespace
        .trim();
};

/**
 * Hash password ด้วย SHA-256 (Web Crypto API)
 * ใช้แทน plaintext password
 */
window.hashPassword = async function (password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Validate session data — ตรวจสอบ integrity ของ session
 */
window.validateSession = function (userData) {
    if (!userData) return false;
    if (!userData.username || typeof userData.username !== 'string') return false;
    if (!userData.role || !['admin', 'user'].includes(userData.role)) return false;
    if (!userData.id) return false;

    // ตรวจ session expiry (24 ชั่วโมง)
    if (userData.loginTime) {
        const loginTime = new Date(userData.loginTime).getTime();
        const now = Date.now();
        const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
        if (now - loginTime > SESSION_DURATION) {
            console.warn('Session expired');
            return false;
        }
    }

    return true;
};

// =====================================================
// LOGIN RATE LIMITING
// =====================================================

const LOGIN_RATE_LIMIT = {
    maxAttempts: 5,
    lockoutDuration: 30000, // 30 seconds
    attempts: 0,
    lockedUntil: null,
    countdownInterval: null
};

/**
 * ตรวจว่า login ถูกล็อคหรือไม่
 */
window.isLoginLocked = function () {
    if (!LOGIN_RATE_LIMIT.lockedUntil) return false;
    if (Date.now() >= LOGIN_RATE_LIMIT.lockedUntil) {
        // Lockout expired
        LOGIN_RATE_LIMIT.lockedUntil = null;
        LOGIN_RATE_LIMIT.attempts = 0;
        if (LOGIN_RATE_LIMIT.countdownInterval) {
            clearInterval(LOGIN_RATE_LIMIT.countdownInterval);
            LOGIN_RATE_LIMIT.countdownInterval = null;
        }
        return false;
    }
    return true;
};

/**
 * บันทึก failed login attempt
 */
window.recordFailedLogin = function () {
    LOGIN_RATE_LIMIT.attempts++;

    if (LOGIN_RATE_LIMIT.attempts >= LOGIN_RATE_LIMIT.maxAttempts) {
        LOGIN_RATE_LIMIT.lockedUntil = Date.now() + LOGIN_RATE_LIMIT.lockoutDuration;

        // Start countdown display
        const errorMsg = document.getElementById('loginError');
        if (errorMsg) {
            LOGIN_RATE_LIMIT.countdownInterval = setInterval(() => {
                const remaining = Math.ceil((LOGIN_RATE_LIMIT.lockedUntil - Date.now()) / 1000);
                if (remaining <= 0) {
                    clearInterval(LOGIN_RATE_LIMIT.countdownInterval);
                    LOGIN_RATE_LIMIT.countdownInterval = null;
                    LOGIN_RATE_LIMIT.lockedUntil = null;
                    LOGIN_RATE_LIMIT.attempts = 0;
                    errorMsg.textContent = 'คุณสามารถลองใหม่ได้แล้ว';
                    setTimeout(() => errorMsg.classList.add('hidden'), 2000);
                } else {
                    errorMsg.textContent = `ล็อคการเข้าสู่ระบบ กรุณารอ ${remaining} วินาที`;
                    errorMsg.classList.remove('hidden');
                }
            }, 1000);
        }
    }
};

/**
 * Reset login attempts เมื่อ login สำเร็จ
 */
window.resetLoginAttempts = function () {
    LOGIN_RATE_LIMIT.attempts = 0;
    LOGIN_RATE_LIMIT.lockedUntil = null;
    if (LOGIN_RATE_LIMIT.countdownInterval) {
        clearInterval(LOGIN_RATE_LIMIT.countdownInterval);
        LOGIN_RATE_LIMIT.countdownInterval = null;
    }
};
