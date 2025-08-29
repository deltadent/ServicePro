import { supabase } from '@/integrations/supabase/client';

/**
 * Location service for GPS-based time tracking
 * Handles geolocation API interactions and validation
 */

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  altitude?: number;
  speed?: number;
}

export interface LocationRequirements {
  accuracy: number;
  timeout: number;
  enableHighAccuracy: boolean;
  maximumAge: number;
}

export interface LocationValidation {
  maxDistance: number;
  verifyLocation: boolean;
}

// Default location requirements for job check-ins
export const DEFAULT_LOCATION_REQUIREMENTS: LocationRequirements = {
  accuracy: 50, // meters
  timeout: 10000, // 10 seconds
  enableHighAccuracy: true,
  maximumAge: 60000 // 1 minute
};

// Default validation settings
export const DEFAULT_LOCATION_VALIDATION: LocationValidation = {
  maxDistance: 500, // 500 meters from job site
  verifyLocation: true
};

/**
 * Gets current location using browser geolocation API
 * @param requirements Location accuracy and timeout requirements
 * @returns Promise resolving to location data or null if unavailable
 */
export async function getCurrentLocation(
  requirements: Partial<LocationRequirements> = {}
): Promise<LocationData | null> {
  const config = { ...DEFAULT_LOCATION_REQUIREMENTS, ...requirements };

  if (!navigator.geolocation) {
    console.warn('Geolocation is not supported by this browser');
    return null;
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: config.enableHighAccuracy,
          timeout: config.timeout,
          maximumAge: config.maximumAge
        }
      );
    });

    const location: LocationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: new Date(position.timestamp),
      altitude: position.coords.altitude || undefined,
      speed: position.coords.speed || undefined
    };

    console.log('Location acquired:', location);
    return location;

  } catch (error) {
    console.error('Failed to get current location:', error);

    // Handle specific geolocation errors
    if (error instanceof GeolocationPositionError) {
      switch (error.code) {
        case error.PERMISSION_DENIED:
          throw new Error('Location access denied. Please enable location permissions.');
        case error.POSITION_UNAVAILABLE:
          throw new Error('Location information is unavailable. Please check GPS settings.');
        case error.TIMEOUT:
          throw new Error('Location request timed out. Please try again.');
      }
    }

    throw new Error('Unable to retrieve location. Please check your GPS settings.');
  }
}

/**
 * Requests location permission and returns status
 * @returns Promise resolving to permission state
 */
export async function requestPermission(): Promise<boolean> {
  if (!navigator.permissions) {
    return true; // Assume granted on older browsers
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });

    if (result.state === 'granted') {
      return true;
    }

    if (result.state === 'denied') {
      return false;
    }

    // Prompt is the default state, try to get location to trigger permission request
    try {
      await getCurrentLocation();
      return true;
    } catch (error) {
      return false;
    }
  } catch (error) {
    console.warn('Permission query failed, assuming denied:', error);
    return false;
  }
}

/**
 * Calculates distance between two geographic points using Haversine formula
 * @param point1 First point with lat/lng
 * @param point2 Second point with lat/lng
 * @returns Distance in meters
 */
export function calculateDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = point1.lat * Math.PI / 180;
  const φ2 = point2.lat * Math.PI / 180;
  const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
  const Δλ = (point2.lng - point1.lng) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

/**
 * Validates if a location is close enough to a job site
 * @param jobLocation Job site coordinates
 * @param technicianLocation Technician's current location
 * @param maxDistance Maximum allowed distance in meters
 * @returns Object with validation result and details
 */
export function validateWorkLocation(
  jobLocation: { lat: number; lng: number },
  technicianLocation: { lat: number; lng: number },
  maxDistance: number = DEFAULT_LOCATION_VALIDATION.maxDistance
) {
  const distance = calculateDistance(jobLocation, technicianLocation);
  const isValid = distance <= maxDistance;

  return {
    isValid,
    distance: Math.round(distance),
    maxDistance,
    withinRange: isValid
  };
}

/**
 * Formats distance for display
 * @param distance Distance in meters
 * @returns Formatted distance string
 */
export function formatDistance(distance: number): string {
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  } else {
    const km = distance / 1000;
    return `${km.toFixed(1)}km`;
  }
}

/**
 * Gets location quality rating based on accuracy
 * @param accuracy Location accuracy in meters
 * @returns Quality rating: 'excellent' | 'good' | 'fair' | 'poor'
 */
export function getLocationQuality(accuracy: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (accuracy <= 10) return 'excellent';
  if (accuracy <= 25) return 'good';
  if (accuracy <= 50) return 'fair';
  return 'poor';
}

/**
 * Watches location changes and calls callback when updated
 * @param callback Function to call when location changes
 * @param requirements Location accuracy requirements
 * @returns Watch ID for clearing the watch
 */
export function watchLocation(
  callback: (location: LocationData) => void,
  requirements: Partial<LocationRequirements> = {}
): number | null {
  const config = { ...DEFAULT_LOCATION_REQUIREMENTS, ...requirements };

  if (!navigator.geolocation) {
    console.warn('Geolocation not supported');
    return null;
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const location: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date(position.timestamp),
        altitude: position.coords.altitude || undefined,
        speed: position.coords.speed || undefined
      };
      callback(location);
    },
    (error) => {
      console.error('Location watch error:', error);
    },
    {
      enableHighAccuracy: config.enableHighAccuracy,
      timeout: config.timeout,
      maximumAge: config.maximumAge
    }
  );

  return watchId;
}

/**
 * Clears a location watch
 * @param watchId Watch ID returned from watchLocation
 */
export function clearLocationWatch(watchId: number): void {
  if (watchId && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
}

/**
 * Saves location data to the database for offline sync
 * @param jobId Job ID
 * @param event Check-in or check-out event
 * @param location GPS location data
 * @param skipOnlineSync If true, only queues locally
 */
export async function saveLocationData(
  jobId: string,
  event: 'check_in' | 'check_out',
  location: LocationData,
  skipOnlineSync: boolean = false
): Promise<void> {
  try {
    // Save to local queue for offline sync
    await saveToOfflineQueue({
      type: 'LOCATION_ENTRY',
      jobId,
      event,
      location,
      timestamp: new Date().toISOString()
    });

    if (!skipOnlineSync) {
      // Attempt to sync online if available
      await syncLocationDataToServer(jobId, event, location);
    }
  } catch (error) {
    console.error('Failed to save location data:', error);
    throw error;
  }
}

/**
 * Saves data to offline queue for later sync
 */
async function saveToOfflineQueue(data: any): Promise<void> {
  // This would integrate with the existing offline queue system
  // For now, we'll store in localStorage as a simple implementation
  const queueKey = 'location_queue';
  const existing = JSON.parse(localStorage.getItem(queueKey) || '[]');
  existing.push({ ...data, queuedAt: new Date().toISOString() });
  localStorage.setItem(queueKey, JSON.stringify(existing));
}

/**
 * Syncs location data to server when online
 */
async function syncLocationDataToServer(
  jobId: string,
  event: 'check_in' | 'check_out',
  location: LocationData
): Promise<void> {
  try {
    // This will be implemented when we extend the jobsRepo
    console.log('Syncing location data:', { jobId, event, location });
  } catch (error) {
    console.error('Failed to sync location data:', error);
    throw error;
  }
}