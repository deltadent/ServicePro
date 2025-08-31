-- Simple bucket creation - company assets only
-- This migration only creates the essential company-assets bucket

-- Insert company-assets bucket (safe with ON CONFLICT)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- Ensure RLS is enabled (safe if already enabled)
DO $$
BEGIN
    -- Enable RLS on storage.objects (if not already enabled)
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = 'objects' AND n.nspname = 'storage' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;