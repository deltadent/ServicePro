/**
 * Company Settings and Business Profile Types
 * Types for company configuration, ZATCA settings, and business profile management
 */

// Company Settings
export interface CompanySettings {
  id: string;
  
  // Basic Company Information
  company_name_en: string;
  company_name_ar?: string | null;
  
  // Business Registration
  vat_number?: string | null;
  commercial_registration?: string | null;
  business_type: 'individual' | 'establishment' | 'company' | 'non_profit' | 'government';
  
  // Contact Information
  address_en?: string | null;
  address_ar?: string | null;
  city?: string | null;
  region?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  
  // Visual Branding
  logo_url?: string | null;
  primary_color: string;
  secondary_color: string;
  
  // ZATCA Configuration
  zatca_environment: 'sandbox' | 'production';
  zatca_certificate_data?: string | null;
  zatca_private_key?: string | null;
  is_zatca_enabled: boolean;
  
  // Tax Configuration
  default_vat_rate: number;
  tax_registration_name?: string | null;
  tax_registration_address?: string | null;
  
  // Invoice/Quote Settings
  quote_validity_days: number;
  quote_number_prefix: string;
  invoice_number_prefix: string;
  next_quote_number: number;
  next_invoice_number: number;
  
  // Template Settings
  default_quote_template: string;
  default_invoice_template: string;
  include_logo_in_pdf: boolean;
  pdf_footer_text?: string | null;
  
  // Regional Settings
  default_currency: string;
  date_format: string;
  time_format: string;
  timezone: string;
  primary_language: 'en' | 'ar';
  
  // System Fields
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

// Company Settings Update Request
export interface CompanySettingsUpdateRequest {
  company_name_en?: string;
  company_name_ar?: string | null;
  vat_number?: string | null;
  commercial_registration?: string | null;
  business_type?: 'individual' | 'establishment' | 'company' | 'non_profit' | 'government';
  address_en?: string | null;
  address_ar?: string | null;
  city?: string | null;
  region?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logo_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
  zatca_environment?: 'sandbox' | 'production';
  is_zatca_enabled?: boolean;
  default_vat_rate?: number;
  quote_validity_days?: number;
  quote_number_prefix?: string;
  invoice_number_prefix?: string;
  default_quote_template?: string;
  default_invoice_template?: string;
  include_logo_in_pdf?: boolean;
  pdf_footer_text?: string | null;
  default_currency?: string;
  date_format?: string;
  time_format?: string;
  timezone?: string;
  primary_language?: 'en' | 'ar';
  tax_registration_name?: string | null;
  tax_registration_address?: string | null;
}

// System Configuration
export interface SystemConfig {
  id: string;
  config_key: string;
  config_value: any; // JSONB can be any JSON value
  description?: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// Company Templates
export interface CompanyTemplate {
  id: string;
  company_settings_id: string;
  template_type: 'quote' | 'invoice' | 'email';
  template_name: string;
  template_data: any; // JSONB template configuration
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Logo Upload
export interface LogoUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

// Company validation
export interface CompanyValidationResult {
  isValid: boolean;
  errors: string[];
}

// ZATCA Configuration
export interface ZatcaConfig {
  environment: 'sandbox' | 'production';
  certificate_data?: string;
  private_key?: string;
  is_enabled: boolean;
  company_vat_number?: string;
  company_name_en: string;
  company_name_ar?: string;
}

// Tax Settings
export interface TaxSettings {
  default_vat_rate: number;
  tax_registration_name?: string;
  tax_registration_address?: string;
  vat_number?: string;
  is_tax_inclusive: boolean;
}

// Invoice/Quote Settings
export interface DocumentSettings {
  quote_validity_days: number;
  quote_number_prefix: string;
  invoice_number_prefix: string;
  next_quote_number: number;
  next_invoice_number: number;
  default_quote_template: string;
  default_invoice_template: string;
  include_logo_in_pdf: boolean;
  pdf_footer_text?: string;
}

// Regional Settings
export interface RegionalSettings {
  default_currency: string;
  date_format: string;
  time_format: string;
  timezone: string;
  primary_language: 'en' | 'ar';
}

// Brand Settings
export interface BrandSettings {
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  company_name_en: string;
  company_name_ar?: string;
}

// Settings form data
export interface CompanySettingsFormData {
  // Basic Information
  company_name_en: string;
  company_name_ar: string;
  
  // Business Registration
  vat_number: string;
  commercial_registration: string;
  business_type: 'individual' | 'establishment' | 'company' | 'non_profit' | 'government';
  
  // Contact Information
  address_en: string;
  address_ar: string;
  city: string;
  region: string;
  postal_code: string;
  phone: string;
  email: string;
  website: string;
  
  // ZATCA Settings
  zatca_environment: 'sandbox' | 'production';
  is_zatca_enabled: boolean;
  
  // Tax Settings
  default_vat_rate: number;
  
  // Document Settings
  quote_validity_days: number;
  quote_number_prefix: string;
  invoice_number_prefix: string;
  
  // Regional Settings
  primary_language: 'en' | 'ar';
}

// Constants
export const BUSINESS_ENTITY_TYPES = [
  { code: 'individual', name_en: 'Individual', name_ar: 'فرد' },
  { code: 'establishment', name_en: 'Individual Establishment', name_ar: 'مؤسسة فردية' },
  { code: 'company', name_en: 'Company', name_ar: 'شركة' },
  { code: 'non_profit', name_en: 'Non-Profit Organization', name_ar: 'منظمة غير ربحية' },
  { code: 'government', name_en: 'Government Entity', name_ar: 'جهة حكومية' }
] as const;

export const ZATCA_ENVIRONMENTS = [
  { code: 'sandbox', name: 'Sandbox (Testing)', description: 'For testing and development' },
  { code: 'production', name: 'Production (Live)', description: 'For live business operations' }
] as const;

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'ar', name: 'Arabic', native: 'العربية' }
] as const;

export const CURRENCY_OPTIONS = [
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' }
] as const;

export const DATE_FORMATS = [
  { code: 'DD/MM/YYYY', example: '31/12/2024' },
  { code: 'MM/DD/YYYY', example: '12/31/2024' },
  { code: 'YYYY-MM-DD', example: '2024-12-31' },
  { code: 'DD-MM-YYYY', example: '31-12-2024' }
] as const;

export const TIME_FORMATS = [
  { code: '12h', name: '12 Hour', example: '2:30 PM' },
  { code: '24h', name: '24 Hour', example: '14:30' }
] as const;

// Default values
export const DEFAULT_COMPANY_SETTINGS: Partial<CompanySettings> = {
  company_name_en: 'ServicePro',
  company_name_ar: 'سيرفيس برو',
  business_type: 'company',
  primary_color: '#3B82F6',
  secondary_color: '#64748B',
  zatca_environment: 'sandbox',
  is_zatca_enabled: true,
  default_vat_rate: 0.15,
  quote_validity_days: 30,
  quote_number_prefix: 'QUO-',
  invoice_number_prefix: 'INV-',
  next_quote_number: 1000,
  next_invoice_number: 1000,
  default_quote_template: 'standard',
  default_invoice_template: 'standard',
  include_logo_in_pdf: true,
  default_currency: 'SAR',
  date_format: 'DD/MM/YYYY',
  time_format: '24h',
  timezone: 'Asia/Riyadh',
  primary_language: 'en'
};