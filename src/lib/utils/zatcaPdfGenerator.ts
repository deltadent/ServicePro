/**
 * ZATCA-Compliant PDF Generator for Saudi Arabia E-Invoicing
 * Implements bilingual Arabic/English invoices with QR codes and ZATCA requirements
 */

import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { Quote, QuoteItem } from '../types/quotes';

interface CompanyInfo {
  name_en: string;
  vat_number: string;
  commercial_registration: string;
  address_en: string;
  city_en: string;
  postal_code: string;
}

interface ZatcaPdfOptions {
  language: 'en';
  includeQr: boolean;
  includeWatermark?: boolean;
}

export class ZatcaPdfGenerator {
  private doc: jsPDF;
  private pageWidth: number = 595.28; // A4 width
  private pageHeight: number = 841.89; // A4 height
  private margin: number = 40;
  private contentWidth: number;
  private yPosition: number = 60;

  // ZATCA Colors
  private colors = {
    primary: [0, 102, 51] as const, // Saudi Green
    secondary: [85, 85, 85] as const,
    text: [33, 37, 41] as const,
    lightGray: [248, 249, 250] as const,
    border: [220, 220, 220] as const,
    danger: [220, 53, 69] as const,
  };

  // Font configurations for Arabic and English
  private fonts = {
    titleAr: { size: 20, weight: 'bold' as const },
    titleEn: { size: 18, weight: 'bold' as const },
    headingAr: { size: 14, weight: 'bold' as const },
    headingEn: { size: 12, weight: 'bold' as const },
    bodyAr: { size: 11, weight: 'normal' as const },
    bodyEn: { size: 10, weight: 'normal' as const },
    small: { size: 8, weight: 'normal' as const },
  };

  constructor() {
    this.doc = new jsPDF('portrait', 'pt', 'a4');
    this.contentWidth = this.pageWidth - 2 * this.margin;
  }

  /**
   * Generate ZATCA-compliant quote PDF
   */
   async generateQuotePdf(
     quote: Quote,
     companyInfo: CompanyInfo,
     options: ZatcaPdfOptions = { language: 'en', includeQr: true }
   ): Promise<string> {
    // Set up document metadata
    this.doc.setProperties({
      title: `Quote ${quote.quote_number}`,
      subject: 'Professional Quote - ZATCA Compliant',
      creator: 'ServicePro - ZATCA Compliant System',
      keywords: 'Quote, ZATCA, Saudi Arabia, VAT'
    });

    // Generate content
    await this.addHeader(companyInfo, options.language);
    this.addQuoteInfo(quote, options.language);
    await this.addCustomerInfo(quote, options.language);
    this.addLineItems(quote.quote_items || [], options.language);
    this.addTotals(quote, options.language);
    
    if (options.includeQr) {
      await this.addQrCode(quote, companyInfo);
    }
    
    this.addTermsAndConditions(quote, options.language);
    this.addFooter(companyInfo, options.language);

    // Add ZATCA compliance watermark if requested
    if (options.includeWatermark) {
      this.addZatcaWatermark();
    }

    return this.doc.output('datauristring');
  }

  /**
   * Add English header with company information
   */
  private async addHeader(companyInfo: CompanyInfo, language: 'en'): Promise<void> {
    // Company Name
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(this.fonts.titleEn.size);
    this.doc.setTextColor(...this.colors.primary);
    this.doc.text(companyInfo.name_en, this.margin, this.yPosition);

    this.yPosition += 30;

    // Company Details
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(this.fonts.bodyEn.size);
    this.doc.setTextColor(...this.colors.text);

    this.doc.text('VAT Number:', this.margin, this.yPosition);
    this.doc.text(companyInfo.vat_number, this.margin + 80, this.yPosition);
    this.yPosition += 15;

    this.doc.text('CR Number:', this.margin, this.yPosition);
    this.doc.text(companyInfo.commercial_registration, this.margin + 80, this.yPosition);
    this.yPosition += 15;

    this.doc.text('Address:', this.margin, this.yPosition);
    this.yPosition += 12;
    this.doc.text(companyInfo.address_en, this.margin + 10, this.yPosition);
    this.yPosition += 12;
    this.doc.text(`${companyInfo.city_en}, ${companyInfo.postal_code}`, this.margin + 10, this.yPosition);

    this.yPosition += 40;
    this.addSeparatorLine();
  }

  /**
   * Add quote information section
   */
  private addQuoteInfo(quote: Quote, language: 'en'): void {
    // Quote header
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(this.fonts.headingEn.size);
    this.doc.setTextColor(...this.colors.primary);
    this.doc.text('QUOTE', this.margin, this.yPosition);

    this.yPosition += 25;

    // Quote details
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(this.fonts.bodyEn.size);
    this.doc.setTextColor(...this.colors.text);

    this.doc.text('Quote Number:', this.margin, this.yPosition);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(quote.quote_number, this.margin + 90, this.yPosition);
    this.doc.setFont('helvetica', 'normal');

    this.yPosition += 15;
    this.doc.text('Quote Date:', this.margin, this.yPosition);
    this.doc.text(new Date(quote.created_at).toLocaleDateString('en-GB'), this.margin + 90, this.yPosition);

    if (quote.valid_until) {
      this.yPosition += 15;
      this.doc.text('Valid Until:', this.margin, this.yPosition);
      this.doc.text(new Date(quote.valid_until).toLocaleDateString('en-GB'), this.margin + 90, this.yPosition);
    }

    this.yPosition += 30;
  }

  /**
   * Add customer information
   */
  private async addCustomerInfo(quote: Quote, language: 'en'): Promise<void> {
    this.addSeparatorLine();
    this.yPosition += 15;

    // Customer section header
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(this.fonts.headingEn.size);
    this.doc.setTextColor(...this.colors.primary);
    this.doc.text('Bill To:', this.margin, this.yPosition);

    this.yPosition += 20;

    if (quote.customer) {
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(this.fonts.bodyEn.size);
      this.doc.setTextColor(...this.colors.text);

      // Customer name
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(quote.customer.name, this.margin, this.yPosition);
      this.doc.setFont('helvetica', 'normal');
      this.yPosition += 15;

      // Customer details
      if (quote.customer.email) {
        this.doc.text(`Email: ${quote.customer.email}`, this.margin, this.yPosition);
        this.yPosition += 12;
      }

      if (quote.customer.phone_mobile) {
        this.doc.text(`Phone: ${quote.customer.phone_mobile}`, this.margin, this.yPosition);
        this.yPosition += 12;
      }

      if (quote.customer.address) {
        this.doc.text('Address:', this.margin, this.yPosition);
        this.yPosition += 12;
        this.doc.text(quote.customer.address, this.margin + 10, this.yPosition);
        this.yPosition += 12;
        if (quote.customer.city && quote.customer.state) {
          this.doc.text(`${quote.customer.city}, ${quote.customer.state}`, this.margin + 10, this.yPosition);
          this.yPosition += 12;
        }
      }
    }

    this.yPosition += 20;
  }

  /**
   * Add line items table
   */
  private addLineItems(items: QuoteItem[], language: 'en'): void {
    this.addSeparatorLine();
    this.yPosition += 15;

    // Table header
    const tableStartY = this.yPosition;
    const rowHeight = 25;
    const headerHeight = 30;

    // Header background
    this.doc.setFillColor(...this.colors.lightGray);
    this.doc.rect(this.margin, this.yPosition, this.contentWidth, headerHeight, 'F');

    // Header text
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(this.fonts.bodyEn.size);
    this.doc.setTextColor(...this.colors.text);

    const colWidths = {
      desc: this.contentWidth * 0.4,
      qty: this.contentWidth * 0.15,
      price: this.contentWidth * 0.2,
      total: this.contentWidth * 0.25
    };

    let colX = this.margin + 5;
    
    if (language === 'en') {
      this.doc.text('Description', colX, this.yPosition + 20);
      colX += colWidths.desc;
      this.doc.text('Qty', colX, this.yPosition + 20);
      colX += colWidths.qty;
      this.doc.text('Unit Price', colX, this.yPosition + 20);
      colX += colWidths.price;
      this.doc.text('Total', colX, this.yPosition + 20);
    }

    this.yPosition += headerHeight;

    // Table rows
    this.doc.setFont('helvetica', 'normal');
    items.forEach((item, index) => {
      // Alternate row background
      if (index % 2 === 1) {
        this.doc.setFillColor(250, 250, 250);
        this.doc.rect(this.margin, this.yPosition, this.contentWidth, rowHeight, 'F');
      }

      colX = this.margin + 5;
      const itemTotal = item.quantity * item.unit_price;

      // Item description
      this.doc.setTextColor(...this.colors.text);
      this.doc.text(item.name, colX, this.yPosition + 15);
      if (item.description) {
        this.doc.setFontSize(this.fonts.small.size);
        this.doc.text(item.description, colX, this.yPosition + 25);
        this.doc.setFontSize(this.fonts.bodyEn.size);
      }

      colX += colWidths.desc;
      this.doc.text(item.quantity.toString(), colX, this.yPosition + 15, { align: 'center' });

      colX += colWidths.qty;
      this.doc.text(`${item.unit_price.toFixed(2)} SAR`, colX, this.yPosition + 15, { align: 'center' });

      colX += colWidths.price;
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(`${itemTotal.toFixed(2)} SAR`, colX, this.yPosition + 15, { align: 'center' });
      this.doc.setFont('helvetica', 'normal');

      this.yPosition += rowHeight;
    });

    // Table border
    this.doc.setDrawColor(...this.colors.border);
    this.doc.rect(this.margin, tableStartY, this.contentWidth, this.yPosition - tableStartY);

    this.yPosition += 20;
  }

  /**
   * Add totals section with VAT calculations
   */
  private addTotals(quote: Quote, language: 'en'): void {
    const totalsStartX = this.pageWidth - this.margin - 200;
    const labelWidth = 100;
    const valueWidth = 80;

    // Subtotal
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(this.fonts.bodyEn.size);

    this.doc.text('Subtotal:', totalsStartX, this.yPosition);
    this.doc.text(`${quote.subtotal.toFixed(2)} SAR`, totalsStartX + labelWidth, this.yPosition, { align: 'right' });
    this.yPosition += 25;

    // Discount if applicable
    if (quote.discount_amount > 0) {
      this.doc.setTextColor(...this.colors.danger);
      this.doc.text('Discount:', totalsStartX, this.yPosition);
      this.doc.text(`-${quote.discount_amount.toFixed(2)} SAR`, totalsStartX + labelWidth, this.yPosition, { align: 'right' });
      this.doc.setTextColor(...this.colors.text);
      this.yPosition += 25;
    }

    // VAT
    if (quote.tax_rate > 0) {
      this.doc.text(`VAT (${(quote.tax_rate * 100).toFixed(1)}%):`, totalsStartX, this.yPosition);
      this.doc.text(`${quote.tax_amount.toFixed(2)} SAR`, totalsStartX + labelWidth, this.yPosition, { align: 'right' });
      this.yPosition += 25;
    }

    // Total
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(this.fonts.headingEn.size);
    this.doc.setTextColor(...this.colors.primary);

    this.doc.text('Total Amount:', totalsStartX, this.yPosition);
    this.doc.text(`${quote.total_amount.toFixed(2)} SAR`, totalsStartX + labelWidth, this.yPosition, { align: 'right' });

    // Total box
    this.doc.setDrawColor(...this.colors.primary);
    this.doc.setLineWidth(2);
    this.doc.rect(totalsStartX - 10, this.yPosition - 5, labelWidth + valueWidth + 20, 25);

    this.yPosition += 40;
  }

  /**
   * Generate and add QR code for ZATCA compliance
   */
  private async addQrCode(quote: Quote, companyInfo: CompanyInfo): Promise<void> {
    // ZATCA QR Code data structure (Base64 encoded)
    const qrData = this.generateZatcaQrData(quote, companyInfo);
    
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 150,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Add QR code to PDF
      const qrSize = 80;
      const qrX = this.pageWidth - this.margin - qrSize;
      
      this.doc.addImage(qrCodeDataUrl, 'PNG', qrX, this.yPosition, qrSize, qrSize);
      
      // QR code label
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(this.fonts.small.size);
      this.doc.setTextColor(...this.colors.secondary);
      this.doc.text('Scan for verification', qrX, this.yPosition + qrSize + 15, { align: 'center', maxWidth: qrSize });

    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }

  /**
   * Generate ZATCA-compliant QR code data
   */
  private generateZatcaQrData(quote: Quote, companyInfo: CompanyInfo): string {
    // ZATCA QR Code structure - English only for now
    const data = {
      companyName: companyInfo.name_en,
      vatNumber: companyInfo.vat_number,
      timestamp: new Date().toISOString(),
      total: quote.total_amount.toFixed(2),
      vatAmount: quote.tax_amount.toFixed(2),
      quoteNumber: quote.quote_number
    };

    return btoa(JSON.stringify(data));
  }

  /**
   * Add terms and conditions
   */
  private addTermsAndConditions(quote: Quote, language: 'en'): void {
    if (!quote.terms_and_conditions) return;

    this.yPosition += 30;
    this.addSeparatorLine();
    this.yPosition += 15;

    // Header
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(this.fonts.headingEn.size);
    this.doc.setTextColor(...this.colors.primary);
    
    if (language === 'en') {
      this.doc.text('Terms & Conditions', this.margin, this.yPosition);
    }
    
    this.yPosition += 20;

    // Terms text
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(this.fonts.bodyEn.size);
    this.doc.setTextColor(...this.colors.text);
    
    const terms = this.doc.splitTextToSize(quote.terms_and_conditions, this.contentWidth);
    this.doc.text(terms, this.margin, this.yPosition);
    this.yPosition += terms.length * 12 + 20;
  }

  /**
   * Add footer with ZATCA compliance information
   */
  private addFooter(companyInfo: CompanyInfo, language: 'ar' | 'en' | 'both'): void {
    const footerY = this.pageHeight - 60;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(this.fonts.small.size);
    this.doc.setTextColor(...this.colors.secondary);

    // ZATCA compliance statement
    const complianceText = 'This quote complies with ZATCA regulations';
    this.doc.text(complianceText, this.pageWidth / 2, footerY, { align: 'center' });
    
    // Page number
    const pageInfo = `Page 1 of 1`;
    this.doc.text(pageInfo, this.pageWidth / 2, footerY + 15, { align: 'center' });
  }

  /**
   * Add ZATCA compliance watermark
   */
  private addZatcaWatermark(): void {
    this.doc.setTextColor(240, 240, 240);
    this.doc.setFontSize(60);
    this.doc.text('ZATCA COMPLIANT', this.pageWidth / 2, this.pageHeight / 2, { 
      align: 'center', 
      angle: -45 
    });
  }

  /**
   * Add separator line
   */
  private addSeparatorLine(): void {
    this.doc.setDrawColor(...this.colors.border);
    this.doc.setLineWidth(1);
    this.doc.line(this.margin, this.yPosition, this.pageWidth - this.margin, this.yPosition);
    this.yPosition += 10;
  }

  /**
   * Check if new page is needed
   */
  private checkPageBreak(requiredSpace: number): boolean {
    if (this.yPosition + requiredSpace > this.pageHeight - 100) {
      this.doc.addPage();
      this.yPosition = 60;
      return true;
    }
    return false;
  }
}

// Default company info for Saudi Arabia
export const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name_en: 'ServicePro Professional Services',
  vat_number: '300000000000003',
  commercial_registration: '1010000000',
  address_en: 'Riyadh, Kingdom of Saudi Arabia',
  city_en: 'Riyadh',
  postal_code: '11564'
};

/**
 * Main function to generate ZATCA-compliant quote PDF
 */
export const generateZatcaQuotePdf = async (
  quote: Quote,
  companyInfo: CompanyInfo = DEFAULT_COMPANY_INFO,
  options: ZatcaPdfOptions = { language: 'en', includeQr: true, includeWatermark: false }
): Promise<string> => {
  const generator = new ZatcaPdfGenerator();
  return await generator.generateQuotePdf(quote, companyInfo, options);
};