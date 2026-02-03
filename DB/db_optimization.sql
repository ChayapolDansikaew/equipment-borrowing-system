-- ============================================================
-- Database Optimization
-- Based on: supabase-postgres-best-practices skill
-- ============================================================

-- ============================================================
-- 1. MISSING FK INDEXES (CRITICAL - 10-100x faster JOINs)
-- ============================================================
-- Reference: schema-foreign-key-indexes.md
-- 
-- transactions.equipment_id references equipments(id) 
-- แต่ไม่มี index! ทำให้ JOIN และ CASCADE ช้า

CREATE INDEX IF NOT EXISTS idx_transactions_equipment_id 
ON transactions(equipment_id);

-- penalties.transaction_id และ equipment_id ก็ต้อง index
CREATE INDEX IF NOT EXISTS idx_penalties_transaction_id 
ON penalties(transaction_id);

CREATE INDEX IF NOT EXISTS idx_penalties_equipment_id 
ON penalties(equipment_id);


-- ============================================================
-- 2. PARTIAL INDEXES (HIGH - 5-20x smaller, faster)
-- ============================================================
-- Reference: query-partial-indexes.md
--
-- ใช้สำหรับ queries ที่ filter บ่อยๆ เช่น status='active'

-- Index only active transactions (ค้นหาบ่อยที่สุด)
CREATE INDEX IF NOT EXISTS idx_transactions_active 
ON transactions(equipment_id, borrower_name) 
WHERE status = 'active';

-- Index only available equipment
CREATE INDEX IF NOT EXISTS idx_equipments_available 
ON equipments(type, name) 
WHERE status = 'available';

-- Index only banned users (ตรวจสอบตอน borrow)
CREATE INDEX IF NOT EXISTS idx_users_banned 
ON users(username) 
WHERE is_banned = true;


-- ============================================================
-- 3. COMPOSITE INDEXES (for common multi-column queries)
-- ============================================================
-- Reference: query-composite-indexes.md

-- ค้นหา transactions ตาม borrower + status
CREATE INDEX IF NOT EXISTS idx_transactions_borrower_status 
ON transactions(borrower_name, status);

-- ค้นหา equipments ตาม type + status
CREATE INDEX IF NOT EXISTS idx_equipments_type_status 
ON equipments(type, status);


-- ============================================================
-- 4. DATE RANGE QUERIES
-- ============================================================
-- สำหรับ analytics dashboard (weekly borrowings)

CREATE INDEX IF NOT EXISTS idx_transactions_borrow_date 
ON transactions(borrow_date DESC);


-- ============================================================
-- VERIFICATION: Check indexes were created
-- ============================================================
-- Run this to verify:
-- SELECT indexname, tablename FROM pg_indexes 
-- WHERE schemaname = 'public' ORDER BY tablename;
