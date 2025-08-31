/**
 * Company Settings Repository
 * Database operations for company profile and business settings
 */

import { supabase } from '@/integrations/supabase/client';
import {
  CompanySettings,
  CompanySettingsUpdateRequest,
  SystemConfig,
  CompanyTemplate
} from './types/company';

/**
 * Get active company settings
 */
export async function getCompanySettings(): Promise<CompanySettings | null> {
  const { data, error } = await supabase
    .rpc('get_company_settings');

  if (error) {
    console.error('Error fetching company settings:', error);
    throw error;
  }

  return data || null;
}

/**
 * Update company settings
 */
export async function updateCompanySettings(
  settings: CompanySettingsUpdateRequest
): Promise<CompanySettings> {
  const { data, error } = await supabase
    .rpc('update_company_settings', {
      settings_data: settings as any
    });

  if (error) {
    console.error('Error updating company settings:', error);
    throw error;
  }

  return data;
}

/**
 * Get system configuration by key
 */
export async function getSystemConfig(key: string): Promise<any> {
  const { data, error } = await supabase
    .from('system_config')
    .select('config_value')
    .eq('config_key', key)
    .single();

  if (error && error.code !== 'PGRST116') { // Not found error
    console.error(`Error fetching system config ${key}:`, error);
    throw error;
  }

  return data?.config_value || null;
}

/**
 * Get all public system configurations
 */
export async function getPublicSystemConfigs(): Promise<Record<string, any>> {
  const { data, error } = await supabase
    .from('system_config')
    .select('config_key, config_value')
    .eq('is_public', true);

  if (error) {
    console.error('Error fetching public system configs:', error);
    throw error;
  }

  const configs: Record<string, any> = {};
  data?.forEach(config => {
    configs[config.config_key] = config.config_value;
  });

  return configs;
}

/**
 * Update system configuration (admin only)
 */
export async function updateSystemConfig(
  key: string, 
  value: any, 
  description?: string
): Promise<SystemConfig> {
  const { data, error } = await supabase
    .from('system_config')
    .upsert({
      config_key: key,
      config_value: value,
      description,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error(`Error updating system config ${key}:`, error);
    throw error;
  }

  return data;
}

/**
 * Upload company logo
 */
export async function uploadCompanyLogo(file: File): Promise<string> {
  try {
    const fileName = `company-logo-${Date.now()}.${file.name.split('.').pop()}`;
    
    const { data, error } = await supabase.storage
      .from('company-assets')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Error uploading company logo:', error);
      
      // Handle specific error cases
      if (error.message.includes('Bucket not found')) {
        throw new Error('Storage bucket "company-assets" not found. Please create the bucket in your Supabase dashboard: Storage > Create new bucket > Name: "company-assets" > Public: Yes');
      }
      
      if (error.message.includes('File size too large')) {
        throw new Error('File size must be less than 5MB');
      }
      
      if (error.message.includes('Invalid file type')) {
        throw new Error('Please upload an image file (JPG, PNG, GIF, WebP, or SVG)');
      }
      
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('company-assets')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadCompanyLogo:', error);
    throw error;
  }
}

/**
 * Delete company logo
 */
export async function deleteCompanyLogo(logoUrl: string): Promise<void> {
  // Extract file path from URL
  const urlParts = logoUrl.split('/');
  const fileName = urlParts[urlParts.length - 1];
  
  const { error } = await supabase.storage
    .from('company-assets')
    .remove([fileName]);

  if (error) {
    console.error('Error deleting company logo:', error);
    throw error;
  }
}

/**
 * Get company templates
 */
export async function getCompanyTemplates(
  templateType?: 'quote' | 'invoice' | 'email'
): Promise<CompanyTemplate[]> {
  let query = supabase
    .from('company_templates')
    .select('*')
    .eq('is_active', true);

  if (templateType) {
    query = query.eq('template_type', templateType);
  }

  const { data, error } = await query.order('template_name');

  if (error) {
    console.error('Error fetching company templates:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create company template
 */
export async function createCompanyTemplate(
  template: Omit<CompanyTemplate, 'id' | 'created_at' | 'updated_at'>
): Promise<CompanyTemplate> {
  const { data, error } = await supabase
    .from('company_templates')
    .insert(template)
    .select()
    .single();

  if (error) {
    console.error('Error creating company template:', error);
    throw error;
  }

  return data;
}

/**
 * Update company template
 */
export async function updateCompanyTemplate(
  templateId: string,
  updates: Partial<CompanyTemplate>
): Promise<CompanyTemplate> {
  const { data, error } = await supabase
    .from('company_templates')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', templateId)
    .select()
    .single();

  if (error) {
    console.error('Error updating company template:', error);
    throw error;
  }

  return data;
}

/**
 * Delete company template
 */
export async function deleteCompanyTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('company_templates')
    .delete()
    .eq('id', templateId);

  if (error) {
    console.error('Error deleting company template:', error);
    throw error;
  }
}

/**
 * Generate next document number
 */
export async function generateNextDocumentNumber(
  type: 'quote' | 'invoice'
): Promise<string> {
  const settings = await getCompanySettings();
  if (!settings) {
    throw new Error('Company settings not found');
  }

  const prefix = type === 'quote' ? settings.quote_number_prefix : settings.invoice_number_prefix;
  const tableName = type === 'quote' ? 'quotes' : 'invoices';

  // Find the highest existing number for this prefix to avoid duplicates
  const numberField = type === 'quote' ? 'quote_number' : 'invoice_number';
  const { data: existingDocs, error } = await supabase
    .from(tableName)
    .select(numberField)
    .like(numberField, `${prefix}%`)
    .order(numberField, { ascending: false })
    .limit(1);

  if (error) {
    console.warn('Error finding existing document numbers, using counter approach:', error);
    // Fallback to old method if there's an error
    const nextNumber = type === 'quote' ? settings.next_quote_number : settings.next_invoice_number;
    const documentNumber = `${prefix}${nextNumber.toString().padStart(4, '0')}`;

    // Increment the counter in the database
    const updateField = type === 'quote' ? 'next_quote_number' : 'next_invoice_number';
    await updateCompanySettings({
      [updateField]: nextNumber + 1
    } as CompanySettingsUpdateRequest);

    return documentNumber;
  }

  // Extract the sequence number from the existing document
  let nextSequenceNumber = type === 'quote' ? (settings.next_quote_number || 1000) : (settings.next_invoice_number || 1000);
  if (existingDocs && existingDocs.length > 0) {
    const existingDoc = existingDocs[0];
    const existingNumber = existingDoc[numberField];
    if (existingNumber && existingNumber.startsWith(prefix)) {
      // Extract the sequence part (everything after the prefix)
      const sequenceStr = existingNumber.substring(prefix.length);
      const sequenceNumber = parseInt(sequenceStr, 10);
      nextSequenceNumber = (isNaN(sequenceNumber) ? 999 : sequenceNumber) + 1;
    }
  }

  // Ensure we don't go below the minimum from settings
  const minSequence = type === 'quote' ? settings.next_quote_number : settings.next_invoice_number;
  if (nextSequenceNumber < minSequence) {
    nextSequenceNumber = minSequence;
  }

  // Generate the number
  const documentNumber = `${prefix}${nextSequenceNumber.toString().padStart(4, '0')}`;

  // Update the counter in settings to prevent future conflicts
  const updateField = type === 'quote' ? 'next_quote_number' : 'next_invoice_number';
  const newCounterValue = nextSequenceNumber + 1;
  await updateCompanySettings({
    [updateField]: newCounterValue
  } as CompanySettingsUpdateRequest);

  console.log(`Generated ${type} number: ${documentNumber} (sequence: ${nextSequenceNumber})`);
  return documentNumber;
}

/**
 * Validate company settings
 */
export function validateCompanySettings(settings: CompanySettingsUpdateRequest): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields
  if (!settings.company_name_en?.trim()) {
    errors.push('Company name in English is required');
  }

  // Email validation
  if (settings.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)) {
    errors.push('Invalid email format');
  }

  // Website validation
  if (settings.website && !/^https?:\/\/.+/.test(settings.website)) {
    errors.push('Website must start with http:// or https://');
  }

  // VAT rate validation
  if (settings.default_vat_rate !== undefined) {
    if (settings.default_vat_rate < 0 || settings.default_vat_rate > 1) {
      errors.push('VAT rate must be between 0 and 1 (0-100%)');
    }
  }

  // Quote validity validation
  if (settings.quote_validity_days !== undefined) {
    if (settings.quote_validity_days < 1 || settings.quote_validity_days > 365) {
      errors.push('Quote validity must be between 1 and 365 days');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Initialize default company settings
 */
export async function initializeCompanySettings(): Promise<CompanySettings> {
  try {
    // Check if settings already exist
    const existing = await getCompanySettings();
    if (existing) {
      return existing;
    }

    // Create default settings
    const defaultSettings: CompanySettingsUpdateRequest = {
      company_name_en: 'ServicePro',
      company_name_ar: 'سيرفيس برو',
      business_type: 'company',
      city: 'Riyadh',
      region: 'Riyadh',
      default_vat_rate: 0.15,
      zatca_environment: 'sandbox',
      is_zatca_enabled: true,
      primary_language: 'en'
    };

    return await updateCompanySettings(defaultSettings);
  } catch (error) {
    console.error('Error initializing company settings:', error);
    throw error;
  }
}

/**
 * Get company branding information
 */
export async function getCompanyBranding(): Promise<{
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  company_name_en: string;
  company_name_ar?: string;
  tagline_en?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  region?: string;
  postal_code?: string;
}> {
  const settings = await getCompanySettings();

  return {
    logo_url: settings?.logo_url || undefined,
    primary_color: settings?.primary_color || '#3B82F6',
    secondary_color: settings?.secondary_color || '#64748B',
    company_name_en: settings?.company_name_en || 'ServicePro',
    company_name_ar: settings?.company_name_ar || undefined,
    tagline_en: 'Professional Field Services', // Default tagline
    phone: settings?.phone || undefined,
    email: settings?.email || undefined,
    address: settings?.address_en || undefined,
    city: settings?.city || undefined,
    region: settings?.region || undefined,
    postal_code: settings?.postal_code || undefined
  };
}

/**
 * List logo files in storage bucket
 */
export async function listLogoFiles(): Promise<{ name: string; url: string }[]> {
  const { data, error } = await supabase.storage
    .from('company-assets')
    .list('', {
      limit: 10,
      sortBy: { column: 'name', order: 'desc' }
    });

  if (error) {
    console.error('Error listing logo files:', error);
    return [];
  }

  return (data || []).map(file => ({
    name: file.name,
    url: `https://your-project-id.supabase.co/storage/v1/object/public/company-assets/${file.name}` // Update with your actual project ID
  }));
}

/**
 * Manually set logo URL in company settings
 */
export async function setLogoUrl(logoUrl: string): Promise<void> {
  const { error } = await supabase
    .rpc('update_company_settings', {
      settings_data: { logo_url: logoUrl }
    });

  if (error) {
    console.error('Error setting logo URL:', error);
    throw error;
  }
}