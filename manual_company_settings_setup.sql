-- Manual Company Settings Setup
-- Run this in Supabase SQL Editor

-- 1. Create company settings table
CREATE TABLE IF NOT EXISTS public.company_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name_en text NOT NULL DEFAULT 'ServicePro',
    company_name_ar text DEFAULT 'سيرفيس برو',
    vat_number text NULL,
    commercial_registration text NULL,
    business_type text DEFAULT 'company' CHECK (business_type IN ('individual', 'establishment', 'company', 'non_profit', 'government')),
    address_en text NULL,
    address_ar text NULL,
    city text NULL,
    region text NULL,
    postal_code text NULL,
    phone text NULL,
    email text NULL,
    website text NULL,
    logo_url text NULL,
    primary_color text DEFAULT '#3B82F6',
    secondary_color text DEFAULT '#64748B',
    zatca_environment text DEFAULT 'sandbox' CHECK (zatca_environment IN ('sandbox', 'production')),
    zatca_certificate_data text NULL,
    zatca_private_key text NULL,
    is_zatca_enabled boolean DEFAULT true,
    default_vat_rate numeric(5,4) DEFAULT 0.15,
    tax_registration_name text NULL,
    tax_registration_address text NULL,
    quote_validity_days integer DEFAULT 30,
    quote_number_prefix text DEFAULT 'QUO-',
    invoice_number_prefix text DEFAULT 'INV-',
    next_quote_number integer DEFAULT 1000,
    next_invoice_number integer DEFAULT 1000,
    default_quote_template text DEFAULT 'standard',
    default_invoice_template text DEFAULT 'standard',
    include_logo_in_pdf boolean DEFAULT true,
    pdf_footer_text text NULL,
    default_currency text DEFAULT 'SAR',
    date_format text DEFAULT 'DD/MM/YYYY',
    time_format text DEFAULT '24h',
    timezone text DEFAULT 'Asia/Riyadh',
    primary_language text DEFAULT 'en' CHECK (primary_language IN ('en', 'ar')),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    updated_by uuid REFERENCES auth.users(id)
);

-- 2. Create system config table
CREATE TABLE IF NOT EXISTS public.system_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key text UNIQUE NOT NULL,
    config_value jsonb NOT NULL,
    description text NULL,
    is_public boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 3. Create company templates table
CREATE TABLE IF NOT EXISTS public.company_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_settings_id uuid REFERENCES public.company_settings(id) ON DELETE CASCADE,
    template_type text NOT NULL CHECK (template_type IN ('quote', 'invoice', 'email')),
    template_name text NOT NULL,
    template_data jsonb NOT NULL,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(company_settings_id, template_type, template_name)
);

-- 4. Insert default company settings
INSERT INTO public.company_settings (
    company_name_en, company_name_ar, address_en, city, region, phone, email, default_vat_rate
) 
SELECT 'ServicePro', 'سيرفيس برو', 'Riyadh, Saudi Arabia', 'Riyadh', 'Riyadh', '+966501234567', 'info@servicepro.sa', 0.15
WHERE NOT EXISTS (SELECT 1 FROM public.company_settings LIMIT 1);

-- 5. Insert default system configs
INSERT INTO public.system_config (config_key, config_value, description, is_public) 
VALUES
    ('app_name', '"ServicePro"', 'Application name', true),
    ('app_version', '"1.0.0"', 'Application version', true),
    ('features_enabled', '{"quotes": true, "invoices": true, "zatca": true, "saudi_compliance": true}', 'Enabled features', false),
    ('notification_settings', '{"email_enabled": true, "whatsapp_enabled": true, "sms_enabled": false}', 'Notification preferences', false),
    ('maintenance_mode', 'false', 'Whether the app is in maintenance mode', true)
ON CONFLICT (config_key) DO NOTHING;

-- 6. Create functions
CREATE OR REPLACE FUNCTION public.get_company_settings()
RETURNS public.company_settings
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT * FROM public.company_settings WHERE is_active = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.update_company_settings(settings_data jsonb)
RETURNS public.company_settings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    result public.company_settings;
    current_user_id uuid := auth.uid();
BEGIN    
    UPDATE public.company_settings 
    SET 
        company_name_en = COALESCE((settings_data->>'company_name_en')::text, company_name_en),
        company_name_ar = COALESCE((settings_data->>'company_name_ar')::text, company_name_ar),
        vat_number = COALESCE((settings_data->>'vat_number')::text, vat_number),
        commercial_registration = COALESCE((settings_data->>'commercial_registration')::text, commercial_registration),
        business_type = COALESCE((settings_data->>'business_type')::text, business_type),
        address_en = COALESCE((settings_data->>'address_en')::text, address_en),
        address_ar = COALESCE((settings_data->>'address_ar')::text, address_ar),
        city = COALESCE((settings_data->>'city')::text, city),
        region = COALESCE((settings_data->>'region')::text, region),
        postal_code = COALESCE((settings_data->>'postal_code')::text, postal_code),
        phone = COALESCE((settings_data->>'phone')::text, phone),
        email = COALESCE((settings_data->>'email')::text, email),
        website = COALESCE((settings_data->>'website')::text, website),
        logo_url = COALESCE((settings_data->>'logo_url')::text, logo_url),
        primary_color = COALESCE((settings_data->>'primary_color')::text, primary_color),
        secondary_color = COALESCE((settings_data->>'secondary_color')::text, secondary_color),
        zatca_environment = COALESCE((settings_data->>'zatca_environment')::text, zatca_environment),
        is_zatca_enabled = COALESCE((settings_data->>'is_zatca_enabled')::boolean, is_zatca_enabled),
        default_vat_rate = COALESCE((settings_data->>'default_vat_rate')::numeric, default_vat_rate),
        tax_registration_name = COALESCE((settings_data->>'tax_registration_name')::text, tax_registration_name),
        tax_registration_address = COALESCE((settings_data->>'tax_registration_address')::text, tax_registration_address),
        quote_validity_days = COALESCE((settings_data->>'quote_validity_days')::integer, quote_validity_days),
        quote_number_prefix = COALESCE((settings_data->>'quote_number_prefix')::text, quote_number_prefix),
        invoice_number_prefix = COALESCE((settings_data->>'invoice_number_prefix')::text, invoice_number_prefix),
        default_quote_template = COALESCE((settings_data->>'default_quote_template')::text, default_quote_template),
        default_invoice_template = COALESCE((settings_data->>'default_invoice_template')::text, default_invoice_template),
        include_logo_in_pdf = COALESCE((settings_data->>'include_logo_in_pdf')::boolean, include_logo_in_pdf),
        pdf_footer_text = COALESCE((settings_data->>'pdf_footer_text')::text, pdf_footer_text),
        default_currency = COALESCE((settings_data->>'default_currency')::text, default_currency),
        date_format = COALESCE((settings_data->>'date_format')::text, date_format),
        time_format = COALESCE((settings_data->>'time_format')::text, time_format),
        timezone = COALESCE((settings_data->>'timezone')::text, timezone),
        primary_language = COALESCE((settings_data->>'primary_language')::text, primary_language),
        updated_at = now(),
        updated_by = current_user_id
    WHERE is_active = true
    RETURNING * INTO result;
    
    IF result.id IS NULL THEN
        INSERT INTO public.company_settings (company_name_en, created_by, updated_by)
        VALUES ('ServicePro', current_user_id, current_user_id)
        RETURNING * INTO result;
    END IF;
    
    RETURN result;
END;
$$;

-- 7. Enable RLS and create policies
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_templates ENABLE ROW LEVEL SECURITY;

-- Policies for company_settings
DROP POLICY IF EXISTS "Anyone can read company settings" ON public.company_settings;
CREATE POLICY "Anyone can read company settings" ON public.company_settings FOR SELECT USING (true);

-- Policies for system_config
DROP POLICY IF EXISTS "Public config readable by all" ON public.system_config;
CREATE POLICY "Public config readable by all" ON public.system_config FOR SELECT USING (is_public = true);

-- Policies for company_templates
DROP POLICY IF EXISTS "Anyone can read company templates" ON public.company_templates;
CREATE POLICY "Anyone can read company templates" ON public.company_templates FOR SELECT USING (true);

-- Grant permissions
GRANT SELECT ON public.company_settings TO authenticated;
GRANT SELECT ON public.system_config TO authenticated;
GRANT SELECT ON public.company_templates TO authenticated;
GRANT ALL ON public.company_settings TO authenticated;
GRANT ALL ON public.system_config TO authenticated;
GRANT ALL ON public.company_templates TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_company_settings(jsonb) TO authenticated;

-- Verify setup
SELECT 'Company Settings Setup Complete' as status, count(*) as company_settings_count FROM public.company_settings;
SELECT 'System Config Setup Complete' as status, count(*) as system_config_count FROM public.system_config;