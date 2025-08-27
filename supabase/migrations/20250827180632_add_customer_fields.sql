-- Migration: Add customer fields for person/company, phone normalization, and communication settings
-- Description: Adds new columns for enhanced customer management with Saudi phone normalization

-- Add new columns to customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS first_name text NULL,
ADD COLUMN IF NOT EXISTS last_name text NULL,
ADD COLUMN IF NOT EXISTS company_name text NULL,
ADD COLUMN IF NOT EXISTS phone_mobile text NULL,
ADD COLUMN IF NOT EXISTS phone_work text NULL,
ADD COLUMN IF NOT EXISTS preferred_contact text NULL CHECK (preferred_contact IN ('mobile', 'work', 'email', 'whatsapp')),
ADD COLUMN IF NOT EXISTS email_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS tags text[] NULL,
ADD COLUMN IF NOT EXISTS country text NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_email_lower ON public.customers (lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_phone_mobile ON public.customers (phone_mobile) WHERE phone_mobile IS NOT NULL;

-- Backfill logic for existing customers
DO $$
DECLARE
    customer_record RECORD;
    name_parts text[];
    is_company boolean := false;
    normalized_phone text;
BEGIN
    -- Process each existing customer
    FOR customer_record IN SELECT * FROM public.customers WHERE first_name IS NULL AND last_name IS NULL AND company_name IS NULL
    LOOP
        -- Determine if name looks like a company or person
        -- If it contains exactly one space, treat as "First Last"
        -- Otherwise, treat as company name
        name_parts := string_to_array(trim(customer_record.name), ' ');

        IF array_length(name_parts, 1) = 2 AND name_parts[1] != '' AND name_parts[2] != '' THEN
            -- Looks like "First Last"
            UPDATE public.customers
            SET
                first_name = name_parts[1],
                last_name = name_parts[2]
            WHERE id = customer_record.id;
        ELSE
            -- Treat as company name
            UPDATE public.customers
            SET company_name = customer_record.name
            WHERE id = customer_record.id;
        END IF;

        -- Copy existing phone to phone_mobile for now (will be normalized later in app)
        IF customer_record.phone IS NOT NULL AND customer_record.phone != '' THEN
            UPDATE public.customers
            SET phone_mobile = customer_record.phone
            WHERE id = customer_record.id;
        END IF;

        -- Set preferred_contact based on available information
        IF customer_record.phone IS NOT NULL AND customer_record.phone != '' THEN
            UPDATE public.customers
            SET preferred_contact = 'mobile'
            WHERE id = customer_record.id;
        ELSE
            UPDATE public.customers
            SET preferred_contact = 'email'
            WHERE id = customer_record.id;
        END IF;

        -- Set country to Saudi Arabia if address exists and country is null
        IF (customer_record.short_address IS NOT NULL OR customer_record.address IS NOT NULL)
           AND customer_record.country IS NULL THEN
            UPDATE public.customers
            SET country = 'Saudi Arabia'
            WHERE id = customer_record.id;
        END IF;
    END LOOP;

    RAISE NOTICE 'Backfill completed for % customers', (SELECT COUNT(*) FROM public.customers WHERE first_name IS NOT NULL OR last_name IS NOT NULL OR company_name IS NOT NULL);
END $$;

-- Note: RLS policies for customers should be reviewed and updated based on your tenancy model
-- The existing codebase appears to use role-based access (admin vs non-admin)
-- You may need to add company_id column and update these policies for multi-tenant support

-- For now, enable RLS but don't create restrictive policies that might break existing functionality
-- This allows the migration to complete while preserving existing access patterns
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create basic policies that maintain existing access patterns
-- These can be updated once your tenancy model is clarified
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.customers;

CREATE POLICY "Allow all operations for authenticated users"
ON public.customers FOR ALL
USING (auth.role() = 'authenticated');

-- Add comment to document the new schema
COMMENT ON COLUMN public.customers.first_name IS 'First name for individual customers';
COMMENT ON COLUMN public.customers.last_name IS 'Last name for individual customers';
COMMENT ON COLUMN public.customers.company_name IS 'Company name for business customers';
COMMENT ON COLUMN public.customers.phone_mobile IS 'Mobile phone number in E.164 format (+966...)';
COMMENT ON COLUMN public.customers.phone_work IS 'Work phone number in E.164 format (+966...)';
COMMENT ON COLUMN public.customers.preferred_contact IS 'Preferred contact method: mobile, work, email, or whatsapp';
COMMENT ON COLUMN public.customers.email_enabled IS 'Whether email communication is enabled for this customer';
COMMENT ON COLUMN public.customers.whatsapp_enabled IS 'Whether WhatsApp communication is enabled for this customer';
COMMENT ON COLUMN public.customers.tags IS 'Array of tags for categorizing customers';
COMMENT ON COLUMN public.customers.country IS 'Country where the customer is located';