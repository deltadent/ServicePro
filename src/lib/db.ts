import { openDB, type IDBPDatabase } from 'idb';

/**
 * IndexedDB wrapper for ServicePro offline functionality
 * Manages local storage for jobs, job details, offline queue, and metadata
 */

export interface Job {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  scheduled_date: string;
  created_at: string;
  technician_id: string;
  customers?: {
    name: string;
    phone_mobile?: string;
    phone_work?: string;
    preferred_contact?: 'mobile' | 'work' | 'email' | 'whatsapp' | null;
    address?: string;
    short_address?: string;
  };
  total_cost?: number;
  started_at?: string;
  completed_at?: string;
}

export interface JobDetail extends Job {
  notes?: string;
  photos?: string[];
  timesheets?: TimesheetEntry[];
}

export interface TimesheetEntry {
  id: string;
  job_id: string;
  event: 'check_in' | 'check_out';
  timestamp: string;
  latitude?: number;
  longitude?: number;
  created_by: string;
}

export interface QueueItem {
  id: string;
  type: 'NOTE' | 'PHOTO' | 'CHECK' | 'QUOTE_CREATE' | 'QUOTE_UPDATE' | 'QUOTE_APPROVE' | 'QUOTE_DECLINE' | 'QUOTE_SEND';
  payload: any;
  timestamp: string;
  jobId?: string;
}

export interface Customer {
  id: string;
  name: string;
  customer_type: "residential" | "commercial";
  phone?: string | null; // Made optional since it might not exist in all database schemas
  email: string | null;
  address: string | null;
  short_address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  // New fields for person/company support
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  phone_mobile?: string | null;
  phone_work?: string | null;
  preferred_contact?: 'mobile' | 'work' | 'email' | 'whatsapp' | null;
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  tags?: string[] | null;
  country?: string | null;
}

export interface MetaData {
  key: string;
  value: any;
  updated_at: string;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  description?: string;
  items: ChecklistItem[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  required: boolean;
  completed?: boolean;
  completed_at?: string;
}

export interface JobChecklist {
  id: string;
  job_id: string;
  template_id?: string;
  template_name?: string;
  items: ChecklistItem[];
  completed_count: number;
  total_count: number;
  created_at: string;
  updated_at: string;
}

export type ServiceProDB = IDBPDatabase<{
  jobs: Job;
  jobDetails: JobDetail;
  customers: Customer;
  jobChecklists: JobChecklist;
  checklistTemplates: ChecklistTemplate;
  quotes: any; // Will use Quote type from quotes.ts to avoid circular dependency
  quoteTemplates: any; // Will use QuoteTemplate type from quotes.ts
  queues: QueueItem;
  meta: MetaData;
}>;

const DB_NAME = 'servicepro-db';
const DB_VERSION = 4; // Updated for quotes system

/**
 * Opens and returns the ServicePro IndexedDB database
 * Handles schema upgrades and error recovery
 */
export async function openServiceProDB(): Promise<ServiceProDB> {
  try {
    const db = await openDB<{
      jobs: Job;
      jobDetails: JobDetail;
      customers: Customer;
      jobChecklists: JobChecklist;
      checklistTemplates: ChecklistTemplate;
      quotes: any;
      quoteTemplates: any;
      queues: QueueItem;
      meta: MetaData;
    }>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        console.log(`Upgrading database from ${oldVersion} to ${newVersion}`);

        // Create jobs store
        if (!db.objectStoreNames.contains('jobs')) {
          const jobsStore = db.createObjectStore('jobs', { keyPath: 'id' });
          jobsStore.createIndex('technician_id', 'technician_id');
          jobsStore.createIndex('status', 'status');
          jobsStore.createIndex('scheduled_date', 'scheduled_date');
        }

        // Create jobDetails store
        if (!db.objectStoreNames.contains('jobDetails')) {
          const jobDetailsStore = db.createObjectStore('jobDetails', { keyPath: 'id' });
          jobDetailsStore.createIndex('technician_id', 'technician_id');
          jobDetailsStore.createIndex('status', 'status');
        }

        // Create customers store
        if (!db.objectStoreNames.contains('customers')) {
          const customersStore = db.createObjectStore('customers', { keyPath: 'id' });
          customersStore.createIndex('name', 'name');
          customersStore.createIndex('customer_type', 'customer_type');
          customersStore.createIndex('is_active', 'is_active');
          customersStore.createIndex('email', 'email');
          customersStore.createIndex('phone', 'phone');
          // Add new indexes for version 2
          customersStore.createIndex('first_name', 'first_name');
          customersStore.createIndex('last_name', 'last_name');
          customersStore.createIndex('company_name', 'company_name');
          customersStore.createIndex('phone_mobile', 'phone_mobile');
          customersStore.createIndex('phone_work', 'phone_work');
          customersStore.createIndex('email_enabled', 'email_enabled');
          customersStore.createIndex('whatsapp_enabled', 'whatsapp_enabled');
        } else if (oldVersion < 2) {
          // Migration from version 1 to 2: add new customer fields
          const customersStore = db.objectStoreNames.contains('customers')
            ? db.transaction('customers', 'readwrite').objectStore('customers')
            : db.createObjectStore('customers', { keyPath: 'id' });

          // Add new indexes for version 2
          if (!customersStore.indexNames.contains('first_name')) {
            customersStore.createIndex('first_name', 'first_name');
          }
          if (!customersStore.indexNames.contains('last_name')) {
            customersStore.createIndex('last_name', 'last_name');
          }
          if (!customersStore.indexNames.contains('company_name')) {
            customersStore.createIndex('company_name', 'company_name');
          }
          if (!customersStore.indexNames.contains('phone_mobile')) {
            customersStore.createIndex('phone_mobile', 'phone_mobile');
          }
          if (!customersStore.indexNames.contains('phone_work')) {
            customersStore.createIndex('phone_work', 'phone_work');
          }
          if (!customersStore.indexNames.contains('email_enabled')) {
            customersStore.createIndex('email_enabled', 'email_enabled');
          }
          if (!customersStore.indexNames.contains('whatsapp_enabled')) {
            customersStore.createIndex('whatsapp_enabled', 'whatsapp_enabled');
          }
        }

        // Create queues store
        if (!db.objectStoreNames.contains('queues')) {
          const queuesStore = db.createObjectStore('queues', { keyPath: 'id' });
          queuesStore.createIndex('type', 'type');
          queuesStore.createIndex('timestamp', 'timestamp');
          queuesStore.createIndex('jobId', 'jobId');
        }

        // Create jobChecklists store
        if (!db.objectStoreNames.contains('jobChecklists')) {
          const jobChecklistsStore = db.createObjectStore('jobChecklists', { keyPath: 'id' });
          jobChecklistsStore.createIndex('job_id', 'job_id');
          jobChecklistsStore.createIndex('template_id', 'template_id');
        }

        // Create checklistTemplates store
        if (!db.objectStoreNames.contains('checklistTemplates')) {
          const checklistTemplatesStore = db.createObjectStore('checklistTemplates', { keyPath: 'id' });
          checklistTemplatesStore.createIndex('is_active', 'is_active');
          checklistTemplatesStore.createIndex('name', 'name');
        }

        // Create quotes store (version 4+)
        if (oldVersion < 4 && !db.objectStoreNames.contains('quotes')) {
          const quotesStore = db.createObjectStore('quotes', { keyPath: 'id' });
          quotesStore.createIndex('customer_id', 'customer_id');
          quotesStore.createIndex('created_by', 'created_by');
          quotesStore.createIndex('status', 'status');
          quotesStore.createIndex('quote_number', 'quote_number');
          quotesStore.createIndex('created_at', 'created_at');
        }

        // Create quote templates store (version 4+)
        if (oldVersion < 4 && !db.objectStoreNames.contains('quoteTemplates')) {
          const quoteTemplatesStore = db.createObjectStore('quoteTemplates', { keyPath: 'id' });
          quoteTemplatesStore.createIndex('is_active', 'is_active');
          quoteTemplatesStore.createIndex('category', 'category');
          quoteTemplatesStore.createIndex('name', 'name');
        }

        // Create meta store
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      },
      blocked() {
        console.warn('Database upgrade blocked - please close other tabs');
      },
      blocking() {
        console.warn('Blocking database upgrade - closing other connections');
      },
      terminated() {
        console.error('Database connection terminated unexpectedly');
      },
    });

    console.log('ServicePro database opened successfully');
    return db;
  } catch (error) {
    console.error('Failed to open ServicePro database:', error);

    // Attempt recovery by deleting and recreating the database
    if (error instanceof Error && error.name === 'VersionError') {
      console.log('Attempting database recovery...');
      indexedDB.deleteDatabase(DB_NAME);
      return openServiceProDB();
    }

    throw error;
  }
}

/**
 * Generic database operations with error handling
 */
export class DBService {
  private db: ServiceProDB | null = null;

  async getDB(): Promise<ServiceProDB> {
    if (!this.db) {
      this.db = await openServiceProDB();
    }
    return this.db;
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance
export const dbService = new DBService();