-- ============================================
-- Borrow Requests System - Supabase Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Main requests table
CREATE TABLE IF NOT EXISTS borrow_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    note TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Request items table
CREATE TABLE IF NOT EXISTS borrow_request_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID REFERENCES borrow_requests(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    image TEXT DEFAULT '',
    category TEXT DEFAULT '',
    quantity INTEGER DEFAULT 1,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_at TIMESTAMPTZ,
    approved_by TEXT,
    rejection_reason TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_borrow_requests_user_id ON borrow_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_borrow_request_items_request_id ON borrow_request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_borrow_request_items_status ON borrow_request_items(status);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE borrow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrow_request_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies - Allow all operations via anon key (simple setup)
CREATE POLICY "Allow all for borrow_requests" ON borrow_requests
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for borrow_request_items" ON borrow_request_items
    FOR ALL USING (true) WITH CHECK (true);
