/**
 * Template-aware PDF Generation Factory
 * Uses user's selected template to generate styled PDFs
 */

import { Quote } from '../types/quotes';
import { getCompanySettings } from '../companyRepo';
import { generateZatcaQuotePdf } from './zatcaPdfGenerator';

// Template configurations for different PDF styles
export const TEMPLATE_STYLES = {
  standard: {
    name: 'Standard Template',
    colors: {
      primary: '#000000',
      secondary: '#666666',
      background: '#FFFFFF'
    },
    showLogo: true,
    useColors: false
  },
  modern: {
    name: 'Modern Template',
    colors: {
      primary: '#2563EB',
      secondary: '#64748B',
      background: '#FAFAFA'
    },
    showLogo: true,
    useColors: true
  },
  minimal: {
    name: 'Minimal Template',
    colors: {
      primary: '#1F2937',
      secondary: '#9CA3AF',
      background: '#FFFFFF'
    },
    showLogo: false,
    useColors: false
  },
  detailed: {
    name: 'Detailed Template',
    colors: {
      primary: '#059669',
      secondary: '#6B7280',
      background: '#F9FAFB'
    },
    showLogo: true,
    useColors: true
  }
};

/**
 * Factory class for generating PDF documents using user's template preferences
 */
export class PdfGeneratorFactory {
  /**
   * Generate quote PDF using the user's configured template
   */
  static async generateQuotePdf(
    quote: Quote,
    options = { language: 'en' as const, includeQr: true }
  ): Promise<string> {
    // Get user's template settings
    const settings = await getCompanySettings();
    const templateId = settings?.default_quote_template || 'standard';

    // Get template configuration
    const templateConfig = TEMPLATE_STYLES[templateId as keyof typeof TEMPLATE_STYLES] || TEMPLATE_STYLES.standard;

    // Build company info with template-specific settings
    const companyInfo = this.buildTemplateCompanyInfo(settings, templateConfig);

    // For now, use the enhanced ZATCA generator which now supports all real data
    // TODO: In future, could implement separate template renderers
    return await generateZatcaQuotePdf(quote, companyInfo, options);
  }

  /**
   * Build company info tailored to template requirements
   */
  private static buildTemplateCompanyInfo(settings: any, templateConfig: any) {
    return {
      name_en: settings?.company_name_en || 'ServicePro',
      vat_number: settings?.vat_number || '300000000000003',
      commercial_registration: settings?.commercial_registration || '1010000000',
      address_en: settings?.address_en || 'Riyadh, Saudi Arabia',
      city_en: settings?.city || 'Riyadh',
      postal_code: settings?.postal_code || '11564',
      // Include logo only if template supports it and user has enabled it
      logo_url: templateConfig.showLogo && settings?.logo_url && settings?.include_logo_in_pdf
        ? settings.logo_url
        : undefined,
      phone: settings?.phone,
      email: settings?.email
    };
  }
}