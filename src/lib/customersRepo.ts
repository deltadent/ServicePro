import { supabase } from '@/integrations/supabase/client';
import { dbService, type Customer } from './db';

/**
 * Offline-first customers repository
 * Implements network-first strategy with local caching
 */

export interface CustomersListOptions {
  isActive?: boolean;
  customerType?: 'residential' | 'commercial';
  limit?: number;
  offset?: number;
  searchTerm?: string;
}

export interface CustomersListResult {
  customers: Customer[];
  count: number;
  fromCache: boolean;
}

/**
 * Fetches customers list with offline-first strategy
 * @param options - Query options for filtering customers
 * @returns Promise resolving to customers list with metadata
 */
export async function fetchCustomersList(options: CustomersListOptions = {}): Promise<CustomersListResult> {
  const { isActive, customerType, limit = 50, offset = 0, searchTerm } = options;

  try {
    // Try network first
    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (isActive !== undefined) {
      query = query.eq('is_active', isActive);
    }

    if (customerType) {
      query = query.eq('customer_type', customerType);
    }

    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,phone_mobile.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%`);
    }

    const { data: customers, error, count } = await query;

    if (error) throw error;

    // Cache successful network response
    const db = await dbService.getDB();
    const tx = db.transaction('customers', 'readwrite');

    for (const customer of customers || []) {
      await tx.store.put(customer);
    }

    await tx.done;

    console.log(`Cached ${customers?.length || 0} customers from network`);
    return {
      customers: customers || [],
      count: count || 0,
      fromCache: false
    };

  } catch (error) {
    console.warn('Network request failed, falling back to cache:', error);

    // Fallback to cache
    try {
      const db = await dbService.getDB();
      const allCustomers = await db.getAll('customers');

      // Filter customers based on criteria
      let filteredCustomers = allCustomers;
      if (isActive !== undefined) {
        filteredCustomers = filteredCustomers.filter(customer => customer.is_active === isActive);
      }
      if (customerType) {
        filteredCustomers = filteredCustomers.filter(customer => customer.customer_type === customerType);
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredCustomers = filteredCustomers.filter(customer =>
          customer.name.toLowerCase().includes(term) ||
          (customer.email && customer.email.toLowerCase().includes(term)) ||
          (customer.phone && customer.phone.includes(searchTerm)) ||
          (customer.phone_mobile && customer.phone_mobile.includes(searchTerm)) ||
          (customer.first_name && customer.first_name.toLowerCase().includes(term)) ||
          (customer.last_name && customer.last_name.toLowerCase().includes(term)) ||
          (customer.company_name && customer.company_name.toLowerCase().includes(term))
        );
      }

      // Apply pagination
      const startIndex = offset;
      const endIndex = startIndex + limit;
      const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

      return {
        customers: paginatedCustomers,
        count: filteredCustomers.length,
        fromCache: true
      };

    } catch (cacheError) {
      console.error('Cache fallback also failed:', cacheError);
      return {
        customers: [],
        count: 0,
        fromCache: true
      };
    }
  }
}

/**
 * Fetches detailed customer information with offline-first strategy
 * @param customerId - The ID of the customer to fetch
 * @returns Promise resolving to detailed customer information
 */
export async function fetchCustomerDetail(customerId: string): Promise<{ customer: Customer | null; fromCache: boolean }> {
  try {
    // Try network first
    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (error) throw error;

    // Cache successful network response
    const db = await dbService.getDB();
    await db.put('customers', customer);

    console.log(`Cached customer detail for ${customerId} from network`);
    return {
      customer,
      fromCache: false
    };

  } catch (error) {
    console.warn(`Network request failed for customer ${customerId}, falling back to cache:`, error);

    // Fallback to cache
    try {
      const db = await dbService.getDB();
      const cachedCustomer = await db.get('customers', customerId);

      return {
        customer: cachedCustomer || null,
        fromCache: true
      };

    } catch (cacheError) {
      console.error('Cache fallback also failed:', cacheError);
      return {
        customer: null,
        fromCache: true
      };
    }
  }
}

/**
 * Updates local customer cache with new or modified customer data
 * @param customer - Customer data to cache
 */
export async function updateCustomerCache(customer: Customer): Promise<void> {
  try {
    const db = await dbService.getDB();
    await db.put('customers', customer);
    console.log(`Updated customer cache for ${customer.id}`);
  } catch (error) {
    console.error('Failed to update customer cache:', error);
  }
}

/**
 * Clears all cached customer data
 */
export async function clearCustomerCache(): Promise<void> {
  try {
    const db = await dbService.getDB();
    await db.clear('customers');
    console.log('Customer cache cleared');
  } catch (error) {
    console.error('Failed to clear customer cache:', error);
  }
}

/**
 * Gets cache statistics for debugging
 */
export async function getCustomerCacheStats(): Promise<{
  customersCount: number;
}> {
  try {
    const db = await dbService.getDB();
    const customersCount = await db.count('customers');

    return { customersCount };
  } catch (error) {
    console.error('Failed to get customer cache stats:', error);
    return { customersCount: 0 };
  }
}

/**
 * Creates a new customer with offline support
 * @param customerData - Customer data to create
 * @returns Promise resolving to created customer
 */
export async function createCustomer(customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> {
  try {
    // Try network first
    const { data: customer, error } = await supabase
      .from('customers')
      .insert([customerData])
      .select()
      .single();

    if (error) throw error;

    // Cache the new customer
    await updateCustomerCache(customer);

    return customer;
  } catch (error) {
    console.warn('Network request failed for creating customer, will retry when online:', error);

    // Create temporary customer for offline use
    const tempCustomer: Customer = {
      ...customerData,
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Cache the temporary customer
    await updateCustomerCache(tempCustomer);

    return tempCustomer;
  }
}

/**
 * Updates an existing customer with offline support
 * @param customerId - ID of customer to update
 * @param updates - Fields to update
 * @returns Promise resolving to updated customer
 */
export async function updateCustomer(customerId: string, updates: Partial<Customer>): Promise<Customer> {
  try {
    // Try network first
    const { data: customer, error } = await supabase
      .from('customers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', customerId)
      .select()
      .single();

    if (error) throw error;

    // Update cache
    await updateCustomerCache(customer);

    return customer;
  } catch (error) {
    console.warn('Network request failed for updating customer, will retry when online:', error);

    // Update in cache only
    const db = await dbService.getDB();
    const existingCustomer = await db.get('customers', customerId);

    if (existingCustomer) {
      const updatedCustomer: Customer = {
        ...existingCustomer,
        ...updates,
        updated_at: new Date().toISOString()
      };

      await updateCustomerCache(updatedCustomer);
      return updatedCustomer;
    }

    throw new Error('Customer not found in cache');
  }
}

/**
 * Deletes a customer with offline support
 * @param customerId - ID of customer to delete
 */
export async function deleteCustomer(customerId: string): Promise<void> {
  try {
    // Try network first
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);

    if (error) throw error;

    // Remove from cache
    const db = await dbService.getDB();
    await db.delete('customers', customerId);

  } catch (error) {
    console.warn('Network request failed for deleting customer, will retry when online:', error);

    // Mark as inactive in cache (soft delete)
    const db = await dbService.getDB();
    const existingCustomer = await db.get('customers', customerId);

    if (existingCustomer) {
      const updatedCustomer: Customer = {
        ...existingCustomer,
        is_active: false,
        updated_at: new Date().toISOString()
      };

      await updateCustomerCache(updatedCustomer);
    }
  }
}

/**
 * Exports customers to CSV format
 * @param customers - Array of customers to export
 * @param filename - Name of the file to download
 */
export async function exportCustomersToCSV(customers: Customer[], filename: string): Promise<void> {
  const { downloadCSV } = await import('./utils/csv');
  downloadCSV(customers, filename);
}

/**
 * Exports customers to Excel format
 * @param customers - Array of customers to export
 * @param filename - Name of the file to download
 */
export async function exportCustomersToExcel(customers: Customer[], filename: string): Promise<void> {
  const { downloadExcel } = await import('./utils/csv');
  downloadExcel(customers, filename);
}

/**
 * Creates a customer directly to Supabase (for import purposes)
 * @param customerData - Customer data without id, created_at, updated_at
 * @returns Promise resolving to created customer
 */
async function createCustomerDirect(customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> {
  const { data: customer, error } = await supabase
    .from('customers')
    .insert([customerData])
    .select()
    .single();

  if (error) throw error;
  return customer;
}

/**
 * Previews customer import without actually creating customers
 * @param file - File to preview
 * @returns Promise resolving to preview results
 */
export async function previewCustomerImport(file: File) {
  console.log('👁️ Starting customer import preview...');

  const { parseCSV, parseExcel, validateCustomerData } = await import('./utils/csv');

  const isCSV = file.name.toLowerCase().endsWith('.csv');
  const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');

  let result;
  if (isCSV) {
    console.log('📄 Parsing CSV file for preview...');
    result = await parseCSV(file);
  } else if (isExcel) {
    console.log('📊 Parsing Excel file for preview...');
    result = await parseExcel(file);
  } else {
    throw new Error('Unsupported file format. Please use CSV or Excel files.');
  }

  if (!result.success) {
    console.error('❌ File parsing failed:', result.errors);
    return result;
  }

  console.log(`✅ Parsed ${result.totalRows} rows, ${result.validRows} valid for preview`);

  // Validate customer data
  const validation = validateCustomerData(result.data);
  console.log(`📋 Validation complete: ${validation.valid.length} valid, ${validation.invalid.length} invalid customers`);

  // Check for duplicates without creating customers
  const duplicatesFound: string[] = [];
  const errors: string[] = [];

  console.log('🔍 Checking for duplicates...');

  for (let i = 0; i < validation.valid.length; i++) {
    const customer = validation.valid[i];
    console.log(`👤 Checking customer ${i + 1}/${validation.valid.length}: ${customer.name}`);

    try {
      // Check for existing customer
      const conditions = [];
      if (customer.name) conditions.push(`name.eq.${customer.name}`);
      if (customer.email) conditions.push(`email.eq.${customer.email}`);
      if (customer.phone_mobile) conditions.push(`phone_mobile.eq.${customer.phone_mobile}`);
      if (customer.phone) conditions.push(`phone.eq.${customer.phone}`);

      if (conditions.length > 0) {
        const { data: existingCustomers, error: duplicateCheckError } = await supabase
          .from('customers')
          .select('id, name, email, phone_mobile, phone')
          .or(conditions.join(','));

        if (duplicateCheckError) {
          console.warn(`⚠️ Error checking for duplicates: ${duplicateCheckError.message}`);
        }

        if (existingCustomers && existingCustomers.length > 0) {
          const duplicateNames = existingCustomers.map((c: any) => `${c.name} (ID: ${c.id})`).join(', ');
          const duplicateMsg = `Customer "${customer.name}" already exists as: ${duplicateNames}`;
          console.log(`⚠️ ${duplicateMsg}`);
          duplicatesFound.push(duplicateMsg);
          errors.push(duplicateMsg);
        } else {
          console.log(`✅ No duplicates found for: ${customer.name}`);
        }
      }
    } catch (error) {
      const errorMessage = `Error checking duplicates for ${customer.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`❌ ${errorMessage}`);
      errors.push(errorMessage);
    }
  }

  // Add validation errors
  validation.invalid.forEach(({ customer, errors: customerErrors }) => {
    const errorMsg = `Customer "${customer.name}": ${customerErrors.join(', ')}`;
    console.error(`❌ Validation error: ${errorMsg}`);
    errors.push(errorMsg);
  });

  const previewResult = {
    success: errors.length === 0,
    data: validation.valid,
    errors,
    duplicatesFound,
    totalRows: result.totalRows,
    validRows: validation.valid.length,
    duplicateCount: duplicatesFound.length
  };

  console.log(`👁️ Preview complete:`);
  console.log(`   📊 Valid customers: ${validation.valid.length}`);
  console.log(`   ⚠️  Duplicates found: ${duplicatesFound.length}`);
  console.log(`   ❌ Errors: ${errors.length - duplicatesFound.length}`);
  console.log('📊 Preview result:', previewResult);

  return previewResult;
}

/**
 * Imports customers from CSV or Excel file
 * @param file - File to import
 * @returns Promise resolving to import results
 */
export async function importCustomersFromFile(file: File) {
  console.log('🚀 Starting customer import process...');

  const { parseCSV, parseExcel, validateCustomerData } = await import('./utils/csv');

  const isCSV = file.name.toLowerCase().endsWith('.csv');
  const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');

  let result;
  if (isCSV) {
    console.log('📄 Parsing CSV file...');
    result = await parseCSV(file);
  } else if (isExcel) {
    console.log('📊 Parsing Excel file...');
    result = await parseExcel(file);
  } else {
    throw new Error('Unsupported file format. Please use CSV or Excel files.');
  }

  if (!result.success) {
    console.error('❌ File parsing failed:', result.errors);
    return result;
  }

  console.log(`✅ Parsed ${result.totalRows} rows, ${result.validRows} valid for processing`);

  // Validate customer data
  const validation = validateCustomerData(result.data);
  console.log(`📋 Validation complete: ${validation.valid.length} valid, ${validation.invalid.length} invalid customers`);

  // Create valid customers directly (no offline caching for imports)
  const createdCustomers: Customer[] = [];
  const errors: string[] = [];
  const duplicatesFound: string[] = [];

  console.log('🏗️ Creating customers in database...');

  for (let i = 0; i < validation.valid.length; i++) {
    const customer = validation.valid[i];
    console.log(`👤 Processing customer ${i + 1}/${validation.valid.length}: ${customer.name}`);

    try {
      // Check for existing customer first to prevent duplicates
      // Use multiple criteria to find potential duplicates
      // Note: Handle case where 'phone' column might not exist
      let selectFields = 'id, name';
      if (customer.email) selectFields += ', email';
      if (customer.phone_mobile) selectFields += ', phone_mobile';

      // Try to include phone field, but handle if it doesn't exist
      let duplicateQuery = supabase
        .from('customers')
        .select(selectFields);

      const conditions = [];
      if (customer.name) conditions.push(`name.eq.${customer.name}`);
      if (customer.email) conditions.push(`email.eq.${customer.email}`);
      if (customer.phone_mobile) conditions.push(`phone_mobile.eq.${customer.phone_mobile}`);
      // Only check phone if customer has phone data
      if (customer.phone) {
        try {
          // Test if phone column exists by attempting to select it
          await supabase.from('customers').select('phone').limit(1);
          selectFields += ', phone';
          duplicateQuery = supabase.from('customers').select(selectFields);
          conditions.push(`phone.eq.${customer.phone}`);
        } catch (error) {
          // Phone column doesn't exist, skip it
          console.log('📞 Phone column not found in database, skipping phone duplicate check');
        }
      }

      if (conditions.length > 0) {
        duplicateQuery = duplicateQuery.or(conditions.join(','));
      }

      const { data: existingCustomers, error: duplicateCheckError } = await duplicateQuery.limit(5);

      if (duplicateCheckError) {
        console.warn(`⚠️ Error checking for duplicates: ${duplicateCheckError.message}`);
      }

      if (existingCustomers && existingCustomers.length > 0) {
        const duplicateNames = existingCustomers.map((c: any) => `${c.name} (ID: ${c.id})`).join(', ');
        const duplicateMsg = `Customer "${customer.name}" already exists as: ${duplicateNames}`;
        console.log(`⚠️ ${duplicateMsg}`);
        duplicatesFound.push(duplicateMsg);
        errors.push(duplicateMsg);
        continue;
      }

      // Use direct creation for imports to avoid duplication issues
      const created = await createCustomerDirect(customer as Omit<Customer, 'id' | 'created_at' | 'updated_at'>);
      createdCustomers.push(created);
      console.log(`✅ Created customer: ${created.name} (ID: ${created.id})`);
    } catch (error) {
      const errorMessage = `Failed to create customer ${customer.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`❌ ${errorMessage}`);
      errors.push(errorMessage);
    }
  }

  // Add validation errors
  validation.invalid.forEach(({ customer, errors: customerErrors }) => {
    const errorMsg = `Customer "${customer.name}": ${customerErrors.join(', ')}`;
    console.error(`❌ Validation error: ${errorMsg}`);
    errors.push(errorMsg);
  });

  const finalResult = {
    success: errors.length === 0,
    data: createdCustomers,
    errors,
    duplicatesFound,
    totalRows: result.totalRows,
    validRows: createdCustomers.length,
    duplicateCount: duplicatesFound.length
  };

  console.log(`🎯 Import complete:`);
  console.log(`   ✅ Created: ${createdCustomers.length} customers`);
  console.log(`   ⚠️  Duplicates found: ${duplicatesFound.length}`);
  console.log(`   ❌ Errors: ${errors.length}`);
  console.log('📊 Final result:', finalResult);

  return finalResult;
}