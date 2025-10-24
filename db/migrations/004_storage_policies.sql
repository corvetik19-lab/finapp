-- =====================================================
-- Storage Policies for attachments bucket
-- =====================================================
-- This migration creates RLS policies for the attachments bucket
-- Each user can only access files in their own folder (user_id/)

-- Policy 1: Users can upload own files (INSERT)
CREATE POLICY "Users can upload own files"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Users can view own files (SELECT)
CREATE POLICY "Users can view own files"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Users can update own files (UPDATE)
CREATE POLICY "Users can update own files"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Users can delete own files (DELETE)
CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
