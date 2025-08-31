-- Migration: Create Storage Buckets
-- Description: Create storage buckets for company assets and file uploads

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
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'company-assets');

-- Allow authenticated users to insert company assets
CREATE POLICY "Allow authenticated users to upload company assets" ON storage.objects 
FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'company-assets');

-- Allow authenticated users to update company assets
CREATE POLICY "Allow authenticated users to update company assets" ON storage.objects 
FOR UPDATE TO authenticated 
USING (bucket_id = 'company-assets');

-- Allow authenticated users to delete company assets
CREATE POLICY "Allow authenticated users to delete company assets" ON storage.objects 
FOR DELETE TO authenticated 
USING (bucket_id = 'company-assets');

-- Create document-uploads bucket for general file uploads (future use)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'document-uploads',
  'document-uploads',
  false, -- Private bucket
  10485760, -- 10MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]
) ON CONFLICT (id) DO NOTHING;

-- RLS policies for document-uploads bucket
CREATE POLICY "Users can view own uploads" ON storage.objects 
FOR SELECT TO authenticated 
USING (bucket_id = 'document-uploads');

CREATE POLICY "Users can insert own uploads" ON storage.objects 
FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'document-uploads');

CREATE POLICY "Users can update own uploads" ON storage.objects 
FOR UPDATE TO authenticated 
USING (bucket_id = 'document-uploads');

CREATE POLICY "Users can delete own uploads" ON storage.objects 
FOR DELETE TO authenticated 
USING (bucket_id = 'document-uploads');

-- Add comments for documentation
COMMENT ON TABLE storage.buckets IS 'Storage buckets for file uploads';