import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Customer } from '@/components/CustomerColumns';
import { normalizeToE164Saudi } from '@/lib/phone';

export interface ImportResult {
  success: boolean;
  data: Partial<Customer>[];
  errors: string[];
  totalRows: number;
  validRows: number;
}

/**
 * Downloads data as CSV file
 */
export function downloadCSV(data: any[], filename: string): void {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Downloads data as Excel file
 */
export function downloadExcel(data: any[], filename: string): void {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Customers');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Parses CSV file and returns customer data
 */
export function parseCSV(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const { data, errors } = results;
        const customers: Partial<Customer>[] = [];
        const parseErrors: string[] = [];

        // Map CSV headers to customer fields
        data.forEach((row: any, index: number) => {
          const customer = mapRowToCustomer(row, index + 2); // +2 because of 0-based index and header row
          if (customer) {
            customers.push(customer);
          }
        });

        parseErrors.push(...errors.map(err => `Row ${err.row}: ${err.message}`));

        resolve({
          success: parseErrors.length === 0,
          data: customers,
          errors: parseErrors,
          totalRows: data.length,
          validRows: customers.length
        });
      },
      error: (error) => {
        resolve({
          success: false,
          data: [],
          errors: [`Failed to parse CSV: ${error.message}`],
          totalRows: 0,
          validRows: 0
        });
      }
    });
  });
}

/**
 * Parses Excel file and returns customer data
 */
export function parseExcel(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          resolve({
            success: false,
            data: [],
            errors: ['Excel file must contain at least a header row and one data row'],
            totalRows: 0,
            validRows: 0
          });
          return;
        }

        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1) as any[][];
        const customers: Partial<Customer>[] = [];
        const parseErrors: string[] = [];

        rows.forEach((row: any[], index: number) => {
          const rowData: any = {};
          headers.forEach((header, colIndex) => {
            rowData[header] = row[colIndex];
          });

          const customer = mapRowToCustomer(rowData, index + 2); // +2 for header and 0-based
          if (customer) {
            customers.push(customer);
          }
        });

        resolve({
          success: parseErrors.length === 0,
          data: customers,
          errors: parseErrors,
          totalRows: rows.length,
          validRows: customers.length
        });

      } catch (error) {
        resolve({
          success: false,
          data: [],
          errors: [`Failed to parse Excel: ${error instanceof Error ? error.message : 'Unknown error'}`],
          totalRows: 0,
          validRows: 0
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        data: [],
        errors: ['Failed to read file'],
        totalRows: 0,
        validRows: 0
      });
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Maps a row of data to customer object
 */
function mapRowToCustomer(row: any, rowNumber: number): Partial<Customer> | null {
  const customer: Partial<Customer> = {};

  // Map common field names (case-insensitive)
  const fieldMappings = {
    name: ['name', 'customer_name', 'customername', 'full_name', 'fullname'],
    email: ['email', 'email_address', 'emailaddress', 'e-mail'],
    phone: ['phone', 'phone_number', 'phonenumber', 'telephone', 'mobile', 'cell'],
    phone_mobile: ['phone_mobile', 'mobile_phone', 'mobilephone', 'cell_phone', 'cellphone'],
    phone_work: ['phone_work', 'work_phone', 'workphone', 'office_phone', 'officephone'],
    address: ['address', 'street_address', 'streetaddress', 'full_address'],
    short_address: ['short_address', 'shortaddress', 'brief_address'],
    city: ['city'],
    state: ['state', 'province', 'region'],
    zip_code: ['zip_code', 'zipcode', 'postal_code', 'postcode', 'zip'],
    country: ['country'],
    customer_type: ['customer_type', 'customertype', 'type', 'category'],
    is_active: ['is_active', 'isactive', 'active', 'status'],
    first_name: ['first_name', 'firstname', 'first'],
    last_name: ['last_name', 'lastname', 'last'],
    company_name: ['company_name', 'companyname', 'company', 'organization', 'organisation'],
    preferred_contact: ['preferred_contact', 'preferredcontact', 'contact_preference', 'contactpreference'],
    email_enabled: ['email_enabled', 'emailenabled', 'email_active', 'emailactive'],
    whatsapp_enabled: ['whatsapp_enabled', 'whatsappenabled', 'whatsapp_active', 'whatsappactive'],
    tags: ['tags']
  };

  // Find and map fields
  Object.entries(fieldMappings).forEach(([field, possibleNames]) => {
    for (const name of possibleNames) {
      if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
        let value = row[name];

        // Type conversion
        if (field === 'customer_type') {
          value = typeof value === 'string' ? value.toLowerCase() : value;
          if (value === 'commercial' || value === 'business') {
            value = 'commercial';
          } else {
            value = 'residential';
          }
        } else if (field === 'is_active' || field === 'email_enabled' || field === 'whatsapp_enabled') {
          if (typeof value === 'string') {
            value = value.toLowerCase();
            value = value === 'true' || value === 'yes' || value === 'active' || value === '1';
          } else if (typeof value === 'number') {
            value = value === 1;
          }
          value = Boolean(value);
        } else if (field === 'phone_mobile' || field === 'phone_work') {
          // Normalize phone numbers to E.164 format
          if (value && typeof value === 'string') {
            const normalized = normalizeToE164Saudi(value);
            value = normalized || value; // Keep original if normalization fails
          }
        } else if (field === 'preferred_contact') {
          // Ensure valid preferred contact values
          const validContacts = ['mobile', 'work', 'email', 'whatsapp'];
          if (typeof value === 'string' && !validContacts.includes(value.toLowerCase())) {
            value = 'mobile'; // Default to mobile if invalid
          } else if (typeof value === 'string') {
            value = value.toLowerCase();
          }
        } else if (field === 'tags') {
          // Convert tags string to array
          if (typeof value === 'string') {
            value = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
          } else if (!Array.isArray(value)) {
            value = [];
          }
        }

        (customer as any)[field] = value;
        break;
      }
    }
  });

  // Validate required fields
  if (!customer.name || typeof customer.name !== 'string') {
    return null; // Name is required
  }

  return customer;
}

/**
 * Validates customer data before import
 */
export function validateCustomerData(customers: Partial<Customer>[]): {
  valid: Omit<Customer, 'id' | 'created_at' | 'updated_at'>[];
  invalid: { customer: Partial<Customer>; errors: string[] }[];
} {
  const valid: Omit<Customer, 'id' | 'created_at' | 'updated_at'>[] = [];
  const invalid: { customer: Partial<Customer>; errors: string[] }[] = [];

  customers.forEach((customer, index) => {
    const errors: string[] = [];

    // Required fields
    if (!customer.name || customer.name.trim().length === 0) {
      errors.push('Name is required');
    }

    // Email validation
    if (customer.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customer.email)) {
        errors.push('Invalid email format');
      }
    }

    // Phone validation (optional but if provided should be reasonable)
    if (customer.phone && customer.phone.length < 5) {
      errors.push('Phone number seems too short');
    }

    // Customer type validation
    if (customer.customer_type && !['residential', 'commercial'].includes(customer.customer_type)) {
      errors.push('Customer type must be either "residential" or "commercial"');
    }

    if (errors.length === 0) {
      // Create a complete customer object with defaults (excluding id for auto-generation)
      const validCustomer: Omit<Customer, 'id'> = {
        name: customer.name!,
        customer_type: customer.customer_type || 'residential',
        phone: customer.phone || null,
        email: customer.email || null,
        address: customer.address || null,
        short_address: customer.short_address || null,
        city: customer.city || null,
        state: customer.state || null,
        zip_code: customer.zip_code || null,
        is_active: customer.is_active !== undefined ? customer.is_active : true,
        // New fields with defaults
        first_name: customer.first_name || null,
        last_name: customer.last_name || null,
        company_name: customer.company_name || null,
        phone_mobile: customer.phone_mobile || null,
        phone_work: customer.phone_work || null,
        preferred_contact: customer.preferred_contact || null,
        email_enabled: customer.email_enabled !== undefined ? customer.email_enabled : true,
        whatsapp_enabled: customer.whatsapp_enabled !== undefined ? customer.whatsapp_enabled : false,
        tags: customer.tags || null,
        country: customer.country || null
      };
      valid.push(validCustomer as Customer);
    } else {
      invalid.push({ customer, errors });
    }
  });

  return { valid, invalid };
}

/**
 * Gets CSV template for customers
 */
export function getCustomerCSVTemplate(): string {
  const headers = [
    'name',
    'first_name',
    'last_name',
    'company_name',
    'email',
    'phone_mobile',
    'phone_work',
    'preferred_contact',
    'email_enabled',
    'whatsapp_enabled',
    'address',
    'short_address',
    'city',
    'state',
    'zip_code',
    'country',
    'customer_type',
    'is_active',
    'tags'
  ];

  const sampleData = [
    {
      name: 'John Doe',
      first_name: 'John',
      last_name: 'Doe',
      company_name: '',
      email: 'john@example.com',
      phone_mobile: '+966501234567',
      phone_work: '+966501234568',
      preferred_contact: 'mobile',
      email_enabled: 'TRUE',
      whatsapp_enabled: 'FALSE',
      address: '123 Main Street, Riyadh',
      short_address: '123 Main St',
      city: 'Riyadh',
      state: 'Riyadh Province',
      zip_code: '12345',
      country: 'Saudi Arabia',
      customer_type: 'residential',
      is_active: 'TRUE',
      tags: 'vip,regular'
    },
    {
      name: 'ABC Company',
      first_name: '',
      last_name: '',
      company_name: 'ABC Company',
      email: 'contact@abc.com',
      phone_mobile: '+966501234569',
      phone_work: '+966501234570',
      preferred_contact: 'email',
      email_enabled: 'TRUE',
      whatsapp_enabled: 'TRUE',
      address: '456 Business Avenue, Jeddah',
      short_address: '456 Business Ave',
      city: 'Jeddah',
      state: 'Makkah Province',
      zip_code: '23456',
      country: 'Saudi Arabia',
      customer_type: 'commercial',
      is_active: 'TRUE',
      tags: 'business,enterprise'
    }
  ];

  return Papa.unparse(sampleData);
}

/**
 * Gets Excel template for customers
 */
export function getCustomerExcelTemplate(): void {
  const sampleData = [
    {
      name: 'John Doe',
      first_name: 'John',
      last_name: 'Doe',
      company_name: '',
      email: 'john@example.com',
      phone_mobile: '+966501234567',
      phone_work: '+966501234568',
      preferred_contact: 'mobile',
      email_enabled: 'TRUE',
      whatsapp_enabled: 'FALSE',
      address: '123 Main Street, Riyadh',
      short_address: '123 Main St',
      city: 'Riyadh',
      state: 'Riyadh Province',
      zip_code: '12345',
      country: 'Saudi Arabia',
      customer_type: 'residential',
      is_active: 'TRUE',
      tags: 'vip,regular'
    },
    {
      name: 'ABC Company',
      first_name: '',
      last_name: '',
      company_name: 'ABC Company',
      email: 'contact@abc.com',
      phone_mobile: '+966501234569',
      phone_work: '+966501234570',
      preferred_contact: 'email',
      email_enabled: 'TRUE',
      whatsapp_enabled: 'TRUE',
      address: '456 Business Avenue, Jeddah',
      short_address: '456 Business Ave',
      city: 'Jeddah',
      state: 'Makkah Province',
      zip_code: '23456',
      country: 'Saudi Arabia',
      customer_type: 'commercial',
      is_active: 'TRUE',
      tags: 'business,enterprise'
    }
  ];

  downloadExcel(sampleData, 'customer_template');
}