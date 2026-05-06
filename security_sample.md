# ตัวอย่างซอร์สโค้ดการรักษาความปลอดภัยของระบบ (Security)

เอกสารนี้แสดงตัวอย่างซอร์สโค้ดที่สอดคล้องกับมาตรการการรักษาความปลอดภัยในระบบ (Security Measures) ตามที่ระบุไว้ในเอกสารการออกแบบ ซึ่งประกอบไปด้วยฟังก์ชันต่าง ๆ ในไฟล์ `js/security.js`

## 1. การเข้ารหัสรหัสผ่าน (SHA-256 Hashing)
การใช้ Web Crypto API ในการเข้ารหัสรหัสผ่านแบบ SHA-256 ก่อนนำไปตรวจสอบหรือบันทึกลงฐานข้อมูล

```javascript
/**
 * Hash password ด้วย SHA-256 (Web Crypto API)
 * ใช้แทน plaintext password
 */
window.hashPassword = async function (password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    // ทำการเข้ารหัสด้วย SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    // แปลงผลลัพธ์เป็น String (Hexadecimal)
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
```

## 2. การป้องกันการโจมตีแบบ XSS (Input Sanitization)
การใช้ฟังก์ชันทำความสะอาดข้อมูลที่ผู้ใช้กรอก (Input Sanitization) และการแปลงอักขระพิเศษ (Escape HTML)

```javascript
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
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // ลบ script tags
        .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '') // ลบ event handlers (เช่น onclick)
        .replace(/\bon\w+\s*=\s*[^\s>]*/gi, '')
        .replace(/javascript\s*:/gi, '') // ลบ javascript: protocol
        .replace(/data\s*:\s*text\/html/gi, '') // ลบ data: URI attacks
        .replace(/expression\s*\(/gi, '') // ลบ CSS expression
        .trim();
};
```

## 3. การกำหนดเวลาหมดอายุของ Session (Session Validation)
การตรวจสอบสิทธิ์การใช้งาน (Session) พร้อมกำหนดระยะเวลาให้หมดอายุภายใน 24 ชั่วโมง

```javascript
/**
 * Validate session data — ตรวจสอบ integrity และเวลาหมดอายุของ session
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
        const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 ชั่วโมง
        
        if (now - loginTime > SESSION_DURATION) {
            console.warn('Session expired');
            return false; // หมดอายุ
        }
    }
    return true; // Session ยังใช้งานได้
};
```

## 4. ระบบป้องกันการสุ่มเดารหัสผ่าน (Rate Limiting)
การล็อคระบบชั่วคราวเป็นเวลา 30 วินาที เมื่อกรอกรหัสผ่านผิดติดต่อกัน 5 ครั้ง

```javascript
const LOGIN_RATE_LIMIT = {
    maxAttempts: 5,           // อนุญาตให้ผิดได้ 5 ครั้ง
    lockoutDuration: 30000,   // ล็อคระบบ 30 วินาที
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
        // ครบเวลาปลดล็อค
        LOGIN_RATE_LIMIT.lockedUntil = null;
        LOGIN_RATE_LIMIT.attempts = 0;
        return false;
    }
    return true; // ยังถูกล็อคอยู่
};

/**
 * บันทึก failed login attempt
 */
window.recordFailedLogin = function () {
    LOGIN_RATE_LIMIT.attempts++;

    // ถ้าพยายามเข้าสู่ระบบผิดเกินจำนวนที่กำหนด จะทำการล็อค
    if (LOGIN_RATE_LIMIT.attempts >= LOGIN_RATE_LIMIT.maxAttempts) {
        LOGIN_RATE_LIMIT.lockedUntil = Date.now() + LOGIN_RATE_LIMIT.lockoutDuration;
        
        // (ส่วนของการแสดงเวลานับถอยหลังใน UI ถูกตัดออกในตัวอย่างนี้เพื่อความกระชับ)
    }
};

/**
 * Reset login attempts เมื่อ login สำเร็จ
 */
window.resetLoginAttempts = function () {
    LOGIN_RATE_LIMIT.attempts = 0;
    LOGIN_RATE_LIMIT.lockedUntil = null;
};
```
