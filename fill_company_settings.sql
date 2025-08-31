-- Fill all columns of company_settings with sample data
-- Run this in Supabase SQL Editor after creating the table

-- First, clear any existing data (optional)
DELETE FROM public.company_settings;

-- Insert comprehensive company settings data
INSERT INTO public.company_settings (
    -- Basic Company Information
    company_name_en,
    company_name_ar,
    
    -- Business Registration
    vat_number,
    commercial_registration,
    business_type,
    
    -- Contact Information
    address_en,
    address_ar,
    city,
    region,
    postal_code,
    phone,
    email,
    website,
    
    -- Visual Branding
    logo_url,
    primary_color,
    secondary_color,
    
    -- ZATCA Configuration
    zatca_environment,
    zatca_certificate_data,
    zatca_private_key,
    is_zatca_enabled,
    
    -- Tax Configuration
    default_vat_rate,
    tax_registration_name,
    tax_registration_address,
    
    -- Invoice/Quote Settings
    quote_validity_days,
    quote_number_prefix,
    invoice_number_prefix,
    next_quote_number,
    next_invoice_number,
    
    -- Template Settings
    default_quote_template,
    default_invoice_template,
    include_logo_in_pdf,
    pdf_footer_text,
    
    -- Regional Settings
    default_currency,
    date_format,
    time_format,
    timezone,
    primary_language,
    
    -- System Settings
    is_active,
    created_by,
    updated_by
) VALUES (
    -- Basic Company Information
    'ServicePro Solutions',
    'حلول سيرفيس برو',
    
    -- Business Registration
    '300123456789003', -- Saudi VAT format: 15 digits
    '1010123456', -- Saudi CR format: 10 digits
    'company',
    
    -- Contact Information
    '123 King Fahd Road, Al Olaya District, Floor 15, Office 1501',
    '123 طريق الملك فهد، حي العليا، الطابق 15، مكتب 1501',
    'Riyadh',
    'Riyadh',
    '11564',
    '+966112345678',
    'info@servicepro.sa',
    'https://servicepro.sa',
    
    -- Visual Branding (will be NULL until logo is uploaded)
    NULL,
    '#2563EB', -- Modern blue primary color
    '#64748B', -- Gray secondary color
    
    -- ZATCA Configuration
    'sandbox', -- Start with sandbox for testing
    NULL, -- Certificate data (for production)
    NULL, -- Private key (for production)
    true,
    
    -- Tax Configuration
    0.15, -- 15% Saudi VAT rate
    'ServicePro Solutions for Business Services',
    '123 King Fahd Road, Al Olaya District, Riyadh 11564, Saudi Arabia',
    
    -- Invoice/Quote Settings
    30, -- Quote valid for 30 days
    'QUO-',
    'INV-',
    1001, -- Next quote number
    2001, -- Next invoice number
    
    -- Template Settings
    'modern',
    'standard',
    true, -- Include logo in PDF
    'Thank you for choosing ServicePro | Visit: servicepro.sa | Email: info@servicepro.sa | Phone: +966112345678',
    
    -- Regional Settings
    'SAR',
    'DD/MM/YYYY',
    '24h',
    'Asia/Riyadh',
    'en',
    
    -- System Settings
    true,
    auth.uid(), -- Current user as creator
    auth.uid()  -- Current user as updater
);

-- Verify the data was inserted
SELECT 
    'Company Settings Created Successfully' as status,
    company_name_en,
    company_name_ar,
    vat_number,
    commercial_registration,
    business_type,
    city,
    region,
    phone,
    email,
    website,
    primary_color,
    secondary_color,
    zatca_environment,
    is_zatca_enabled,
    default_vat_rate,
    quote_validity_days,
    quote_number_prefix,
    invoice_number_prefix,
    next_quote_number,
    next_invoice_number,
    default_currency,
    date_format,
    time_format,
    timezone,
    primary_language,
    is_active,
    created_at
FROM public.company_settings 
WHERE is_active = true;

-- Optional: Insert additional system configurations
INSERT INTO public.system_config (config_key, config_value, description, is_public) 
VALUES
    ('company_established', '"2020"', 'Year company was established', true),
    ('business_hours', '{"sunday": "8:00-17:00", "monday": "8:00-17:00", "tuesday": "8:00-17:00", "wednesday": "8:00-17:00", "thursday": "8:00-17:00", "friday": "14:00-17:00", "saturday": "closed"}', 'Business operating hours', true),
    ('supported_services', '["AC Repair", "Plumbing", "Electrical", "Maintenance", "Installation"]', 'List of services offered', true),
    ('emergency_contact', '"+966501234567"', 'Emergency contact number', true),
    ('social_media', '{"twitter": "@servicepro_sa", "instagram": "@servicepro", "linkedin": "servicepro-solutions"}', 'Social media handles', true)
ON CONFLICT (config_key) DO NOTHING;

-- Show final results
SELECT 'Setup Complete - Total Records:' as info, count(*) as total_settings FROM public.company_settings;
SELECT 'System Config Records:' as info, count(*) as total_configs FROM public.system_config;