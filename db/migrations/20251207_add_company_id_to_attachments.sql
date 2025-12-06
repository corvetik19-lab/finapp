-- Add company_id to attachments for company-scoped receipts
ALTER TABLE attachments
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;

-- Helpful index for filtering by company
CREATE INDEX IF NOT EXISTS idx_attachments_company_id ON attachments(company_id);

-- Keep user_id index for RLS/filters if missing
CREATE INDEX IF NOT EXISTS idx_attachments_user_id ON attachments(user_id);
