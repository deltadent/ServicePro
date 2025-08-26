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
    phone?: string;
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
  type: 'NOTE' | 'PHOTO' | 'CHECK';
  payload: any;
  timestamp: string;
  jobId?: string;
}

export interface MetaData {
  key: string;
  value: any;
  updated_at: string;
}

export type ServiceProDB = IDBPDatabase<{
  jobs: Job;
  jobDetails: JobDetail;
  queues: QueueItem;
  meta: MetaData;
}>;

const DB_NAME = 'servicepro-db';
const DB_VERSION = 1;

/**
 * Opens and returns the ServicePro IndexedDB database
 * Handles schema upgrades and error recovery
 */
export async function openServiceProDB(): Promise<ServiceProDB> {
  try {
    const db = await openDB<{
      jobs: Job;
      jobDetails: JobDetail;
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

        // Create queues store
        if (!db.objectStoreNames.contains('queues')) {
          const queuesStore = db.createObjectStore('queues', { keyPath: 'id' });
          queuesStore.createIndex('type', 'type');
          queuesStore.createIndex('timestamp', 'timestamp');
          queuesStore.createIndex('jobId', 'jobId');
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