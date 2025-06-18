/*
  # Storage Bucket and Policies Setup

  1. Storage Bucket
    - Create project-documents bucket for file storage
    - Configure public access and file type restrictions
  
  2. Storage Policies
    - Public read access for document downloads
    - Authenticated user upload access
    - Admin management access
*/

-- Create the storage bucket for project documents
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at,
  updated_at
) VALUES (
  'project-documents',
  'project-documents',
  true, -- Public downloads
  10485760, -- 10MB file size limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Public read access policy for storage objects
CREATE POLICY IF NOT EXISTS "Public read access" ON storage.objects
FOR SELECT TO authenticated, anon
USING (bucket_id = 'project-documents');

-- Authenticated user upload policy
CREATE POLICY IF NOT EXISTS "Authenticated upload access" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'project-documents');

-- Authenticated user update policy
CREATE POLICY IF NOT EXISTS "Authenticated update access" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'project-documents')
WITH CHECK (bucket_id = 'project-documents');

-- Authenticated user delete policy
CREATE POLICY IF NOT EXISTS "Authenticated delete access" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'project-documents');