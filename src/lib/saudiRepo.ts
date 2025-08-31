/**
 * Saudi Market Repository
 * Database operations for Saudi-specific data and lookups
 */

import { supabase } from '@/integrations/supabase/client';
import {
  SaudiRegion,
  VatRate,
  BusinessType,
  CustomerStatsByRegion
} from './types/saudi';

/**
 * Get all Saudi regions
 */
export async function getSaudiRegions(): Promise<SaudiRegion[]> {
  const { data, error } = await supabase
    .from('saudi_regions')
    .select('*')
    .order('name_en');

  if (error) {
    console.error('Error fetching Saudi regions:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get active VAT rates
 */
export async function getVatRates(): Promise<VatRate[]> {
  const currentDate = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('vat_rates')
    .select('*')
    .lte('effective_from', currentDate)
    .or(`effective_to.is.null,effective_to.gte.${currentDate}`)
    .order('is_default', { ascending: false });

  if (error) {
    console.error('Error fetching VAT rates:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get default VAT rate
 */
export async function getDefaultVatRate(): Promise<VatRate | null> {
  const { data, error } = await supabase
    .from('vat_rates')
    .select('*')
    .eq('is_default', true)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching default VAT rate:', error);
    throw error;
  }

  return data || null;
}

/**
 * Get all business types
 */
export async function getBusinessTypes(): Promise<BusinessType[]> {
  const { data, error } = await supabase
    .from('business_types')
    .select('*')
    .order('name_en');

  if (error) {
    console.error('Error fetching business types:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get customer statistics by region
 */
export async function getCustomerStatsByRegion(): Promise<CustomerStatsByRegion[]> {
  const { data, error } = await supabase
    .rpc('get_customer_stats_by_region');

  if (error) {
    console.error('Error fetching customer stats by region:', error);
    throw error;
  }

  return data || [];
}

/**
 * Validate VAT number using database function
 */
export async function validateVatNumberInDB(vatNumber: string): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('validate_saudi_vat_number', { vat_number: vatNumber });

  if (error) {
    console.error('Error validating VAT number:', error);
    return false;
  }

  return data === true;
}

/**
 * Validate Commercial Registration using database function
 */
export async function validateCommercialRegistrationInDB(crNumber: string): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('validate_saudi_commercial_registration', { cr_number: crNumber });

  if (error) {
    console.error('Error validating Commercial Registration:', error);
    return false;
  }

  return data === true;
}

/**
 * Validate Saudi ID using database function
 */
export async function validateSaudiIdInDB(idNumber: string): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('validate_saudi_id', { id_number: idNumber });

  if (error) {
    console.error('Error validating Saudi ID:', error);
    return false;
  }

  return data === true;
}

/**
 * Format phone number using database function
 */
export async function formatPhoneNumberInDB(phoneNumber: string): Promise<string> {
  const { data, error } = await supabase
    .rpc('format_saudi_phone_number', { phone_input: phoneNumber });

  if (error) {
    console.error('Error formatting phone number:', error);
    return phoneNumber; // Return original on error
  }

  return data || phoneNumber;
}

/**
 * Generate ZATCA QR code using database function
 */
export async function generateZatcaQrCodeInDB(
  sellerName: string,
  vatNumber: string,
  invoiceDate: string,
  totalAmount: number,
  vatAmount: number
): Promise<string> {
  const { data, error } = await supabase
    .rpc('generate_zatca_qr_data', {
      seller_name: sellerName,
      vat_number: vatNumber,
      invoice_date: invoiceDate,
      total_amount: totalAmount,
      vat_amount: vatAmount
    });

  if (error) {
    console.error('Error generating ZATCA QR code:', error);
    throw error;
  }

  return data || '';
}

/**
 * Check if customer exists by VAT number
 */
export async function getCustomerByVatNumber(vatNumber: string) {
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, vat_number, business_type')
    .eq('vat_number', vatNumber)
    .maybeSingle();

  if (error) {
    console.error('Error fetching customer by VAT number:', error);
    throw error;
  }

  return data;
}

/**
 * Check if customer exists by Commercial Registration
 */
export async function getCustomerByCommercialRegistration(crNumber: string) {
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, commercial_registration, business_type')
    .eq('commercial_registration', crNumber)
    .maybeSingle();

  if (error) {
    console.error('Error fetching customer by CR number:', error);
    throw error;
  }

  return data;
}

/**
 * Check if customer exists by Saudi ID
 */
export async function getCustomerBySaudiId(saudiId: string) {
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, saudi_id, first_name, last_name')
    .eq('saudi_id', saudiId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching customer by Saudi ID:', error);
    throw error;
  }

  return data;
}

/**
 * Get customers with incomplete Saudi data for migration/cleanup
 */
export async function getCustomersWithIncompleteData(): Promise<any[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, customer_type, business_type, vat_number, commercial_registration, saudi_id')
    .eq('customer_type', 'commercial')
    .or('business_type.is.null,vat_number.is.null,commercial_registration.is.null');

  if (error) {
    console.error('Error fetching customers with incomplete data:', error);
    throw error;
  }

  return data || [];
}

/**
 * Update customer with Saudi market data
 */
export async function updateCustomerSaudiData(
  customerId: string,
  saudiData: {
    vat_number?: string;
    commercial_registration?: string;
    business_type?: string;
    saudi_id?: string;
    arabic_name?: string;
    arabic_address?: string;
    tax_exempt?: boolean;
    customer_category?: string;
    payment_terms_days?: number;
    credit_limit?: number;
    preferred_language?: string;
    region?: string;
  }
) {
  const { data, error } = await supabase
    .from('customers')
    .update({
      ...saudiData,
      updated_at: new Date().toISOString()
    })
    .eq('id', customerId)
    .select()
    .single();

  if (error) {
    console.error('Error updating customer Saudi data:', error);
    throw error;
  }

  return data;
}

/**
 * Bulk update customers with region data based on address
 */
export async function bulkUpdateCustomerRegions() {
  // This would analyze addresses and assign regions
  // For now, we'll just set a default region for customers without one
  const { data, error } = await supabase
    .from('customers')
    .update({ region: 'Riyadh' })
    .is('region', null)
    .neq('address', null)
    .select('id');

  if (error) {
    console.error('Error bulk updating customer regions:', error);
    throw error;
  }

  return data?.length || 0;
}

/**
 * Get customers by region for regional analysis
 */
export async function getCustomersByRegion(region: string) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('region', region)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching customers by region:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get high-value customers (by credit limit or transaction volume)
 */
export async function getHighValueCustomers(minCreditLimit: number = 50000) {
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, arabic_name, credit_limit, customer_category, region, business_type')
    .gte('credit_limit', minCreditLimit)
    .eq('is_active', true)
    .order('credit_limit', { ascending: false });

  if (error) {
    console.error('Error fetching high-value customers:', error);
    throw error;
  }

  return data || [];
}