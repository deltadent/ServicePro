/**
 * Saudi Market Specific Types
 * Types for Saudi Arabia business compliance, ZATCA integration, and localization
 */

// Saudi Regions
export interface SaudiRegion {
  id: number;
  name_en: string;
  name_ar: string;
  code: string;
  created_at: string;
}

// VAT Rates for ZATCA compliance
export interface VatRate {
  id: number;
  rate_name: string;
  rate_percentage: number;
  effective_from: string;
  effective_to?: string | null;
  is_default: boolean;
  created_at: string;
}

// Business Types
export interface BusinessType {
  id: number;
  type_code: 'individual' | 'establishment' | 'company' | 'non_profit' | 'government';
  name_en: string;
  name_ar: string;
  requires_vat_registration: boolean;
  created_at: string;
}

// Customer statistics by region
export interface CustomerStatsByRegion {
  region_name: string;
  customer_count: number;
  active_customers: number;
  business_customers: number;
  total_credit_limit: number;
}

// Saudi ID validation result
export interface SaudiIdValidation {
  isValid: boolean;
  type: 'citizen' | 'resident' | 'invalid';
  message: string;
}

// VAT number validation result
export interface VatNumberValidation {
  isValid: boolean;
  message: string;
  formatted?: string;
}

// Phone number formatting result
export interface PhoneNumberFormatting {
  formatted: string;
  isValid: boolean;
  type: 'mobile' | 'landline' | 'unknown';
}

// ZATCA QR Code data structure
export interface ZatcaQrData {
  seller_name: string;
  vat_number: string;
  invoice_date: string;
  total_amount: number;
  vat_amount: number;
  invoice_hash?: string;
}

// Arabic text support
export interface ArabicText {
  arabic: string;
  english: string;
}

// Saudi address structure
export interface SaudiAddress {
  street_ar?: string;
  street_en?: string;
  district_ar?: string;
  district_en?: string;
  city_ar?: string;
  city_en?: string;
  region_code: string;
  postal_code?: string;
  additional_number?: string;
  building_number?: string;
  unit_number?: string;
}

// Extended quote for Saudi market
export interface SaudiQuoteEnhancement {
  zatca_qr_code?: string | null;
  zatca_invoice_hash?: string | null;
  vat_rate: number;
  vat_amount: number;
  is_simplified_invoice: boolean;
  invoice_type: 'quote' | 'invoice' | 'credit_note' | 'debit_note';
  arabic_title?: string | null;
  arabic_description?: string | null;
}

// Business validation requirements
export interface BusinessValidationRequirements {
  business_type: 'individual' | 'establishment' | 'company' | 'non_profit' | 'government';
  requires_vat: boolean;
  requires_commercial_registration: boolean;
  requires_saudi_id: boolean;
  max_credit_limit: number;
}

// Customer enhancement data for forms
export interface CustomerSaudiData {
  vat_number?: string;
  commercial_registration?: string;
  business_type?: 'individual' | 'establishment' | 'company' | 'non_profit' | 'government';
  saudi_id?: string;
  arabic_name?: string;
  arabic_address?: string;
  tax_exempt: boolean;
  customer_category?: 'b2b' | 'b2c' | 'vip' | 'government';
  payment_terms_days: number;
  credit_limit: number;
  preferred_language: 'en' | 'ar';
  region?: string;
}

// Form validation errors
export interface SaudiValidationErrors {
  vat_number?: string;
  commercial_registration?: string;
  saudi_id?: string;
  business_type?: string;
  credit_limit?: string;
  payment_terms_days?: string;
  region?: string;
}

// Constants for Saudi market
export const SAUDI_REGIONS = [
  { code: 'RY', name_en: 'Riyadh', name_ar: 'الرياض' },
  { code: 'MK', name_en: 'Makkah', name_ar: 'مكة المكرمة' },
  { code: 'EP', name_en: 'Eastern Province', name_ar: 'الشرقية' },
  { code: 'AS', name_en: 'Asir', name_ar: 'عسير' },
  { code: 'JZ', name_en: 'Jazan', name_ar: 'جازان' },
  { code: 'MD', name_en: 'Madinah', name_ar: 'المدينة المنورة' },
  { code: 'QS', name_en: 'Qassim', name_ar: 'القصيم' },
  { code: 'TB', name_en: 'Tabuk', name_ar: 'تبوك' },
  { code: 'HL', name_en: 'Hail', name_ar: 'حائل' },
  { code: 'NB', name_en: 'Northern Borders', name_ar: 'الحدود الشمالية' },
  { code: 'JF', name_en: 'Al Jawf', name_ar: 'الجوف' },
  { code: 'NJ', name_en: 'Najran', name_ar: 'نجران' },
  { code: 'BH', name_en: 'Al Bahah', name_ar: 'الباحة' }
] as const;

export const BUSINESS_TYPES = [
  { code: 'individual', name_en: 'Individual', name_ar: 'فرد', requires_vat: false },
  { code: 'establishment', name_en: 'Individual Establishment', name_ar: 'مؤسسة فردية', requires_vat: true },
  { code: 'company', name_en: 'Company', name_ar: 'شركة', requires_vat: true },
  { code: 'non_profit', name_en: 'Non-Profit Organization', name_ar: 'منظمة غير ربحية', requires_vat: false },
  { code: 'government', name_en: 'Government Entity', name_ar: 'جهة حكومية', requires_vat: false }
] as const;

export const CUSTOMER_CATEGORIES = [
  { code: 'b2b', name_en: 'Business to Business', name_ar: 'تجاري إلى تجاري' },
  { code: 'b2c', name_en: 'Business to Consumer', name_ar: 'تجاري إلى مستهلك' },
  { code: 'vip', name_en: 'VIP Customer', name_ar: 'عميل مميز' },
  { code: 'government', name_en: 'Government', name_ar: 'حكومي' }
] as const;

// Default values
export const DEFAULT_PAYMENT_TERMS_DAYS = 30;
export const DEFAULT_CREDIT_LIMIT = 0;
export const DEFAULT_VAT_RATE = 0.15; // 15% Saudi VAT
export const DEFAULT_LANGUAGE = 'en' as const;