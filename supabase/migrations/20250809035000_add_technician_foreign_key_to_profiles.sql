ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS technician_id UUID REFERENCES public.profiles(id);
