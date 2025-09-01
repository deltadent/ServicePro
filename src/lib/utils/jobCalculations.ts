import { CompanySettings } from '@/lib/types/company';

export interface JobCostBreakdown {
  subtotal: number;
  vatAmount: number;
  vatRate: number;
  total: number;
  currency: string;
  laborCost?: number;
  materialCost?: number;
  additionalCharges?: number;
}

export interface JobCostItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  itemType: 'labor' | 'material' | 'service' | 'other';
}

/**
 * Calculate VAT amount based on subtotal and VAT rate
 */
export function calculateVAT(subtotal: number, vatRate: number): number {
  return subtotal * vatRate;
}

/**
 * Calculate total including VAT
 */
export function calculateTotalWithVAT(subtotal: number, vatRate: number): number {
  const vatAmount = calculateVAT(subtotal, vatRate);
  return subtotal + vatAmount;
}

/**
 * Calculate job cost breakdown with VAT
 */
export function calculateJobCostBreakdown(
  items: JobCostItem[],
  settings: CompanySettings | null,
  additionalCharges: number = 0
): JobCostBreakdown {
  const vatRate = settings?.default_vat_rate || 0.15; // Default to 15% Saudi VAT
  const currency = settings?.default_currency || 'SAR';

  // Calculate subtotal from all items
  const subtotal = items.reduce((sum, item) => sum + item.total, 0) + additionalCharges;
  
  // Calculate costs by category
  const laborCost = items
    .filter(item => item.itemType === 'labor' || item.itemType === 'service')
    .reduce((sum, item) => sum + item.total, 0);
  
  const materialCost = items
    .filter(item => item.itemType === 'material')
    .reduce((sum, item) => sum + item.total, 0);

  const vatAmount = calculateVAT(subtotal, vatRate);
  const total = subtotal + vatAmount;

  return {
    subtotal,
    vatAmount,
    vatRate,
    total,
    currency,
    laborCost,
    materialCost,
    additionalCharges
  };
}

/**
 * Format currency amount according to company settings
 */
export function formatCurrency(
  amount: number, 
  settings: CompanySettings | null
): string {
  const currency = settings?.default_currency || 'SAR';
  const locale = settings?.primary_language === 'ar' ? 'ar-SA' : 'en-SA';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
}

/**
 * Format date according to company settings
 */
export function formatJobDate(
  date: Date | string, 
  settings: CompanySettings | null
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const locale = settings?.primary_language === 'ar' ? 'ar-SA' : 'en-SA';
  const dateFormat = settings?.date_format || 'DD/MM/YYYY';
  const timeFormat = settings?.time_format || '24h';

  // Convert format string to Intl.DateTimeFormat options
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: timeFormat === '12h' ? 'numeric' : '2-digit',
    minute: '2-digit',
    hour12: timeFormat === '12h'
  };

  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

/**
 * Generate job number with company prefix
 */
export function generateJobNumber(
  settings: CompanySettings | null,
  sequenceNumber?: number
): string {
  // This would typically be handled by the backend, but we can provide a fallback
  const prefix = 'JOB-';
  const sequence = sequenceNumber || Date.now() % 10000;
  return `${prefix}${sequence.toString().padStart(4, '0')}`;
}

/**
 * Calculate estimated job duration based on quote items
 */
export function calculateEstimatedDuration(items: JobCostItem[]): number {
  // Simple estimation: 1 hour base + 30 minutes per service item + 15 minutes per material item
  const baseTime = 60; // 1 hour in minutes
  const serviceTime = items
    .filter(item => item.itemType === 'service' || item.itemType === 'labor')
    .reduce((sum, item) => sum + (item.quantity * 30), 0); // 30 minutes per service
  
  const materialTime = items
    .filter(item => item.itemType === 'material')
    .reduce((sum, item) => sum + (item.quantity * 15), 0); // 15 minutes per material

  return baseTime + serviceTime + materialTime;
}

/**
 * Apply company-specific job defaults
 */
export function applyCompanyJobDefaults(
  jobData: any,
  settings: CompanySettings | null
): any {
  return {
    ...jobData,
    // Apply timezone
    timezone: settings?.timezone || 'Asia/Riyadh',
    
    // Apply regional settings
    currency: settings?.default_currency || 'SAR',
    language: settings?.primary_language || 'en',
    
    // Apply tax settings
    vat_rate: settings?.default_vat_rate || 0.15,
    include_vat: settings?.is_zatca_enabled || true,
    
    // Apply business type context
    business_context: settings?.business_type || 'company'
  };
}