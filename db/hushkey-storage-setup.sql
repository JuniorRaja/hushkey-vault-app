-- Storage Bucket Setup for File Attachments
-- Run this in Supabase SQL Editor

-- Create storage bucket (if not exists via UI, create it there as 'hushkey-vault')
-- Then run these policies:

-- Allow authenticated users to upload files to their own folders
INSERT INTO storage.buckets (id, name, public)
VALUES ('hushkey-vault', 'hushkey-vault', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload to their own user folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'hushkey-vault' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can read from their own user folder
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'hushkey-vault' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete from their own user folder
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'hushkey-vault' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own files
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'hushkey-vault' AND
  (storage.foldername(name))[1] = auth.uid()::text
);