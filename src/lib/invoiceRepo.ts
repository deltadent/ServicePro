/**
 * Invoice Repository
 * Handles invoice generation from jobs, ZATCA compliance, and invoice management
 */

import { supabase } from '@/integrations/supabase/client';
import { dbService } from './db';
import { generateNextDocumentNumber, getCompanySettings } from './companyRepo';
import { calculateJobCostBreakdown, formatCurrency } from './utils/jobCalculations';
import type { CompanySettings } from './types/company';

export interface Invoice {
  id: string;
  job_id: string;
  quote_id?: string;
  invoice_number: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  
  // Customer information (snapshot)
  customer_name: string;
  customer_email?: string;
  customer_address?: string;
  customer_phone?: string;
  customer_type: 'residential' | 'commercial';
  
  // Job information (snapshot)
  job_title: string;
  job_description?: string;
  service_date: string;
  completion_date?: string;
  technician_name?: string;
  
  // Financial breakdown
  labor_cost: number;
  parts_cost: number;
  additional_charges: number;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  discount_amount: number;
  total_amount: number;
  
  // ZATCA compliance
  zatca_qr_code?: string;
  zatca_invoice_hash?: string;
  commercial_registration?: string;
  vat_registration_number?: string;
  
  // Payment tracking
  payment_terms?: string;
  payment_method?: string;
  payment_reference?: string;
  
  // Dates
  issued_date: string;
  due_date: string;
  paid_date?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  item_type: 'labor' | 'parts' | 'service' | 'additional';
  job_checklist_item_id?: string;
  sort_order: number;
}

export interface CreateInvoiceRequest {
  job_id: string;
  due_days?: number;
  additional_charges?: number;
  discount_amount?: number;
  payment_terms?: string;
  notes?: string;
}

export interface InvoiceGenerationResult {
  invoice: Invoice;
  invoice_items: InvoiceItem[];
  company_settings: CompanySettings;
  zatca_qr_code?: string;
}

/**
 * Generate invoice from completed job
 */
export async function generateInvoiceFromJob(
  request: CreateInvoiceRequest
): Promise<InvoiceGenerationResult> {
  const { job_id, due_days = 30, additional_charges = 0, discount_amount = 0 } = request;

  try {
    // Get job details with all related data
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        customer:customers(*),
        technician:profiles!jobs_technician_id_fkey(full_name, email),
        job_parts(*, parts_inventory(name, part_number, unit_cost)),
        job_checklist:job_checklists(*, items:job_checklist_items(*))
      `)
      .eq('id', job_id)
      .single();

    if (jobError) throw jobError;
    if (!jobData) throw new Error('Job not found');
    if (jobData.status !== 'completed') {
      throw new Error('Can only generate invoices for completed jobs');
    }

    // Get company settings for VAT, numbering, etc.
    const companySettings = await getCompanySettings();
    if (!companySettings) throw new Error('Company settings not configured');

    // Generate invoice number
    const invoiceNumber = await generateNextDocumentNumber('invoice');

    // Calculate costs from job data
    const invoiceItems: Omit<InvoiceItem, 'invoice_id'>[] = [];
    let laborCost = 0;
    let partsCost = 0;

    // Add labor/service costs from checklist items
    if (jobData.job_checklist?.items) {
      jobData.job_checklist.items.forEach((item: any, index: number) => {
        if (item.completed && item.required) {
          const laborRate = jobData.estimated_cost ? 
            (jobData.estimated_cost * 0.6) / jobData.job_checklist.items.filter((i: any) => i.required).length :
            150; // Default hourly rate

          invoiceItems.push({
            id: `item-${Date.now()}-${index}`,
            description: item.text || 'Service Item',
            quantity: 1,
            unit_price: laborRate,
            total_price: laborRate,
            item_type: 'service',
            job_checklist_item_id: item.id,
            sort_order: index + 1
          });
          
          laborCost += laborRate;
        }
      });
    }

    // Add parts costs
    if (jobData.job_parts && jobData.job_parts.length > 0) {
      jobData.job_parts.forEach((jobPart: any, index: number) => {
        const partCost = (jobPart.parts_inventory?.unit_cost || 0) * jobPart.quantity_used;
        
        invoiceItems.push({
          id: `part-${Date.now()}-${index}`,
          description: jobPart.parts_inventory?.name || 'Parts',
          quantity: jobPart.quantity_used,
          unit_price: jobPart.parts_inventory?.unit_cost || 0,
          total_price: partCost,
          item_type: 'parts',
          sort_order: invoiceItems.length + 1
        });
        
        partsCost += partCost;
      });
    }

    // Add additional charges if any
    if (additional_charges > 0) {
      invoiceItems.push({
        id: `additional-${Date.now()}`,
        description: 'Additional Charges',
        quantity: 1,
        unit_price: additional_charges,
        total_price: additional_charges,
        item_type: 'additional',
        sort_order: invoiceItems.length + 1
      });
    }

    // Calculate totals
    const subtotal = laborCost + partsCost + additional_charges;
    const vatRate = companySettings.default_vat_rate || 0.15;
    const vatAmount = (subtotal - discount_amount) * vatRate;
    const totalAmount = subtotal - discount_amount + vatAmount;

    // Prepare invoice data
    const invoiceData: Omit<Invoice, 'id' | 'created_at' | 'updated_at'> = {
      job_id,
      quote_id: jobData.quote_id,
      invoice_number: invoiceNumber,
      status: 'draft',
      
      // Customer snapshot
      customer_name: jobData.customer.name,
      customer_email: jobData.customer.email,
      customer_address: jobData.customer.address,
      customer_phone: jobData.customer.phone_mobile || jobData.customer.phone_work,
      customer_type: jobData.customer.customer_type,
      
      // Job snapshot
      job_title: jobData.title,
      job_description: jobData.description,
      service_date: jobData.scheduled_date,
      completion_date: jobData.completed_at,
      technician_name: jobData.technician?.full_name,
      
      // Financial breakdown
      labor_cost: laborCost,
      parts_cost: partsCost,
      additional_charges,
      subtotal,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      discount_amount,
      total_amount: totalAmount,
      
      // ZATCA fields
      commercial_registration: companySettings.commercial_registration,
      vat_registration_number: companySettings.vat_number,
      
      // Payment
      payment_terms: request.payment_terms || `Net ${due_days} days`,
      
      // Dates
      issued_date: new Date().toISOString(),
      due_date: new Date(Date.now() + due_days * 24 * 60 * 60 * 1000).toISOString(),
      
      created_by: (await supabase.auth.getUser()).data.user?.id || 'system'
    };

    // Create invoice in database
    const { data: createdInvoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert(invoiceData)
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Create invoice items
    const itemsWithInvoiceId = invoiceItems.map(item => ({
      ...item,
      invoice_id: createdInvoice.id
    }));

    const { data: createdItems, error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsWithInvoiceId)
      .select();

    if (itemsError) throw itemsError;

    // Generate ZATCA QR code if enabled
    let zatcaQrCode: string | undefined;
    if (companySettings.is_zatca_enabled) {
      zatcaQrCode = await generateZATCAQRCode(createdInvoice, companySettings);
      
      // Update invoice with QR code
      if (zatcaQrCode) {
        await supabase
          .from('invoices')
          .update({ zatca_qr_code: zatcaQrCode })
          .eq('id', createdInvoice.id);
      }
    }

    // Cache in IndexedDB
    const db = await dbService.getDB();
    await db.put('invoices', createdInvoice);

    return {
      invoice: createdInvoice,
      invoice_items: createdItems || [],
      company_settings: companySettings,
      zatca_qr_code: zatcaQrCode
    };

  } catch (error) {
    console.error('Failed to generate invoice from job:', error);
    throw error;
  }
}

/**
 * Generate ZATCA-compliant QR code
 */
async function generateZATCAQRCode(
  invoice: Invoice, 
  companySettings: CompanySettings
): Promise<string> {
  // ZATCA QR code contains specific fields in Base64 encoded format
  // This is a simplified implementation - full ZATCA compliance requires more fields
  
  const qrData = {
    companyName: companySettings.company_name_en,
    vatNumber: companySettings.vat_number || '',
    timestamp: invoice.issued_date,
    totalAmount: invoice.total_amount.toFixed(2),
    vatAmount: invoice.vat_amount.toFixed(2),
    invoiceNumber: invoice.invoice_number
  };

  // Convert to Base64 (simplified - real ZATCA has specific encoding rules)
  const qrString = JSON.stringify(qrData);
  return btoa(qrString);
}

/**
 * Get invoice by ID
 */
export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to get invoice:', error);
    return null;
  }
}

/**
 * Update invoice status
 */
export async function updateInvoiceStatus(
  invoiceId: string, 
  status: Invoice['status'],
  paymentReference?: string
): Promise<void> {
  try {
    const updateData: any = { 
      status, 
      updated_at: new Date().toISOString() 
    };
    
    if (status === 'paid') {
      updateData.paid_date = new Date().toISOString();
      if (paymentReference) {
        updateData.payment_reference = paymentReference;
      }
    }

    const { error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to update invoice status:', error);
    throw error;
  }
}

/**
 * Get invoices list with filters
 */
export async function getInvoices(filters?: {
  status?: Invoice['status'];
  customer_id?: string;
  date_from?: string;
  date_to?: string;
  job_id?: string;
}): Promise<Invoice[]> {
  try {
    let query = supabase.from('invoices').select('*');

    if (filters) {
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.job_id) query = query.eq('job_id', filters.job_id);
      if (filters.date_from) query = query.gte('issued_date', filters.date_from);
      if (filters.date_to) query = query.lte('issued_date', filters.date_to);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to get invoices:', error);
    return [];
  }
}

/**
 * Delete invoice (only drafts)
 */
export async function deleteInvoice(invoiceId: string): Promise<void> {
  try {
    // First check if it's a draft
    const invoice = await getInvoice(invoiceId);
    if (!invoice || invoice.status !== 'draft') {
      throw new Error('Only draft invoices can be deleted');
    }

    // Delete invoice items first
    await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);
    
    // Then delete invoice
    const { error } = await supabase.from('invoices').delete().eq('id', invoiceId);
    if (error) throw error;
  } catch (error) {
    console.error('Failed to delete invoice:', error);
    throw error;
  }
}