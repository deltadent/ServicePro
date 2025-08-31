-- Sample Templates Population Script
-- Run this after company_settings are created and populated

-- Get the first company_settings ID
DO $$
DECLARE
    company_id uuid;
BEGIN
    -- Get the active company settings ID
    SELECT id INTO company_id FROM public.company_settings WHERE is_active = true LIMIT 1;
    
    IF company_id IS NULL THEN
        RAISE EXCEPTION 'No active company settings found. Please create company settings first.';
    END IF;
    
    -- Insert sample quote templates
    INSERT INTO public.company_templates (
        company_settings_id,
        template_type,
        template_name,
        template_data,
        is_default,
        is_active
    ) VALUES
    (
        company_id,
        'quote',
        'Professional Quote Template',
        jsonb_build_object(
            'name', 'Professional Quote Template',
            'type', 'quote',
            'description', 'Clean, professional layout perfect for business quotes',
            'header_style', 'standard',
            'colors', jsonb_build_object(
                'primary', '#2563EB',
                'secondary', '#64748B',
                'scheme', 'blue'
            ),
            'layout', jsonb_build_object(
                'include_logo', true,
                'include_company_details', true,
                'include_customer_details', true,
                'include_terms', true,
                'include_signature', false
            ),
            'content', jsonb_build_object(
                'custom_footer', 'Thank you for considering ServicePro for your service needs. We look forward to working with you!',
                'watermark_text', null,
                'custom_css', '.header { border-bottom: 3px solid #2563EB; }'
            ),
            'version', '1.0',
            'created_at', now()
        ),
        false,
        true
    ),
    (
        company_id,
        'quote',
        'Modern Gradient Quote',
        jsonb_build_object(
            'name', 'Modern Gradient Quote',
            'type', 'quote',
            'description', 'Contemporary design with gradient backgrounds and modern typography',
            'header_style', 'modern',
            'colors', jsonb_build_object(
                'primary', '#7C3AED',
                'secondary', '#6B7280',
                'scheme', 'purple'
            ),
            'layout', jsonb_build_object(
                'include_logo', true,
                'include_company_details', true,
                'include_customer_details', true,
                'include_terms', false,
                'include_signature', true
            ),
            'content', jsonb_build_object(
                'custom_footer', 'Innovation • Quality • Excellence | servicepro.sa',
                'watermark_text', null,
                'custom_css', '.gradient-bg { background: linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%); }'
            ),
            'version', '1.0',
            'created_at', now()
        ),
        false,
        true
    ),
    (
        company_id,
        'quote',
        'Minimal Clean Quote',
        jsonb_build_object(
            'name', 'Minimal Clean Quote',
            'type', 'quote',
            'description', 'Simple, distraction-free layout focusing on content clarity',
            'header_style', 'minimal',
            'colors', jsonb_build_object(
                'primary', '#1F2937',
                'secondary', '#9CA3AF',
                'scheme', 'default'
            ),
            'layout', jsonb_build_object(
                'include_logo', false,
                'include_company_details', true,
                'include_customer_details', true,
                'include_terms', false,
                'include_signature', false
            ),
            'content', jsonb_build_object(
                'custom_footer', 'ServicePro Solutions | +966 11 234 5678 | info@servicepro.sa',
                'watermark_text', null,
                'custom_css', 'body { font-family: "Inter", sans-serif; }'
            ),
            'version', '1.0',
            'created_at', now()
        ),
        false,
        true
    );
    
    -- Insert sample invoice templates
    INSERT INTO public.company_templates (
        company_settings_id,
        template_type,
        template_name,
        template_data,
        is_default,
        is_active
    ) VALUES
    (
        company_id,
        'invoice',
        'Standard Invoice Template',
        jsonb_build_object(
            'name', 'Standard Invoice Template',
            'type', 'invoice',
            'description', 'Traditional business invoice layout with comprehensive details',
            'header_style', 'standard',
            'colors', jsonb_build_object(
                'primary', '#059669',
                'secondary', '#6B7280',
                'scheme', 'green'
            ),
            'layout', jsonb_build_object(
                'include_logo', true,
                'include_company_details', true,
                'include_customer_details', true,
                'include_terms', true,
                'include_signature', true
            ),
            'content', jsonb_build_object(
                'custom_footer', 'Payment Terms: Net 15 days | Late fees may apply | Thank you for your business!',
                'watermark_text', null,
                'custom_css', '.payment-terms { background-color: #F0FDF4; border-left: 4px solid #059669; }'
            ),
            'version', '1.0',
            'created_at', now()
        ),
        true, -- Set as default invoice template
        true
    ),
    (
        company_id,
        'invoice',
        'Corporate Invoice Template',
        jsonb_build_object(
            'name', 'Corporate Invoice Template',
            'type', 'invoice',
            'description', 'Professional corporate design with detailed payment information',
            'header_style', 'modern',
            'colors', jsonb_build_object(
                'primary', '#1E40AF',
                'secondary', '#64748B',
                'scheme', 'blue'
            ),
            'layout', jsonb_build_object(
                'include_logo', true,
                'include_company_details', true,
                'include_customer_details', true,
                'include_terms', true,
                'include_signature', true
            ),
            'content', jsonb_build_object(
                'custom_footer', 'For inquiries contact: billing@servicepro.sa | Visit: servicepro.sa | ISO 9001:2015 Certified',
                'watermark_text', null,
                'custom_css', '.corporate-header { background: linear-gradient(90deg, #1E40AF 0%, #3B82F6 100%); color: white; }'
            ),
            'version', '1.0',
            'created_at', now()
        ),
        false,
        true
    );
    
    -- Insert sample email templates
    INSERT INTO public.company_templates (
        company_settings_id,
        template_type,
        template_name,
        template_data,
        is_default,
        is_active
    ) VALUES
    (
        company_id,
        'email',
        'Quote Follow-up Email',
        jsonb_build_object(
            'name', 'Quote Follow-up Email',
            'type', 'email',
            'description', 'Professional email template for following up on quotes',
            'header_style', 'standard',
            'colors', jsonb_build_object(
                'primary', '#2563EB',
                'secondary', '#64748B',
                'scheme', 'blue'
            ),
            'layout', jsonb_build_object(
                'include_logo', true,
                'include_company_details', true,
                'include_customer_details', false,
                'include_terms', false,
                'include_signature', true
            ),
            'content', jsonb_build_object(
                'subject', 'Follow-up: Your ServicePro Quote #{QUOTE_NUMBER}',
                'body', 'Dear {CUSTOMER_NAME},\n\nI hope this email finds you well. I wanted to follow up on the quote we provided for your {SERVICE_TYPE} requirements.\n\nQuote Details:\n- Quote Number: {QUOTE_NUMBER}\n- Total Amount: {TOTAL_AMOUNT}\n- Valid Until: {VALID_UNTIL}\n\nWe are committed to providing you with the highest quality service at competitive prices. If you have any questions about our quote or would like to discuss any modifications, please don''t hesitate to contact me.\n\nWe would be honored to serve you and look forward to the opportunity to work together.\n\nBest regards,\n{SENDER_NAME}\nServicePro Solutions',
                'custom_footer', 'ServicePro Solutions | +966 11 234 5678 | info@servicepro.sa | servicepro.sa',
                'watermark_text', null
            ),
            'version', '1.0',
            'created_at', now()
        ),
        true, -- Set as default email template
        true
    ),
    (
        company_id,
        'email',
        'Invoice Payment Reminder',
        jsonb_build_object(
            'name', 'Invoice Payment Reminder',
            'type', 'email',
            'description', 'Friendly payment reminder email for overdue invoices',
            'header_style', 'standard',
            'colors', jsonb_build_object(
                'primary', '#DC2626',
                'secondary', '#6B7280',
                'scheme', 'custom'
            ),
            'layout', jsonb_build_object(
                'include_logo', true,
                'include_company_details', true,
                'include_customer_details', false,
                'include_terms', true,
                'include_signature', true
            ),
            'content', jsonb_build_object(
                'subject', 'Payment Reminder: Invoice #{INVOICE_NUMBER}',
                'body', 'Dear {CUSTOMER_NAME},\n\nI hope you are doing well. This is a friendly reminder regarding invoice #{INVOICE_NUMBER} dated {INVOICE_DATE}.\n\nInvoice Details:\n- Invoice Number: {INVOICE_NUMBER}\n- Amount Due: {AMOUNT_DUE}\n- Due Date: {DUE_DATE}\n- Days Overdue: {DAYS_OVERDUE}\n\nWe understand that oversights happen, and we appreciate your prompt attention to this matter. If payment has already been sent, please disregard this notice.\n\nIf you have any questions about this invoice or need to discuss payment arrangements, please contact us immediately.\n\nThank you for your business and cooperation.\n\nBest regards,\n{SENDER_NAME}\nAccounts Receivable\nServicePro Solutions',
                'custom_footer', 'ServicePro Solutions | Accounts: billing@servicepro.sa | +966 11 234 5678',
                'watermark_text', null
            ),
            'version', '1.0',
            'created_at', now()
        ),
        false,
        true
    );
    
    RAISE NOTICE 'Sample templates created successfully for company ID: %', company_id;
END
$$;

-- Verify the templates were created
SELECT 
    'Templates Created Successfully' as status,
    COUNT(*) as total_templates,
    COUNT(*) FILTER (WHERE template_type = 'quote') as quote_templates,
    COUNT(*) FILTER (WHERE template_type = 'invoice') as invoice_templates,
    COUNT(*) FILTER (WHERE template_type = 'email') as email_templates,
    COUNT(*) FILTER (WHERE is_default = true) as default_templates
FROM public.company_templates 
WHERE is_active = true;

-- List all created templates
SELECT 
    template_type,
    template_name,
    is_default,
    is_active,
    (template_data->>'description') as description,
    created_at
FROM public.company_templates 
WHERE is_active = true
ORDER BY template_type, template_name;