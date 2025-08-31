# Storage Setup Instructions

## Required Storage Buckets

To enable file uploads in ServicePro, you need to create the following storage buckets in your Supabase dashboard:

### 1. Company Assets Bucket (Required for Logo Upload)

1. Go to your Supabase Dashboard
2. Navigate to **Storage** section
3. Click **"Create bucket"**
4. Configure as follows:
   - **Name**: `company-assets`
   - **Public**: ✅ **Yes** (Enable public access)
   - **File size limit**: `5 MB`
   - **Allowed MIME types**: 
     - `image/jpeg`
     - `image/png`
     - `image/gif`
     - `image/webp`
     - `image/svg+xml`

### 2. Document Uploads Bucket (Future use)

1. Click **"Create bucket"** again
2. Configure as follows:
   - **Name**: `document-uploads`
   - **Public**: ❌ **No** (Private bucket)
   - **File size limit**: `10 MB`
   - **Allowed MIME types**:
     - `application/pdf`
     - `application/msword`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
     - `image/jpeg`
     - `image/png`
     - `image/gif`
     - `image/webp`

## RLS Policies

The buckets should automatically inherit the correct Row Level Security policies. If you need to set them manually:

### Company Assets Policies
```sql
-- Allow public read access
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'company-assets');

-- Allow authenticated users to manage company assets
CREATE POLICY "Allow authenticated users to upload company assets" ON storage.objects 
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company-assets');

CREATE POLICY "Allow authenticated users to update company assets" ON storage.objects 
FOR UPDATE TO authenticated USING (bucket_id = 'company-assets');

CREATE POLICY "Allow authenticated users to delete company assets" ON storage.objects 
FOR DELETE TO authenticated USING (bucket_id = 'company-assets');
```

## Verification

After creating the buckets:

1. Go to **Settings** → **Company Profile**
2. Try uploading a logo
3. You should see the logo appear in the preview
4. Check the **Storage** section to see the uploaded file

## Troubleshooting

- **"Bucket not found" error**: Make sure the bucket name is exactly `company-assets`
- **Upload fails**: Check file size (max 5MB) and file type (images only)
- **Cannot see uploaded logo**: Ensure the bucket is set to **Public**