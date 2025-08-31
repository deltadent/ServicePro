-- Migration: Company Settings and Business Profile
-- Description: Add comprehensive company settings for ZATCA compliance and professional operations

-- Create company settings table
CREATE TABLE IF NOT EXISTS public.company_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic Company Information
    company_name_en text NOT NULL DEFAULT 'ServicePro',
    company_name_ar text DEFAULT 'سيرفيس برو',
    
    -- Business Registration
    vat_number text NULL, -- Company's VAT registration number
    commercial_registration text NULL, -- Company's CR number
    business_type text DEFAULT 'company' CHECK (business_type IN ('individual', 'establishment', 'company', 'non_profit', 'government')),
    
    -- Contact Information
    address_en text NULL,
    address_ar text NULL,
    city text NULL,
    region text NULL, -- Saudi region
    postal_code text NULL,
    phone text NULL,
    email text NULL,
    website text NULL,
    
    -- Visual Branding
    logo_url text NULL, -- Company logo URL
    primary_color text DEFAULT '#3B82F6', -- Brand primary color
    secondary_color text DEFAULT '#64748B', -- Brand secondary color
    
    -- ZATCA Configuration
    zatca_environment text DEFAULT 'sandbox' CHECK (zatca_environment IN ('sandbox', 'production')),
    zatca_certificate_data text NULL, -- Base64 encoded certificate (future use)
    zatca_private_key text NULL, -- Encrypted private key (future use)
    is_zatca_enabled boolean DEFAULT true,
    
    -- Tax Configuration
    default_vat_rate numeric(5,4) DEFAULT 0.15, -- 15% Saudi VAT
    tax_registration_name text NULL, -- Name for tax documents
    tax_registration_address text NULL, -- Address for tax documents
    
    -- Invoice/Quote Settings
    quote_validity_days integer DEFAULT 30,
    quote_number_prefix text DEFAULT 'QUO-',
    invoice_number_prefix text DEFAULT 'INV-',
    next_quote_number integer DEFAULT 1000,
    next_invoice_number integer DEFAULT 1000,
    
    -- Template Settings
    default_quote_template text DEFAULT 'standard',
    default_invoice_template text DEFAULT 'standard',
    include_logo_in_pdf boolean DEFAULT true,
    pdf_footer_text text NULL,
    
    -- Regional Settings
    default_currency text DEFAULT 'SAR',
    date_format text DEFAULT 'DD/MM/YYYY',
    time_format text DEFAULT '24h',
    timezone text DEFAULT 'Asia/Riyadh',
    primary_language text DEFAULT 'en' CHECK (primary_language IN ('en', 'ar')),
    
    -- System Settings
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    updated_by uuid REFERENCES auth.users(id)
);

-- Create index for active company settings
CREATE INDEX IF NOT EXISTS idx_company_settings_active ON public.company_settings (is_active) WHERE is_active = true;

-- Create function to ensure only one active company settings record
CREATE OR REPLACE FUNCTION public.ensure_single_active_company_settings()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- If we're setting a record to active, deactivate all others
    IF NEW.is_active = true THEN
        UPDATE public.company_settings 
        SET is_active = false, updated_at = now()
        WHERE id != NEW.id AND is_active = true;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger to ensure only one active company settings
DROP TRIGGER IF EXISTS ensure_single_active_company_settings ON public.company_settings;
CREATE TRIGGER ensure_single_active_company_settings
    BEFORE INSERT OR UPDATE ON public.company_settings
    FOR EACH ROW EXECUTE FUNCTION public.ensure_single_active_company_settings();

-- Insert default company settings if none exist
INSERT INTO public.company_settings (
    company_name_en,
    company_name_ar,
    address_en,
    city,
    region,
    phone,
    email,
    default_vat_rate,
    created_by,
    updated_by
)
SELECT 
    'ServicePro',
    'سيرفيس برو',
    'Riyadh, Saudi Arabia',
    'Riyadh',
    'Riyadh',
    '+966501234567',
    'info@servicepro.sa',
    0.15,
    auth.uid(),
    auth.uid()
WHERE NOT EXISTS (SELECT 1 FROM public.company_settings);

-- Create table for system-wide configuration
CREATE TABLE IF NOT EXISTS public.system_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key text UNIQUE NOT NULL,
    config_value jsonb NOT NULL,
    description text NULL,
    is_public boolean DEFAULT false, -- Whether this config can be read by non-admin users
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Insert default system configurations
INSERT INTO public.system_config (config_key, config_value, description, is_public) VALUES
('app_name', '"ServicePro"', 'Application name', true),
('app_version', '"1.0.0"', 'Application version', true),
('features_enabled', '{"quotes": true, "invoices": true, "zatca": true, "saudi_compliance": true}', 'Enabled features', false),
('notification_settings', '{"email_enabled": true, "whatsapp_enabled": true, "sms_enabled": false}', 'Notification preferences', false),
('maintenance_mode', 'false', 'Whether the app is in maintenance mode', true)
ON CONFLICT (config_key) DO NOTHING;

-- Create company templates table for custom templates
CREATE TABLE IF NOT EXISTS public.company_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_settings_id uuid REFERENCES public.company_settings(id) ON DELETE CASCADE,
    template_type text NOT NULL CHECK (template_type IN ('quote', 'invoice', 'email')),
    template_name text NOT NULL,
    template_data jsonb NOT NULL, -- Template configuration/layout
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(company_settings_id, template_type, template_name)
);

-- Function to get active company settings
CREATE OR REPLACE FUNCTION public.get_company_settings()
RETURNS public.company_settings
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT * FROM public.company_settings 
    WHERE is_active = true 
    LIMIT 1;
$$;

-- Function to update company settings
CREATE OR REPLACE FUNCTION public.update_company_settings(settings_data jsonb)
RETURNS public.company_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result public.company_settings;
    current_user_id uuid := auth.uid();
BEGIN
    -- Check if user is admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only administrators can update company settings';
    END IF;
    
    -- Update the active company settings
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
        logo_url = (settings_data->>'logo_url')::text,
        primary_color = COALESCE((settings_data->>'primary_color')::text, primary_color),
        secondary_color = COALESCE((settings_data->>'secondary_color')::text, secondary_color),
        zatca_environment = COALESCE((settings_data->>'zatca_environment')::text, zatca_environment),
        is_zatca_enabled = COALESCE((settings_data->>'is_zatca_enabled')::boolean, is_zatca_enabled),
        default_vat_rate = COALESCE((settings_data->>'default_vat_rate')::numeric, default_vat_rate),
        tax_registration_name = (settings_data->>'tax_registration_name')::text,
        tax_registration_address = (settings_data->>'tax_registration_address')::text,
        quote_validity_days = COALESCE((settings_data->>'quote_validity_days')::integer, quote_validity_days),
        quote_number_prefix = COALESCE((settings_data->>'quote_number_prefix')::text, quote_number_prefix),
        invoice_number_prefix = COALESCE((settings_data->>'invoice_number_prefix')::text, invoice_number_prefix),
        default_quote_template = COALESCE((settings_data->>'default_quote_template')::text, default_quote_template),
        default_invoice_template = COALESCE((settings_data->>'default_invoice_template')::text, default_invoice_template),
        include_logo_in_pdf = COALESCE((settings_data->>'include_logo_in_pdf')::boolean, include_logo_in_pdf),
        pdf_footer_text = (settings_data->>'pdf_footer_text')::text,
        default_currency = COALESCE((settings_data->>'default_currency')::text, default_currency),
        date_format = COALESCE((settings_data->>'date_format')::text, date_format),
        time_format = COALESCE((settings_data->>'time_format')::text, time_format),
        timezone = COALESCE((settings_data->>'timezone')::text, timezone),
        primary_language = COALESCE((settings_data->>'primary_language')::text, primary_language),
        updated_at = now(),
        updated_by = current_user_id
    WHERE is_active = true
    RETURNING * INTO result;
    
    -- If no active settings found, create new one
    IF result.id IS NULL THEN
        INSERT INTO public.company_settings (
            company_name_en, company_name_ar, vat_number, commercial_registration,
            address_en, city, phone, email, created_by, updated_by
        ) VALUES (
            COALESCE((settings_data->>'company_name_en')::text, 'ServicePro'),
            (settings_data->>'company_name_ar')::text,
            (settings_data->>'vat_number')::text,
            (settings_data->>'commercial_registration')::text,
            (settings_data->>'address_en')::text,
            (settings_data->>'city')::text,
            (settings_data->>'phone')::text,
            (settings_data->>'email')::text,
            current_user_id,
            current_user_id
        ) RETURNING * INTO result;
    END IF;
    
    RETURN result;
END;
$$;

-- RLS Policies
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_templates ENABLE ROW LEVEL SECURITY;

-- Company settings policies
CREATE POLICY "Anyone can read company settings"
ON public.company_settings FOR SELECT
USING (true);

CREATE POLICY "Only admins can modify company settings"
ON public.company_settings FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- System config policies  
CREATE POLICY "Public config readable by all"
ON public.system_config FOR SELECT
USING (is_public = true OR public.is_admin());

CREATE POLICY "Only admins can modify system config"
ON public.system_config FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Company templates policies
CREATE POLICY "Anyone can read company templates"
ON public.company_templates FOR SELECT
USING (true);

CREATE POLICY "Only admins can modify company templates"
ON public.company_templates FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Grant permissions
GRANT SELECT ON public.company_settings TO authenticated;
GRANT SELECT ON public.system_config TO authenticated;
GRANT SELECT ON public.company_templates TO authenticated;

GRANT ALL ON public.company_settings TO authenticated;
GRANT ALL ON public.system_config TO authenticated;
GRANT ALL ON public.company_templates TO authenticated;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION public.get_company_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_company_settings(jsonb) TO authenticated;

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_company_settings_updated_at ON public.company_settings;
CREATE TRIGGER update_company_settings_updated_at
    BEFORE UPDATE ON public.company_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_config_updated_at ON public.system_config;
CREATE TRIGGER update_system_config_updated_at
    BEFORE UPDATE ON public.system_config
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.company_settings IS 'Company profile and business settings for ZATCA compliance';
COMMENT ON COLUMN public.company_settings.vat_number IS 'Company VAT registration number for Saudi Arabia';
COMMENT ON COLUMN public.company_settings.commercial_registration IS 'Company Commercial Registration number';
COMMENT ON COLUMN public.company_settings.zatca_environment IS 'ZATCA environment: sandbox or production';
COMMENT ON COLUMN public.company_settings.default_vat_rate IS 'Default VAT rate (0.15 for 15% Saudi VAT)';

COMMENT ON TABLE public.system_config IS 'System-wide configuration settings';
COMMENT ON TABLE public.company_templates IS 'Custom templates for quotes, invoices, and emails';