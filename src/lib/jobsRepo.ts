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
export interface JobVisit {
  id: string;
  job_id: string;
  technician_id: string;
  started_at: string;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  job_visit_id: string;
  event: 'check_in' | 'check_out';
  ts: string;
  lat?: number;
  lng?: number;
  created_by: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface TimeTrackingStats {
  totalHoursWorked: number;
  locationComplianceRate: number;
  averageTimePerJob: number;
  totalJobsTracked: number;
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
        customers(name, phone_mobile, phone_work, preferred_contact, address, short_address, city, state, email)
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
        customers(id, name, phone_mobile, phone_work, preferred_contact, address, short_address, city, state, email)
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

// ===== TIME TRACKING FUNCTIONS =====

/**
 * Records a time entry (check-in or check-out) with GPS validation
 * @param jobId - Job ID to record time for
 * @param event - Type of time event
 * @param locationData - Optional GPS location data
 * @param userId - User ID of the person creating the entry
 * @returns Promise resolving when time entry is recorded
 */
export async function recordTimeEntry(
  jobId: string,
  event: 'check_in' | 'check_out',
  locationData?: LocationData,
  userId?: string
): Promise<void> {
  try {
    const timestamp = new Date().toISOString();

    // Get the current user ID if not provided
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      userId = user.id;
    }

    if (event === 'check_in') {
      // Create a new job visit for check-in
      const { data: visit, error: visitError } = await supabase
        .from('job_visits')
        .insert([{
          job_id: jobId,
          technician_id: userId,
          started_at: timestamp
        }])
        .select()
        .single();

      if (visitError) throw visitError;

      // Record time entry with GPS data
      const { error: timeError } = await supabase
        .from('timesheets')
        .insert([{
          job_visit_id: visit.id,
          event,
          ts: timestamp,
          lat: locationData?.latitude,
          lng: locationData?.longitude,
          created_by: userId
        }]);

      if (timeError) throw timeError;

    } else {
      // Check-out: Find the current job visit and end it
      // For check-out, we need to find the most recent job visit that's not completed
      // Find active job visit (one that has started but hasn't been checked out)
      // Look for recent visits by this user and job
      const { data: visits, error: visitsError } = await supabase
        .from('job_visits')
        .select(`
          *,
          timesheets(*)
        `)
        .eq('job_id', jobId)
        .eq('technician_id', userId)
        .not('started_at', 'is', null) // Has started (not null)
        .order('created_at', { ascending: false })
        .limit(5);

      if (visitsError) throw visitsError;

      // Find the most recent visit that only has a check-in (no check-out)
      let activeVisit = null;
      for (const visit of visits || []) {
        const timesheets = visit.timesheets || [];
        const hasCheckIn = timesheets.some((t: any) => t.event === 'check_in');
        const hasCheckOut = timesheets.some((t: any) => t.event === 'check_out');

        if (hasCheckIn && !hasCheckOut) {
          activeVisit = visit;
          break;
        }
      }

      if (!activeVisit) {
        throw new Error('No active job visit found for check-out. Please check in first.');
      }

      // Record check-out time entry
      const { error: timeError } = await supabase
        .from('timesheets')
        .insert([{
          job_visit_id: activeVisit.id,
          event,
          ts: timestamp,
          lat: locationData?.latitude,
          lng: locationData?.longitude,
          created_by: userId
        }]);

      if (timeError) throw timeError;
    }

    console.log(`Time entry recorded: ${event} for job ${jobId}`);
  } catch (error) {
    console.error('Failed to record time entry:', error);
    throw error;
  }
}

/**
 * Fetches job visits for a specific job
 * @param jobId - Job ID to fetch visits for
 * @returns Promise resolving to array of job visits
 */
export async function getJobVisits(jobId: string): Promise<JobVisit[]> {
  try {
    const { data, error } = await supabase
      .from('job_visits')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to fetch job visits:', error);
    return [];
  }
}

/**
 * Fetches time entries for a specific technician within a date range
 * @param technicianId - Technician ID
 * @param dateRange - Date range to filter
 * @returns Promise resolving to array of time entries with job details
 */
export async function getTechnicianTimeEntries(
  technicianId: string,
  dateRange: DateRange
): Promise<TimeEntry[]> {
  try {
    const { data, error } = await supabase
      .from('timesheets')
      .select(`
        *,
        job_visits(job_id, jobs(title))
      `)
      .eq('created_by', technicianId)
      .gte('ts', dateRange.start.toISOString())
      .lte('ts', dateRange.end.toISOString())
      .order('ts', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to fetch technician time entries:', error);
    return [];
  }
}

/**
 * Validates if technician location is near job site
 * @param jobLocation - Job site coordinates
 * @param technicianLocation - Technician's location
 * @param maxDistance - Maximum allowed distance in meters
 * @returns Promise resolving to validation result
 */
export function validateWorkLocation(
  jobLocation: { lat: number; lng: number },
  technicianLocation: { lat: number; lng: number },
  maxDistance: number = 500
): { isValid: boolean; distance: number; maxDistance: number } {
  // Haversine formula to calculate distance
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (jobLocation.lat * Math.PI) / 180;
  const φ2 = (technicianLocation.lat * Math.PI) / 180;
  const Δφ = ((technicianLocation.lat - jobLocation.lat) * Math.PI) / 180;
  const Δλ = ((technicianLocation.lng - jobLocation.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = Math.round(R * c);

  return {
    isValid: distance <= maxDistance,
    distance,
    maxDistance
  };
}

/**
 * Gets current GPS location for time tracking
 * @returns Promise resolving to location data or null
 */
export async function getLocation(): Promise<LocationData | null> {
  if (!navigator.geolocation) {
    console.warn('Geolocation not supported');
    return null;
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: new Date(position.timestamp)
    };
  } catch (error) {
    console.error('Failed to get location:', error);
    return null;
  }
}

/**
 * Calculates time tracking statistics for admin reporting
 * @param technicianId - Optional technician filter
 * @param dateRange - Date range for statistics
 * @returns Promise resolving to time tracking stats
 */
export async function getTimeTrackingStats(
  technicianId?: string,
  dateRange?: DateRange
): Promise<TimeTrackingStats> {
  try {
    let query = supabase
      .from('timesheets')
      .select(`
        *,
        job_visits(job_id, started_at),
        jobs(total_cost)
      `);

    if (technicianId) {
      query = query.eq('created_by', technicianId);
    }

    if (dateRange) {
      query = query
        .gte('ts', dateRange.start.toISOString())
        .lte('ts', dateRange.end.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    const timeEntries = data || [];

    // Calculate statistics
    let totalDuration = 0;
    let jobsWithLocation = 0;
    let totalJobs = 0;
    const uniqueJobs = new Set<string>();

    for (let i = 0; i < timeEntries.length; i += 2) {
      const checkIn = timeEntries[i];
      const checkOut = timeEntries[i + 1];

      if (checkIn?.event === 'check_in' && checkOut?.event === 'check_out') {
        const duration = (new Date(checkOut.ts).getTime() - new Date(checkIn.ts).getTime()) / (1000 * 60);
        totalDuration += duration;

        totalJobs++;

        if (checkIn.lat !== null && checkIn.lng !== null) {
          jobsWithLocation++;
        }

        uniqueJobs.add(checkIn.job_visit_id);
      }
    }

    return {
      totalHoursWorked: Math.round((totalDuration / 60) * 100) / 100, // Round to 2 decimal places
      locationComplianceRate: totalJobs > 0 ? Math.round((jobsWithLocation / totalJobs) * 100) : 0,
      averageTimePerJob: uniqueJobs.size > 0 ? Math.round((totalDuration / uniqueJobs.size) * 100) / 100 : 0,
      totalJobsTracked: uniqueJobs.size
    };
  } catch (error) {
    console.error('Failed to get time tracking stats:', error);
    return {
      totalHoursWorked: 0,
      locationComplianceRate: 0,
      averageTimePerJob: 0,
      totalJobsTracked: 0
    };
  }
}