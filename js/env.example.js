// js/env.example.js
// ==========================================
// ENVIRONMENT CONFIGURATION TEMPLATE
// ==========================================
// คัดลอกไฟล์นี้เป็น env.js และใส่ค่าจริง
// ==========================================

const ENV = {
    // Supabase Configuration
    // ดูได้จาก: Supabase Dashboard > Settings > API
    SUPABASE_URL: 'YOUR_SUPABASE_URL',
    SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',

    // EmailJS Configuration
    // ดูได้จาก: EmailJS Dashboard > Account > API Keys
    EMAILJS_PUBLIC_KEY: 'YOUR_EMAILJS_PUBLIC_KEY',
    EMAILJS_SERVICE_ID: 'YOUR_EMAILJS_SERVICE_ID',
    EMAILJS_APPROVAL_TEMPLATE: 'YOUR_EMAILJS_TEMPLATE_ID',
    EMAILJS_REMINDER_TEMPLATE: 'YOUR_EMAILJS_TEMPLATE_ID'
};

// Make available globally
window.ENV = ENV;
