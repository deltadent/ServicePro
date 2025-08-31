-- Migration: Saudi Market Database Enhancements
-- Description: Add Saudi-specific business fields, VAT support, Arabic language, and ZATCA compliance

-- Add VAT and business registration fields for Saudi compliance
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS vat_number text NULL,
ADD COLUMN IF NOT EXISTS commercial_registration text NULL,
ADD COLUMN IF NOT EXISTS business_type text NULL CHECK (business_type IN ('individual', 'establishment', 'company', 'non_profit', 'government')),
ADD COLUMN IF NOT EXISTS saudi_id text NULL, -- National ID or Iqama number
ADD COLUMN IF NOT EXISTS arabic_name text NULL, -- Arabic name for invoices
ADD COLUMN IF NOT EXISTS arabic_address text NULL, -- Arabic address for invoices
ADD COLUMN IF NOT EXISTS tax_exempt boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS customer_category text NULL CHECK (customer_category IN ('b2b', 'b2c', 'vip', 'government')),
ADD COLUMN IF NOT EXISTS payment_terms_days integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS credit_limit numeric(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en' CHECK (preferred_language IN ('en', 'ar')),
ADD COLUMN IF NOT EXISTS region text NULL; -- Saudi regions like Riyadh, Makkah, Eastern Province, etc.

-- Create indexes for Saudi-specific fields
CREATE INDEX IF NOT EXISTS idx_customers_vat_number ON public.customers (vat_number) WHERE vat_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_commercial_registration ON public.customers (commercial_registration) WHERE commercial_registration IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_saudi_id ON public.customers (saudi_id) WHERE saudi_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_region ON public.customers (region) WHERE region IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_business_type ON public.customers (business_type) WHERE business_type IS NOT NULL;

-- Add quotes table Saudi enhancements if not already present
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS zatca_qr_code text NULL,
ADD COLUMN IF NOT EXISTS zatca_invoice_hash text NULL,
ADD COLUMN IF NOT EXISTS vat_rate numeric(5,4) DEFAULT 0.15, -- 15% Saudi VAT
ADD COLUMN IF NOT EXISTS vat_amount numeric(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS is_simplified_invoice boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS invoice_type text DEFAULT 'quote' CHECK (invoice_type IN ('quote', 'invoice', 'credit_note', 'debit_note')),
ADD COLUMN IF NOT EXISTS arabic_title text NULL,
ADD COLUMN IF NOT EXISTS arabic_description text NULL;

-- Create Saudi regions lookup table
CREATE TABLE IF NOT EXISTS public.saudi_regions (
    id serial PRIMARY KEY,
    name_en text NOT NULL,
    name_ar text NOT NULL,
    code text NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT now()
);

-- Insert Saudi regions
INSERT INTO public.saudi_regions (name_en, name_ar, code) VALUES
('Riyadh', 'الرياض', 'RY'),
('Makkah', 'مكة المكرمة', 'MK'),
('Eastern Province', 'الشرقية', 'EP'),
('Asir', 'عسير', 'AS'),
('Jazan', 'جازان', 'JZ'),
('Madinah', 'المدينة المنورة', 'MD'),
('Qassim', 'القصيم', 'QS'),
('Tabuk', 'تبوك', 'TB'),
('Hail', 'حائل', 'HL'),
('Northern Borders', 'الحدود الشمالية', 'NB'),
('Al Jawf', 'الجوف', 'JF'),
('Najran', 'نجران', 'NJ'),
('Al Bahah', 'الباحة', 'BH')
ON CONFLICT (code) DO NOTHING;

-- Create VAT rates table for ZATCA compliance
CREATE TABLE IF NOT EXISTS public.vat_rates (
    id serial PRIMARY KEY,
    rate_name text NOT NULL,
    rate_percentage numeric(5,4) NOT NULL,
    effective_from date NOT NULL,
    effective_to date NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- Insert Saudi VAT rates
INSERT INTO public.vat_rates (rate_name, rate_percentage, effective_from, is_default) VALUES
('Standard Rate', 0.15, '2018-01-01', true),
('Zero Rate', 0.00, '2018-01-01', false),
('Exempt', 0.00, '2018-01-01', false)
ON CONFLICT DO NOTHING;

-- Create business types lookup table
CREATE TABLE IF NOT EXISTS public.business_types (
    id serial PRIMARY KEY,
    type_code text NOT NULL UNIQUE,
    name_en text NOT NULL,
    name_ar text NOT NULL,
    requires_vat_registration boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- Insert Saudi business types
INSERT INTO public.business_types (type_code, name_en, name_ar, requires_vat_registration) VALUES
('individual', 'Individual', 'فرد', false),
('establishment', 'Individual Establishment', 'مؤسسة فردية', true),
('company', 'Company', 'شركة', true),
('non_profit', 'Non-Profit Organization', 'منظمة غير ربحية', false),
('government', 'Government Entity', 'جهة حكومية', false)
ON CONFLICT (type_code) DO NOTHING;

-- Function to validate Saudi VAT number format
CREATE OR REPLACE FUNCTION public.validate_saudi_vat_number(vat_number text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- Saudi VAT number format: 15 digits, starts with 3, ends with 03
    -- Example: 300123456789003
    IF vat_number IS NULL OR LENGTH(vat_number) != 15 THEN
        RETURN false;
    END IF;
    
    -- Check if it starts with 3 and ends with 03
    IF LEFT(vat_number, 1) != '3' OR RIGHT(vat_number, 2) != '03' THEN
        RETURN false;
    END IF;
    
    -- Check if it contains only digits
    IF vat_number !~ '^[0-9]+$' THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$;

-- Function to validate Saudi Commercial Registration
CREATE OR REPLACE FUNCTION public.validate_saudi_commercial_registration(cr_number text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- Saudi CR format: 10 digits
    IF cr_number IS NULL OR LENGTH(cr_number) != 10 THEN
        RETURN false;
    END IF;
    
    -- Check if it contains only digits
    IF cr_number !~ '^[0-9]+$' THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$;

-- Function to validate Saudi ID (National ID or Iqama)
CREATE OR REPLACE FUNCTION public.validate_saudi_id(id_number text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- Saudi National ID: 10 digits, starts with 1 for Saudi citizens, 2 for residents
    IF id_number IS NULL OR LENGTH(id_number) != 10 THEN
        RETURN false;
    END IF;
    
    -- Check if it starts with 1 or 2
    IF LEFT(id_number, 1) NOT IN ('1', '2') THEN
        RETURN false;
    END IF;
    
    -- Check if it contains only digits
    IF id_number !~ '^[0-9]+$' THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$;

-- Clean existing data before applying constraints
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

-- Add validation constraints (PostgreSQL compatible approach)
DO $$
BEGIN
    -- Add VAT number format constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'check_vat_number_format'
        AND table_name = 'customers'
    ) THEN
        ALTER TABLE public.customers
        ADD CONSTRAINT check_vat_number_format
        CHECK (vat_number IS NULL OR trim(vat_number) = '' OR public.validate_saudi_vat_number(trim(vat_number)));
    END IF;

    -- Add commercial registration format constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'check_commercial_registration_format'
        AND table_name = 'customers'
    ) THEN
        ALTER TABLE public.customers
        ADD CONSTRAINT check_commercial_registration_format
        CHECK (commercial_registration IS NULL OR trim(commercial_registration) = '' OR public.validate_saudi_commercial_registration(trim(commercial_registration)));
    END IF;

    -- Add Saudi ID format constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'check_saudi_id_format'
        AND table_name = 'customers'
    ) THEN
        ALTER TABLE public.customers
        ADD CONSTRAINT check_saudi_id_format
        CHECK (saudi_id IS NULL OR trim(saudi_id) = '' OR public.validate_saudi_id(trim(saudi_id)));
    END IF;
END
$$;

-- Function to format Saudi phone numbers to E.164 format (+966...)
CREATE OR REPLACE FUNCTION public.format_saudi_phone_number(phone_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    cleaned_phone text;
BEGIN
    -- Remove all non-digit characters
    cleaned_phone := regexp_replace(phone_input, '[^0-9]', '', 'g');
    
    -- If it's already in international format (starts with 966)
    IF cleaned_phone ~ '^966' THEN
        RETURN '+' || cleaned_phone;
    END IF;
    
    -- If it starts with 0 (local format), remove the 0 and add +966
    IF cleaned_phone ~ '^0' THEN
        RETURN '+966' || substring(cleaned_phone from 2);
    END IF;
    
    -- If it's 9 digits starting with 5 (mobile) or others, add +966
    IF LENGTH(cleaned_phone) = 9 AND cleaned_phone ~ '^[5789]' THEN
        RETURN '+966' || cleaned_phone;
    END IF;
    
    -- Return as is if we can't format it properly
    RETURN phone_input;
END;
$$;

-- Create trigger function to auto-format Saudi phone numbers
CREATE OR REPLACE FUNCTION public.format_customer_phone_numbers()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Format mobile phone number
    IF NEW.phone_mobile IS NOT NULL AND NEW.phone_mobile != '' THEN
        NEW.phone_mobile := public.format_saudi_phone_number(NEW.phone_mobile);
    END IF;
    
    -- Format work phone number
    IF NEW.phone_work IS NOT NULL AND NEW.phone_work != '' THEN
        NEW.phone_work := public.format_saudi_phone_number(NEW.phone_work);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Add trigger for phone number formatting
DROP TRIGGER IF EXISTS format_phone_numbers ON public.customers;
CREATE TRIGGER format_phone_numbers
    BEFORE INSERT OR UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.format_customer_phone_numbers();

-- Create function to generate ZATCA QR code data
CREATE OR REPLACE FUNCTION public.generate_zatca_qr_data(
    seller_name text,
    vat_number text,
    invoice_date timestamp,
    total_amount numeric,
    vat_amount numeric
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    qr_data text;
BEGIN
    -- ZATCA QR code format (Base64 encoded TLV)
    -- This is a simplified version - in production you'd use proper TLV encoding
    qr_data := json_build_object(
        'seller_name', seller_name,
        'vat_number', vat_number,
        'invoice_date', to_char(invoice_date, 'YYYY-MM-DD HH24:MI:SS'),
        'total_amount', total_amount,
        'vat_amount', vat_amount
    )::text;
    
    -- In production, this would be properly encoded as TLV and Base64
    RETURN encode(qr_data::bytea, 'base64');
END;
$$;

-- Update RLS policies for new tables
ALTER TABLE public.saudi_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vat_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_types ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read lookup tables
CREATE POLICY "Allow authenticated users to read saudi_regions"
ON public.saudi_regions FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read vat_rates"
ON public.vat_rates FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read business_types"
ON public.business_types FOR SELECT
USING (auth.role() = 'authenticated');

-- Only admins can modify lookup tables
CREATE POLICY "Allow admins to manage saudi_regions"
ON public.saudi_regions FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Allow admins to manage vat_rates"
ON public.vat_rates FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Allow admins to manage business_types"
ON public.business_types FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Add comments for documentation
COMMENT ON COLUMN public.customers.vat_number IS 'Saudi VAT registration number (15 digits, format: 3XXXXXXXXXX03)';
COMMENT ON COLUMN public.customers.commercial_registration IS 'Saudi Commercial Registration number (10 digits)';
COMMENT ON COLUMN public.customers.business_type IS 'Type of business entity in Saudi Arabia';
COMMENT ON COLUMN public.customers.saudi_id IS 'Saudi National ID (citizens start with 1) or Iqama number (residents start with 2)';
COMMENT ON COLUMN public.customers.arabic_name IS 'Customer name in Arabic for official documents';
COMMENT ON COLUMN public.customers.arabic_address IS 'Customer address in Arabic for invoices';
COMMENT ON COLUMN public.customers.tax_exempt IS 'Whether the customer is exempt from VAT';
COMMENT ON COLUMN public.customers.customer_category IS 'Customer category for business segmentation';
COMMENT ON COLUMN public.customers.payment_terms_days IS 'Payment terms in days for invoices';
COMMENT ON COLUMN public.customers.credit_limit IS 'Credit limit in SAR for the customer';
COMMENT ON COLUMN public.customers.preferred_language IS 'Preferred language for communications (en/ar)';
COMMENT ON COLUMN public.customers.region IS 'Saudi region/province where customer is located';

COMMENT ON TABLE public.saudi_regions IS 'Lookup table for Saudi Arabia administrative regions';
COMMENT ON TABLE public.vat_rates IS 'VAT rates for ZATCA compliance and tax calculations';
COMMENT ON TABLE public.business_types IS 'Business entity types recognized in Saudi Arabia';

-- Create function to get customer statistics by region
CREATE OR REPLACE FUNCTION public.get_customer_stats_by_region()
RETURNS TABLE (
    region_name text,
    customer_count bigint,
    active_customers bigint,
    business_customers bigint,
    total_credit_limit numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        COALESCE(sr.name_en, c.region, 'Unknown') as region_name,
        COUNT(*) as customer_count,
        COUNT(*) FILTER (WHERE c.is_active = true) as active_customers,
        COUNT(*) FILTER (WHERE c.customer_type = 'commercial') as business_customers,
        COALESCE(SUM(c.credit_limit), 0) as total_credit_limit
    FROM public.customers c
    LEFT JOIN public.saudi_regions sr ON sr.name_en = c.region
    WHERE (public.is_admin() OR c.is_active = true)
    GROUP BY sr.name_en, c.region
    ORDER BY customer_count DESC;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.validate_saudi_vat_number(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_saudi_commercial_registration(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_saudi_id(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.format_saudi_phone_number(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_zatca_qr_data(text, text, timestamp, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_stats_by_region() TO authenticated;