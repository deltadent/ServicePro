-- Enable RLS on all relevant public tables (idempotent)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Harden functions with explicit search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'worker')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_job_total_cost(job_uuid uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT SUM(total_cost) FROM public.job_parts WHERE job_id = job_uuid), 0
  ) + COALESCE(
    (SELECT SUM(amount) FROM public.job_fees WHERE job_id = job_uuid), 0
  );
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_job_total_cost()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.jobs 
  SET total_cost = calculate_job_total_cost(
    CASE 
      WHEN TG_TABLE_NAME = 'job_parts' THEN COALESCE(NEW.job_id, OLD.job_id)
      WHEN TG_TABLE_NAME = 'job_fees' THEN COALESCE(NEW.job_id, OLD.job_id)
    END
  )
  WHERE id = CASE 
    WHEN TG_TABLE_NAME = 'job_parts' THEN COALESCE(NEW.job_id, OLD.job_id)
    WHEN TG_TABLE_NAME = 'job_fees' THEN COALESCE(NEW.job_id, OLD.job_id)
  END;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create helper for role checks (avoids recursive policies)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

-- Fix profiles policies to avoid recursion and duplicates
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admins can manage all profiles"
ON public.profiles FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Ensure auth trigger for profile creation exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update "updated_at" triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_jobs_updated_at ON public.jobs;
CREATE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_parts_inventory_updated_at ON public.parts_inventory;
CREATE TRIGGER update_parts_inventory_updated_at
BEFORE UPDATE ON public.parts_inventory
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_job_templates_updated_at ON public.job_templates;
CREATE TRIGGER update_job_templates_updated_at
BEFORE UPDATE ON public.job_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Keep job total_cost in sync
DROP TRIGGER IF EXISTS update_jobs_total_cost_from_parts ON public.job_parts;
CREATE TRIGGER update_jobs_total_cost_from_parts
AFTER INSERT OR UPDATE OR DELETE ON public.job_parts
FOR EACH ROW EXECUTE FUNCTION public.update_job_total_cost();

DROP TRIGGER IF EXISTS update_jobs_total_cost_from_fees ON public.job_fees;
CREATE TRIGGER update_jobs_total_cost_from_fees
AFTER INSERT OR UPDATE OR DELETE ON public.job_fees
FOR EACH ROW EXECUTE FUNCTION public.update_job_total_cost();

-- Strengthen job_photos table for private storage usage
ALTER TABLE public.job_photos ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE public.job_photos ALTER COLUMN photo_url DROP NOT NULL;

-- Make the storage bucket private
UPDATE storage.buckets SET public = false WHERE id = 'job_photos';

-- Storage policies for job_photos bucket
DROP POLICY IF EXISTS "Admins can manage job_photos bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload to job_photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their job photos via metadata" ON storage.objects;

CREATE POLICY "Admins can manage job_photos bucket"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'job_photos' AND public.is_admin())
WITH CHECK (bucket_id = 'job_photos' AND public.is_admin());

CREATE POLICY "Authenticated can upload to job_photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'job_photos');

CREATE POLICY "Users can read their job photos via metadata"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'job_photos'
  AND EXISTS (
    SELECT 1
    FROM public.job_photos jp
    JOIN public.jobs j ON j.id = jp.job_id
    WHERE jp.storage_path = name
      AND (j.technician_id = auth.uid() OR public.is_admin())
  )
);