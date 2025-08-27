import { supabase } from '@/integrations/supabase/client';
import { normalizeToE164Saudi } from './phone';

/**
 * Backfill utility for migrating existing customers to new schema
 */

export interface BackfillResult {
  success: boolean;
  totalRows: number;
  rowsToUpdate: number;
  rowsUpdated: number;
  errors: string[];
  preview?: BackfillPreviewItem[];
}

export interface BackfillPreviewItem {
  id: string;
  currentName: string;
  newFirstName?: string;
  newLastName?: string;
  newCompanyName?: string;
  currentPhone?: string;
  newPhoneMobile?: string;
  newPreferredContact: string;
  action: 'split_name' | 'use_company' | 'no_change';
}

/**
 * Analyzes existing customers and generates preview of changes
 */
export async function previewCustomerBackfill(): Promise<BackfillResult> {
  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, name, phone, first_name, last_name, company_name, phone_mobile')
      .is('first_name', null)
      .is('last_name', null)
      .is('company_name', null);

    if (error) throw error;

    const preview: BackfillPreviewItem[] = [];
    let rowsToUpdate = 0;

    for (const customer of customers || []) {
      const previewItem = analyzeCustomerForBackfill(customer);
      preview.push(previewItem);

      if (previewItem.action !== 'no_change') {
        rowsToUpdate++;
      }
    }

    return {
      success: true,
      totalRows: customers?.length || 0,
      rowsToUpdate,
      rowsUpdated: 0,
      errors: [],
      preview
    };

  } catch (error) {
    return {
      success: false,
      totalRows: 0,
      rowsToUpdate: 0,
      rowsUpdated: 0,
      errors: [`Failed to analyze customers: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Executes the backfill operation on existing customers
 */
export async function executeCustomerBackfill(batchSize: number = 50): Promise<BackfillResult> {
  try {
    // First get a preview to know what we're working with
    const preview = await previewCustomerBackfill();
    if (!preview.success || preview.rowsToUpdate === 0) {
      return preview;
    }

    let rowsUpdated = 0;
    const errors: string[] = [];

    // Process customers in batches
    for (let i = 0; i < preview.preview!.length; i += batchSize) {
      const batch = preview.preview!.slice(i, i + batchSize);
      const batchResults = await processBatch(batch);

      rowsUpdated += batchResults.updated;
      errors.push(...batchResults.errors);
    }

    return {
      success: errors.length === 0,
      totalRows: preview.totalRows,
      rowsToUpdate: preview.rowsToUpdate,
      rowsUpdated,
      errors
    };

  } catch (error) {
    return {
      success: false,
      totalRows: 0,
      rowsToUpdate: 0,
      rowsUpdated: 0,
      errors: [`Failed to execute backfill: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Analyzes a single customer for backfill changes
 */
function analyzeCustomerForBackfill(customer: any): BackfillPreviewItem {
  const nameParts = customer.name ? customer.name.trim().split(' ') : [];
  let action: 'split_name' | 'use_company' | 'no_change' = 'no_change';
  let newFirstName: string | undefined;
  let newLastName: string | undefined;
  let newCompanyName: string | undefined;
  let newPhoneMobile: string | undefined;
  let newPreferredContact = 'email';

  // Determine name handling
  if (nameParts.length === 2 && nameParts[0] && nameParts[1]) {
    // Looks like "First Last"
    action = 'split_name';
    newFirstName = nameParts[0];
    newLastName = nameParts[1];
  } else if (nameParts.length > 0) {
    // Treat as company name
    action = 'use_company';
    newCompanyName = customer.name.trim();
  }

  // Handle phone normalization
  if (customer.phone && !customer.phone_mobile) {
    const normalized = normalizeToE164Saudi(customer.phone);
    if (normalized) {
      newPhoneMobile = normalized;
      newPreferredContact = 'mobile';
    }
  }

  return {
    id: customer.id,
    currentName: customer.name || '',
    newFirstName,
    newLastName,
    newCompanyName,
    currentPhone: customer.phone,
    newPhoneMobile,
    newPreferredContact,
    action
  };
}

/**
 * Processes a batch of customers for backfill
 */
async function processBatch(batch: BackfillPreviewItem[]): Promise<{ updated: number; errors: string[] }> {
  let updated = 0;
  const errors: string[] = [];

  for (const item of batch) {
    try {
      const updateData: any = {
        preferred_contact: item.newPreferredContact
      };

      if (item.newFirstName && item.newLastName) {
        updateData.first_name = item.newFirstName;
        updateData.last_name = item.newLastName;
      } else if (item.newCompanyName) {
        updateData.company_name = item.newCompanyName;
      }

      if (item.newPhoneMobile) {
        updateData.phone_mobile = item.newPhoneMobile;
      }

      // Only update if there are changes to make
      if (Object.keys(updateData).length > 1) { // More than just preferred_contact
        const { error } = await supabase
          .from('customers')
          .update(updateData)
          .eq('id', item.id);

        if (error) throw error;
        updated++;
      }
    } catch (error) {
      errors.push(`Failed to update customer ${item.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { updated, errors };
}

/**
 * Gets backfill statistics for reporting
 */
export async function getBackfillStatistics(): Promise<{
  totalCustomers: number;
  migratedCustomers: number;
  pendingMigration: number;
  migrationPercentage: number;
}> {
  try {
    // Total customers
    const { count: totalCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    // Migrated customers (have new fields populated)
    const { count: migratedCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .or('first_name.not.is.null,last_name.not.is.null,company_name.not.is.null');

    const pendingMigration = (totalCustomers || 0) - (migratedCustomers || 0);
    const migrationPercentage = totalCustomers ? ((migratedCustomers || 0) / totalCustomers) * 100 : 0;

    return {
      totalCustomers: totalCustomers || 0,
      migratedCustomers: migratedCustomers || 0,
      pendingMigration,
      migrationPercentage: Math.round(migrationPercentage * 100) / 100
    };

  } catch (error) {
    throw new Error(`Failed to get backfill statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}