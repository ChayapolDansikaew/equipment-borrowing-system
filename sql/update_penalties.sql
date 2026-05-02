-- ============================================
-- Penalties Table Update: Add no_show support
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add index for efficient aggregation queries on penalty_type
CREATE INDEX IF NOT EXISTS idx_penalties_type_created ON penalties(penalty_type, created_at);

-- 2. (Optional) If your penalty_type has a CHECK constraint, uncomment and update it:
-- ALTER TABLE penalties DROP CONSTRAINT IF EXISTS penalties_penalty_type_check;
-- ALTER TABLE penalties ADD CONSTRAINT penalties_penalty_type_check
--     CHECK (penalty_type IN ('late_return', 'no_show', 'minor_damage', 'major_damage', 'severe_damage', 'lost'));

-- 3. Migration note:
-- If any existing records that represent "user didn't pick up reserved equipment"
-- were previously stored as penalty_type = 'late_return', you can update them manually:
-- UPDATE penalties
--    SET penalty_type = 'no_show',
--        days_late = 0,
--        description = COALESCE(description, '') || ' [MIGRATED: was late_return]'
--  WHERE id IN (...list of known no_show record IDs...);
