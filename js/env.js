// js/env.js
// ==========================================
// ENVIRONMENT CONFIGURATION
// ==========================================
// ⚠️ ไฟล์นี้จะถูก ignore โดย .gitignore
// สร้างไฟล์นี้ใหม่บน server โดยใส่ค่าจริง
// หรือใช้ Vercel Environment Variables
// ==========================================

const ENV = {
    // Supabase Configuration
    SUPABASE_URL: 'https://gzfzpkllhkuefmsktgor.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Znpwa2xsaGt1ZWZtc2t0Z29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxODA1OTUsImV4cCI6MjA3OTc1NjU5NX0.5gEU1AGANpYId9I8IXI90iSxYALXc0_oCGo9-wPjtq8',

    // EmailJS Configuration
    EMAILJS_PUBLIC_KEY: 'qtaXmNDcVNTOs8-RE',
    EMAILJS_SERVICE_ID: 'service_bnaqk1g',
    EMAILJS_APPROVAL_TEMPLATE: 'template_n5p48z8',
    EMAILJS_REMINDER_TEMPLATE: 'template_u6643nq'
};

// Make available globally
window.ENV = ENV;
