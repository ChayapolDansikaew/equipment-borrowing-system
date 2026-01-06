-- ===========================================
-- IMPROVED RLS POLICIES
-- ===========================================
-- สำหรับ Equipment Borrowing System
-- พร้อมรองรับ Chula SSO integration ในอนาคต
-- 
-- วิธีใช้: รันใน Supabase SQL Editor
-- ===========================================

-- 1. ลบ Policies เก่าที่ไม่ปลอดภัย
-- -------------------------------------------
DROP POLICY IF EXISTS "Public read users" ON users;
DROP POLICY IF EXISTS "Public access equipments" ON equipments;
DROP POLICY IF EXISTS "Public access transactions" ON transactions;

-- ลบ policies ใหม่ถ้ามีอยู่แล้ว (กันซ้ำ)
DROP POLICY IF EXISTS "Users - Read own or for demo login" ON users;
DROP POLICY IF EXISTS "Users - No client modifications" ON users;
DROP POLICY IF EXISTS "Users - No client updates" ON users;
DROP POLICY IF EXISTS "Users - No client deletes" ON users;
DROP POLICY IF EXISTS "Equipments - Public read" ON equipments;
DROP POLICY IF EXISTS "Equipments - Write access" ON equipments;
DROP POLICY IF EXISTS "Equipments - Update access" ON equipments;
DROP POLICY IF EXISTS "Equipments - Delete access" ON equipments;
DROP POLICY IF EXISTS "Transactions - Public read" ON transactions;
DROP POLICY IF EXISTS "Transactions - Insert for borrowing" ON transactions;
DROP POLICY IF EXISTS "Transactions - Update for returns" ON transactions;
DROP POLICY IF EXISTS "Transactions - No delete" ON transactions;

-- ===========================================
-- USERS TABLE POLICIES
-- ===========================================

-- Users: อ่านได้ (สำหรับ login check)
CREATE POLICY "Users - Read own or for demo login" 
ON users FOR SELECT 
USING (true);

-- Users: ห้าม insert จาก client
CREATE POLICY "Users - No client modifications" 
ON users FOR INSERT 
WITH CHECK (false);

-- Users: ห้าม update จาก client
CREATE POLICY "Users - No client updates" 
ON users FOR UPDATE 
USING (false);

-- Users: ห้าม delete จาก client
CREATE POLICY "Users - No client deletes" 
ON users FOR DELETE 
USING (false);

-- ===========================================
-- EQUIPMENTS TABLE POLICIES  
-- ===========================================

-- Equipments: ทุกคนดูได้
CREATE POLICY "Equipments - Public read" 
ON equipments FOR SELECT 
USING (true);

-- Equipments: เพิ่มได้ (admin check ที่ app level)
CREATE POLICY "Equipments - Write access" 
ON equipments FOR INSERT 
WITH CHECK (true);

-- Equipments: แก้ไขได้ (admin check ที่ app level)
CREATE POLICY "Equipments - Update access" 
ON equipments FOR UPDATE 
USING (true);

-- Equipments: ลบได้ (admin check ที่ app level)
CREATE POLICY "Equipments - Delete access" 
ON equipments FOR DELETE 
USING (true);

-- ===========================================
-- TRANSACTIONS TABLE POLICIES
-- ===========================================

-- Transactions: ทุกคนดูได้
CREATE POLICY "Transactions - Public read" 
ON transactions FOR SELECT 
USING (true);

-- Transactions: สร้างได้ (สำหรับการยืม)
CREATE POLICY "Transactions - Insert for borrowing" 
ON transactions FOR INSERT 
WITH CHECK (true);

-- Transactions: แก้ไขได้ (สำหรับการคืน)
CREATE POLICY "Transactions - Update for returns" 
ON transactions FOR UPDATE 
USING (true);

-- Transactions: ห้ามลบ (เก็บเป็น history)
CREATE POLICY "Transactions - No delete" 
ON transactions FOR DELETE 
USING (false);

-- ===========================================
-- สรุปการเปลี่ยนแปลง
-- ===========================================
-- 
-- ✅ ป้องกันการ DELETE transactions (เก็บ history)
-- ✅ ป้องกันการแก้ไข users table จาก client
-- ✅ เตรียม structure สำหรับ SSO integration
--
-- ⚠️ หลัง Chula SSO Integration:
-- - สามารถใช้ custom claims หรือ JWT token
-- - แก้ policies ให้ check role จาก token ได้
-- ===========================================
