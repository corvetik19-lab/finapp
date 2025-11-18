-- Remove unique constraint on (company_id, category, order_index)
-- This allows flexible reordering without conflicts
ALTER TABLE tender_stages
  DROP CONSTRAINT IF EXISTS tender_stages_company_id_category_order_index_key;

-- Optional: add a regular index to keep sorting efficient
CREATE INDEX IF NOT EXISTS idx_tender_stages_company_category_order
  ON tender_stages (company_id, category, order_index);
