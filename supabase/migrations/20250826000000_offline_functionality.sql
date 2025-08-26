-- Migration: Add offline functionality tables and policies
-- Description: Creates job_notes, job_photos, and timesheets tables with RLS policies

-- Drop existing tables if they exist (from previous failed migration attempts)
DROP TABLE IF EXISTS timesheets CASCADE;
DROP TABLE IF EXISTS job_visits CASCADE;
DROP TABLE IF EXISTS job_photos CASCADE;
DROP TABLE IF EXISTS job_notes CASCADE;

-- Create job_notes table
CREATE TABLE job_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- Create job_photos table
CREATE TABLE job_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL,
    path TEXT NOT NULL,
    description TEXT,
    photo_type TEXT CHECK (photo_type IN ('before', 'during', 'after')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    storage_path TEXT
);

-- Create job_visits table for tracking job visits
CREATE TABLE job_visits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL,
    technician_id UUID NOT NULL,
    started_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create timesheets table for check-in/out tracking
CREATE TABLE timesheets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_visit_id UUID,
    event TEXT NOT NULL CHECK (event IN ('check_in', 'check_out')),
    ts TIMESTAMPTZ NOT NULL,
    lat NUMERIC,
    lng NUMERIC,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraints after table creation
ALTER TABLE job_notes ADD CONSTRAINT job_notes_job_id_fkey
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;

ALTER TABLE job_photos ADD CONSTRAINT job_photos_job_id_fkey
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;

ALTER TABLE job_visits ADD CONSTRAINT job_visits_job_id_fkey
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;

ALTER TABLE job_visits ADD CONSTRAINT job_visits_technician_id_fkey
    FOREIGN KEY (technician_id) REFERENCES auth.users(id);

ALTER TABLE timesheets ADD CONSTRAINT timesheets_job_visit_id_fkey
    FOREIGN KEY (job_visit_id) REFERENCES job_visits(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_job_notes_job_id ON job_notes(job_id);
CREATE INDEX IF NOT EXISTS idx_job_notes_created_at ON job_notes(created_at);
CREATE INDEX IF NOT EXISTS idx_job_photos_job_id ON job_photos(job_id);
CREATE INDEX IF NOT EXISTS idx_job_photos_created_at ON job_photos(created_at);
CREATE INDEX IF NOT EXISTS idx_job_visits_job_id ON job_visits(job_id);
CREATE INDEX IF NOT EXISTS idx_job_visits_technician_id ON job_visits(technician_id);
CREATE INDEX IF NOT EXISTS idx_job_visits_started_at ON job_visits(started_at);
CREATE INDEX IF NOT EXISTS idx_timesheets_job_visit_id ON timesheets(job_visit_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_ts ON timesheets(ts);
CREATE INDEX IF NOT EXISTS idx_timesheets_created_by ON timesheets(created_by);

-- Enable Row Level Security
ALTER TABLE job_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

-- Temporarily disable RLS for testing sync functionality
-- TODO: Re-enable with proper policies after sync is working

ALTER TABLE job_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets DISABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to perform operations during development
-- This will be replaced with proper RLS policies once sync is confirmed working

CREATE POLICY "Allow all operations for authenticated users" ON job_notes
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON job_photos
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON job_visits
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON timesheets
    FOR ALL USING (auth.role() = 'authenticated');

-- Create private storage bucket for job photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-photos', 'job-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for job-photos bucket
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Technicians can upload to their job photos" ON storage.objects;
DROP POLICY IF EXISTS "Technicians can view their job photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all job photos" ON storage.objects;

-- Allow authenticated users to upload to job-photos bucket (temporary for testing)
CREATE POLICY "Allow authenticated users to upload to job photos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'job-photos' AND
        auth.role() = 'authenticated'
    );

-- Allow authenticated users to view photos in job-photos bucket
CREATE POLICY "Allow authenticated users to view job photos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'job-photos' AND
        auth.role() = 'authenticated'
    );

-- Allow admins to manage all job photos
CREATE POLICY "Admins can manage all job photos" ON storage.objects
    FOR ALL USING (
        bucket_id = 'job-photos' AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );