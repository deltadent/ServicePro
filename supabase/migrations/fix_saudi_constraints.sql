-- Fix Saudi Market Constraint Issues
-- This script cleans existing data and adds proper constraints

-- Clean existing data that violates constraints
UPDATE public.customers
SET vat_number = NULL
WHERE vat_number IS NOT NULL
  AND trim(vat_number) != ''
  AND NOT public.validate_saudi_vat_number(trim(vat_number));

UPDATE public.customers
SET commercial_registration = NULL
WHERE commercial_registration IS NOT NULL
  AND trim(commercial_registration) != ''
  AND NOT public.validate_saudi_commercial_registration(trim(commercial_registration));

UPDATE public.customers
SET saudi_id = NULL
WHERE saudi_id IS NOT NULL
  AND trim(saudi_id) != ''
  AND NOT public.validate_saudi_id(trim(saudi_id));

-- Drop existing constraints if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'check_vat_number_format' AND table_name = 'customers') THEN
        ALTER TABLE public.customers DROP CONSTRAINT check_vat_number_format;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'check_commercial_registration_format' AND table_name = 'customers') THEN
        ALTER TABLE public.customers DROP CONSTRAINT check_commercial_registration_format;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'check_saudi_id_format' AND table_name = 'customers') THEN
        ALTER TABLE public.customers DROP CONSTRAINT check_saudi_id_format;
    END IF;
END $$;

-- Add updated constraints that allow empty strings
DO $$
BEGIN
    -- Add VAT number format constraint
    ALTER TABLE public.customers
    ADD CONSTRAINT check_vat_number_format
    CHECK (vat_number IS NULL OR trim(vat_number) = '' OR public.validate_saudi_vat_number(trim(vat_number)));

    -- Add commercial registration format constraint
    ALTER TABLE public.customers
    ADD CONSTRAINT check_commercial_registration_format
    CHECK (commercial_registration IS NULL OR trim(commercial_registration) = '' OR public.validate_saudi_commercial_registration(trim(commercial_registration)));

    -- Add Saudi ID format constraint
    ALTER TABLE public.customers
    ADD CONSTRAINT check_saudi_id_format
    CHECK (saudi_id IS NULL OR trim(saudi_id) = '' OR public.validate_saudi_id(trim(saudi_id)));
END $$;