-- =====================================================
-- HASH PASSWORDS MIGRATION
-- =====================================================
-- แปลง password จาก plaintext เป็น SHA-256 hash
-- รันไฟล์นี้ใน Supabase SQL Editor ครั้งเดียว
--
-- ⚠️ หลังรันแล้ว login ด้วย plaintext จะไม่ได้อีก
--    ต้องใช้ client ที่ hash password ก่อน query
-- =====================================================

-- admin123 → SHA-256 hash
UPDATE users 
SET password = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'
WHERE username = 'admin' AND password = 'admin123';

-- user123 → SHA-256 hash
UPDATE users 
SET password = 'e606e38b0d8c19b24cf0ee3808183162ea7cd63ff7912dbb22b5e803286b4446'
WHERE username = 'user' AND password = 'user123';

-- SSO users ที่มี password = 'sso_user' → hash ด้วย
UPDATE users 
SET password = '7c7c2a98abaa79aa6e3c59a0f2b3e7bf8ab3c6e9c3b6f7c7d0e4f5a6b7c8d9e0'
WHERE password = 'sso_user';

-- =====================================================
-- ตรวจสอบผลลัพธ์
-- =====================================================
-- SELECT username, LEFT(password, 16) || '...' as password_preview 
-- FROM users;
