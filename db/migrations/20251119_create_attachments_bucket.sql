-- =====================================================
-- Create attachments storage bucket
-- =====================================================
-- Migration: 20251119_create_attachments_bucket
-- Description: Creates the attachments bucket in Supabase Storage

-- Create the attachments bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  false,
  10485760, -- 10MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Comment
COMMENT ON TABLE storage.buckets IS 'Storage bucket for user attachments (receipts, documents)';
