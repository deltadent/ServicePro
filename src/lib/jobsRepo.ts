import { supabase } from '@/integrations/supabase/client';
import { dbService, type Job, type JobDetail } from './db';

/**
 * Offline-first jobs repository
 * Implements network-first strategy with local caching
 */

export interface JobsListOptions {
  technicianId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface JobsListResult {
  jobs: Job[];
  count: number;
  fromCache: boolean;
}

/**
 * Fetches jobs list with offline-first strategy
 * @param options - Query options for filtering jobs
 * @returns Promise resolving to jobs list with metadata
 */
export async function fetchJobsList(options: JobsListOptions = {}): Promise<JobsListResult> {
  const { technicianId, status, limit = 50, offset = 0 } = options;

  try {
    // Try network first
    const { data: jobs, error, count } = await supabase
      .from('jobs')
      .select(`
        *,
        customers(name, phone, address, short_address, city, state, email)
      `, { count: 'exact' })
      .eq(technicianId ? 'technician_id' : '', technicianId || '')
      .eq(status ? 'status' : '', status || '')
      .order('scheduled_date', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Cache successful network response
    const db = await dbService.getDB();
    const tx = db.transaction('jobs', 'readwrite');

    for (const job of jobs || []) {
      await tx.store.put(job);
    }

    await tx.done;

    console.log(`Cached ${jobs?.length || 0} jobs from network`);
    return {
      jobs: jobs || [],
      count: count || 0,
      fromCache: false
    };

  } catch (error) {
    console.warn('Network request failed, falling back to cache:', error);

    // Fallback to cache
    try {
      const db = await dbService.getDB();
      const allJobs = await db.getAll('jobs');

      // Filter jobs based on criteria
      let filteredJobs = allJobs;
      if (technicianId) {
        filteredJobs = filteredJobs.filter(job => job.technician_id === technicianId);
      }
      if (status) {
        filteredJobs = filteredJobs.filter(job => job.status === status);
      }

      // Apply pagination
      const startIndex = offset;
      const endIndex = startIndex + limit;
      const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

      return {
        jobs: paginatedJobs,
        count: filteredJobs.length,
        fromCache: true
      };

    } catch (cacheError) {
      console.error('Cache fallback also failed:', cacheError);
      return {
        jobs: [],
        count: 0,
        fromCache: true
      };
    }
  }
}

/**
 * Fetches detailed job information with offline-first strategy
 * @param jobId - The ID of the job to fetch
 * @returns Promise resolving to detailed job information
 */
export async function fetchJobDetail(jobId: string): Promise<{ job: JobDetail | null; fromCache: boolean }> {
  try {
    // Try network first
    const { data: job, error } = await supabase
      .from('jobs')
      .select(`
        *,
        customers(name, phone, address, short_address, city, state, email)
      `)
      .eq('id', jobId)
      .single();

    if (error) throw error;

    // Cache successful network response
    const db = await dbService.getDB();
    const jobDetail: JobDetail = {
      ...job,
      notes: undefined, // Will be populated from separate queries if needed
      photos: undefined,
      timesheets: undefined
    };

    await db.put('jobDetails', jobDetail);

    console.log(`Cached job detail for ${jobId} from network`);
    return {
      job: jobDetail,
      fromCache: false
    };

  } catch (error) {
    console.warn(`Network request failed for job ${jobId}, falling back to cache:`, error);

    // Fallback to cache
    try {
      const db = await dbService.getDB();
      const cachedJob = await db.get('jobDetails', jobId);

      return {
        job: cachedJob || null,
        fromCache: true
      };

    } catch (cacheError) {
      console.error('Cache fallback also failed:', cacheError);
      return {
        job: null,
        fromCache: true
      };
    }
  }
}

/**
 * Updates local job cache with new or modified job data
 * @param job - Job data to cache
 */
export async function updateJobCache(job: Job): Promise<void> {
  try {
    const db = await dbService.getDB();
    await db.put('jobs', job);
    console.log(`Updated job cache for ${job.id}`);
  } catch (error) {
    console.error('Failed to update job cache:', error);
  }
}

/**
 * Clears all cached job data
 */
export async function clearJobCache(): Promise<void> {
  try {
    const db = await dbService.getDB();
    await db.clear('jobs');
    await db.clear('jobDetails');
    console.log('Job cache cleared');
  } catch (error) {
    console.error('Failed to clear job cache:', error);
  }
}

/**
 * Gets cache statistics for debugging
 */
export async function getCacheStats(): Promise<{
  jobsCount: number;
  jobDetailsCount: number;
}> {
  try {
    const db = await dbService.getDB();
    const [jobsCount, jobDetailsCount] = await Promise.all([
      db.count('jobs'),
      db.count('jobDetails')
    ]);

    return { jobsCount, jobDetailsCount };
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return { jobsCount: 0, jobDetailsCount: 0 };
  }
}