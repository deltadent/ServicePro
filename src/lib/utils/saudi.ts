/**
 * Saudi Market Utility Functions
 * Validation, formatting, and helper functions for Saudi Arabia compliance
 */

import {
  SaudiIdValidation,
  VatNumberValidation,
  PhoneNumberFormatting,
  ZatcaQrData,
  BusinessValidationRequirements,
  BUSINESS_TYPES,
  DEFAULT_VAT_RATE
} from '@/lib/types/saudi';

// Re-export DEFAULT_VAT_RATE for backwards compatibility
export { DEFAULT_VAT_RATE };

/**
 * Validate Saudi VAT number format
 * Format: 15 digits, starts with 3, ends with 03
 * Example: 300123456789003
 */
export function validateSaudiVatNumber(vatNumber?: string | null): VatNumberValidation {
  if (!vatNumber) {
    return { isValid: false, message: 'VAT number is required for VAT-registered businesses' };
  }

  const cleaned = vatNumber.replace(/\D/g, '');
  
  if (cleaned.length !== 15) {
    return { isValid: false, message: 'VAT number must be exactly 15 digits' };
  }

  if (!cleaned.startsWith('3')) {
    return { isValid: false, message: 'VAT number must start with 3' };
  }

  if (!cleaned.endsWith('03')) {
    return { isValid: false, message: 'VAT number must end with 03' };
  }

  return { 
    isValid: true, 
    message: 'Valid Saudi VAT number',
    formatted: cleaned
  };
}

/**
 * Validate Saudi Commercial Registration number
 * Format: 10 digits
 */
export function validateCommercialRegistration(crNumber?: string | null): VatNumberValidation {
  if (!crNumber) {
    return { isValid: false, message: 'Commercial Registration number is required for businesses' };
  }

  const cleaned = crNumber.replace(/\D/g, '');
  
  if (cleaned.length !== 10) {
    return { isValid: false, message: 'Commercial Registration must be exactly 10 digits' };
  }

  return { 
    isValid: true, 
    message: 'Valid Commercial Registration number',
    formatted: cleaned
  };
}

/**
 * Validate Saudi National ID or Iqama number
 * Format: 10 digits, starts with 1 for citizens, 2 for residents
 */
export function validateSaudiId(idNumber?: string | null): SaudiIdValidation {
  if (!idNumber) {
    return { isValid: false, type: 'invalid', message: 'Saudi ID or Iqama number is required' };
  }

  const cleaned = idNumber.replace(/\D/g, '');
  
  if (cleaned.length !== 10) {
    return { isValid: false, type: 'invalid', message: 'ID number must be exactly 10 digits' };
  }

  if (cleaned.startsWith('1')) {
    return { isValid: true, type: 'citizen', message: 'Valid Saudi National ID' };
  }

  if (cleaned.startsWith('2')) {
    return { isValid: true, type: 'resident', message: 'Valid Saudi Iqama number' };
  }

  return { isValid: false, type: 'invalid', message: 'ID must start with 1 (citizen) or 2 (resident)' };
}

/**
 * Format Saudi phone number to E.164 format (+966...)
 */
export function formatSaudiPhoneNumber(phoneInput?: string | null): PhoneNumberFormatting {
  if (!phoneInput) {
    return { formatted: '', isValid: false, type: 'unknown' };
  }

  // Remove all non-digit characters
  const cleaned = phoneInput.replace(/\D/g, '');

  // If it's already in international format (starts with 966)
  if (cleaned.startsWith('966')) {
    const number = `+${cleaned}`;
    return { 
      formatted: number, 
      isValid: cleaned.length === 12, 
      type: cleaned.charAt(3) === '5' ? 'mobile' : 'landline' 
    };
  }

  // If it starts with 0 (local format), remove the 0 and add +966
  if (cleaned.startsWith('0')) {
    const withoutZero = cleaned.substring(1);
    if (withoutZero.length === 9) {
      const number = `+966${withoutZero}`;
      return { 
        formatted: number, 
        isValid: true, 
        type: withoutZero.startsWith('5') ? 'mobile' : 'landline' 
      };
    }
  }

  // If it's 9 digits and starts with valid prefix
  if (cleaned.length === 9 && /^[5789]/.test(cleaned)) {
    const number = `+966${cleaned}`;
    return { 
      formatted: number, 
      isValid: true, 
      type: cleaned.startsWith('5') ? 'mobile' : 'landline' 
    };
  }

  // Return original if we can't format it
  return { formatted: phoneInput, isValid: false, type: 'unknown' };
}

/**
 * Get business validation requirements based on business type
 */
export function getBusinessValidationRequirements(
  businessType?: string | null
): BusinessValidationRequirements {
  const typeConfig = BUSINESS_TYPES.find(bt => bt.code === businessType);
  
  if (!typeConfig) {
    return {
      business_type: 'individual',
      requires_vat: false,
      requires_commercial_registration: false,
      requires_saudi_id: true,
      max_credit_limit: 10000 // SAR
    };
  }

  const maxCreditLimits = {
    individual: 10000,
    establishment: 50000,
    company: 500000,
    non_profit: 25000,
    government: 1000000
  };

  return {
    business_type: typeConfig.code,
    requires_vat: typeConfig.requires_vat,
    requires_commercial_registration: typeConfig.requires_vat,
    requires_saudi_id: typeConfig.code !== 'government',
    max_credit_limit: maxCreditLimits[typeConfig.code]
  };
}

/**
 * Calculate VAT amount
 */
export function calculateVatAmount(amount: number, vatRate: number = DEFAULT_VAT_RATE): number {
  return Math.round((amount * vatRate) * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate total with VAT
 */
export function calculateTotalWithVat(amount: number, vatRate: number = DEFAULT_VAT_RATE): number {
  return amount + calculateVatAmount(amount, vatRate);
}

/**
 * Generate ZATCA QR code data
 * This is a simplified version - in production, you'd use proper TLV encoding
 */
export function generateZatcaQrData(data: ZatcaQrData): string {
  try {
    const qrData = {
      1: data.seller_name, // Seller name
      2: data.vat_number,  // VAT registration number
      3: data.invoice_date, // Invoice date
      4: data.total_amount.toString(), // Invoice total (with VAT)
      5: data.vat_amount.toString()    // VAT amount
    };

    // In production, this should be proper TLV encoding and Base64
    const jsonString = JSON.stringify(qrData);
    return btoa(unescape(encodeURIComponent(jsonString)));
  } catch (error) {
    console.error('Error generating ZATCA QR data:', error);
    return '';
  }
}

/**
 * Format currency for Saudi market (SAR)
 */
export function formatSaudiCurrency(
  amount: number, 
  locale: string = 'en-SA',
  showSymbol: boolean = true
): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'SAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return formatter.format(amount);
}

/**
 * Validate credit limit based on business type
 */
export function validateCreditLimit(
  amount: number, 
  businessType?: string | null
): { isValid: boolean; message: string; maxAllowed: number } {
  const requirements = getBusinessValidationRequirements(businessType);
  
  if (amount < 0) {
    return {
      isValid: false,
      message: 'Credit limit cannot be negative',
      maxAllowed: requirements.max_credit_limit
    };
  }

  if (amount > requirements.max_credit_limit) {
    return {
      isValid: false,
      message: `Credit limit exceeds maximum allowed for ${businessType} (${formatSaudiCurrency(requirements.max_credit_limit)})`,
      maxAllowed: requirements.max_credit_limit
    };
  }

  return {
    isValid: true,
    message: 'Valid credit limit',
    maxAllowed: requirements.max_credit_limit
  };
}

/**
 * Validate payment terms
 */
export function validatePaymentTerms(days: number): { isValid: boolean; message: string } {
  if (days < 0) {
    return { isValid: false, message: 'Payment terms cannot be negative' };
  }

  if (days > 365) {
    return { isValid: false, message: 'Payment terms cannot exceed 365 days' };
  }

  return { isValid: true, message: 'Valid payment terms' };
}

/**
 * Check if customer needs VAT registration based on business type
 */
export function requiresVatRegistration(businessType?: string | null): boolean {
  const requirements = getBusinessValidationRequirements(businessType);
  return requirements.requires_vat;
}

/**
 * Format Arabic and English text for bilingual display
 */
export function formatBilingualText(arabic?: string | null, english?: string | null): string {
  if (arabic && english) {
    return `${english} / ${arabic}`;
  }
  return arabic || english || '';
}

/**
 * Generate customer display name with Arabic support
 */
export function getCustomerDisplayNameArabic(customer: {
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  arabic_name?: string | null;
  name?: string;
  preferred_language?: 'en' | 'ar';
}): string {
  // If Arabic is preferred and Arabic name exists
  if (customer.preferred_language === 'ar' && customer.arabic_name) {
    return customer.arabic_name;
  }

  // For companies, prefer company name
  if (customer.company_name) {
    return customer.arabic_name ? 
      formatBilingualText(customer.arabic_name, customer.company_name) : 
      customer.company_name;
  }

  // For individuals, combine first and last name
  if (customer.first_name || customer.last_name) {
    const englishName = [customer.first_name, customer.last_name].filter(Boolean).join(' ');
    return customer.arabic_name ? 
      formatBilingualText(customer.arabic_name, englishName) : 
      englishName;
  }

  // Fallback to original name or Arabic name
  return customer.arabic_name || customer.name || 'Unknown Customer';
}

/**
 * Validate required fields based on customer type and business requirements
 */
export function validateCustomerRequiredFields(customer: {
  customer_type?: string;
  business_type?: string | null;
  vat_number?: string | null;
  commercial_registration?: string | null;
  saudi_id?: string | null;
}): string[] {
  const errors: string[] = [];
  
  if (customer.customer_type === 'commercial') {
    const requirements = getBusinessValidationRequirements(customer.business_type);
    
    if (requirements.requires_vat && !customer.vat_number) {
      errors.push('VAT number is required for this business type');
    }
    
    if (requirements.requires_commercial_registration && !customer.commercial_registration) {
      errors.push('Commercial Registration number is required for this business type');
    }
    
    if (requirements.requires_saudi_id && !customer.saudi_id) {
      errors.push('Saudi ID or Iqama number is required');
    }
  }
  
  return errors;
}