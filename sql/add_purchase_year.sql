-- =====================================================
-- Migration: Add purchase_year to equipments table
-- Description: Stores the year the equipment was purchased
--              for equipment age tracking and maintenance planning
-- =====================================================

-- Add purchase_year column (stores just the year as integer, e.g. 2020)
ALTER TABLE equipments
ADD COLUMN IF NOT EXISTS purchase_year INTEGER;

-- Optional: Add a check constraint to ensure valid year range
ALTER TABLE equipments
ADD CONSTRAINT chk_purchase_year
CHECK (purchase_year IS NULL OR (purchase_year >= 1990 AND purchase_year <= EXTRACT(YEAR FROM NOW()) + 1));

-- Add a comment for documentation
COMMENT ON COLUMN equipments.purchase_year IS 'Year the equipment was purchased (e.g. 2020). Used to calculate equipment age for maintenance planning.';
