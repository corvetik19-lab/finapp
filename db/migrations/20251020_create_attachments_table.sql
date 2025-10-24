-- =====================================================
-- Create attachments table for transaction files
-- =====================================================
-- Migration: 20251020_create_attachments_table
-- Description: Table for storing file metadata (files stored in Supabase Storage)

-- Create attachments table
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attachments_user_id ON attachments(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_attachments_transaction_id ON attachments(transaction_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_attachments_created_at ON attachments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attachments_deleted_at ON attachments(deleted_at);

-- Enable Row Level Security
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own attachments
CREATE POLICY "Users can view own attachments"
  ON attachments
  FOR SELECT
  TO public
  USING (user_id = auth.uid() AND deleted_at IS NULL);

-- RLS Policy: Users can insert their own attachments
CREATE POLICY "Users can create own attachments"
  ON attachments
  FOR INSERT
  TO public
  WITH CHECK (user_id = auth.uid());

-- RLS Policy: Users can update their own attachments
CREATE POLICY "Users can update own attachments"
  ON attachments
  FOR UPDATE
  TO public
  USING (user_id = auth.uid());

-- RLS Policy: Users can delete their own attachments
CREATE POLICY "Users can delete own attachments"
  ON attachments
  FOR DELETE
  TO public
  USING (user_id = auth.uid());

-- Add comment
COMMENT ON TABLE attachments IS 'Stores metadata for files attached to transactions. Actual files stored in Supabase Storage bucket "attachments"';
