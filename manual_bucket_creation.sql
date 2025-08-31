-- Manual Storage Bucket Creation
-- Execute this in your Supabase SQL Editor to create the company-assets bucket

-- Create company-assets bucket for logos and branding
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for company-assets bucket
-- Enable RLS first
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload company assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update company assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete company assets" ON storage.objects;

-- Create policies
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'company-assets');

CREATE POLICY "Allow authenticated users to upload company assets" ON storage.objects 
FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'company-assets');

CREATE POLICY "Allow authenticated users to update company assets" ON storage.objects 
FOR UPDATE TO authenticated 
USING (bucket_id = 'company-assets');

CREATE POLICY "Allow authenticated users to delete company assets" ON storage.objects 
FOR DELETE TO authenticated 
USING (bucket_id = 'company-assets');

-- Verify the bucket was created
SELECT * FROM storage.buckets WHERE id = 'company-assets';