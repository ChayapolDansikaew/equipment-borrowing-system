-- Penalty System Tables
-- สำหรับระบบบทลงโทษ (Hybrid: Strike + ชดใช้)

-- =====================================================
-- ตาราง penalties - บันทึกทุกครั้งที่มีความผิด
-- =====================================================
CREATE TABLE IF NOT EXISTS penalties (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,           -- username ของผู้กระทำผิด
    transaction_id INTEGER REFERENCES transactions(id),
    equipment_id INTEGER REFERENCES equipments(id),
    
    -- ประเภทความผิด
    penalty_type VARCHAR(50) NOT NULL,       -- 'late_return', 'minor_damage', 'major_damage', 'lost'
    severity VARCHAR(20) NOT NULL,           -- 'low', 'medium', 'high', 'critical'
    days_late INTEGER DEFAULT 0,             -- จำนวนวันที่ล่าช้า (ถ้าเป็น late_return)
    
    -- รายละเอียด
    description TEXT,                         -- อธิบายความเสียหาย
    strikes_given INTEGER DEFAULT 0,          -- จำนวน strike ที่ได้รับ
    compensation_amount DECIMAL(10,2) DEFAULT 0, -- ค่าชดใช้ (ถ้ามี)
    compensation_status VARCHAR(20) DEFAULT 'none', -- 'none', 'pending', 'paid', 'waived'
    
    -- ข้อมูลการสร้าง
    created_by VARCHAR(255),                  -- admin ที่บันทึก
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT                                -- หมายเหตุเพิ่มเติม
);

-- =====================================================
-- เพิ่ม columns ใน users table
-- =====================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_strikes INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- =====================================================
-- RLS Policies สำหรับ penalties
-- =====================================================
ALTER TABLE penalties ENABLE ROW LEVEL SECURITY;

-- ทุกคนอ่านได้ (สำหรับดูประวัติตัวเอง)
CREATE POLICY "Users can view own penalties" 
ON penalties FOR SELECT 
USING (true);

-- Admin เพิ่มได้
CREATE POLICY "Admins can insert penalties" 
ON penalties FOR INSERT 
WITH CHECK (true);

-- Admin อัปเดตได้
CREATE POLICY "Admins can update penalties" 
ON penalties FOR UPDATE 
USING (true);

-- =====================================================
-- Indexes สำหรับ performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_penalties_user_id ON penalties(user_id);
CREATE INDEX IF NOT EXISTS idx_penalties_created_at ON penalties(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON users(is_banned);
