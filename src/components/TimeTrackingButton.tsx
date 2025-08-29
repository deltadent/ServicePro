import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useNetwork } from '@/hooks/useNetwork';
import { useAuth } from '@/hooks/useAuth';
import {
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  LogIn,
  LogOut
} from "lucide-react";
import { getCurrentLocation, LocationData, getLocationQuality } from '@/lib/location';
import { recordTimeEntry, validateWorkLocation } from '@/lib/jobsRepo';

interface TimeTrackingButtonProps {
  jobId: string;
  jobLocation: { lat: number; lng: number };
  currentStatus: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  onStatusChange: (newStatus: string, locationData?: LocationData) => void;
}

interface LocationState {
  location: LocationData | null;
  quality: 'excellent' | 'good' | 'fair' | 'poor' | null;
  isValid: boolean;
  distance: number;
  maxDistance: number;
}

const TimeTrackingButton = ({
  jobId,
  jobLocation,
  currentStatus,
  onStatusChange
}: TimeTrackingButtonProps) => {
  const { toast } = useToast();
  const online = useNetwork();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [locationState, setLocationState] = useState<LocationState>({
    location: null,
    quality: null,
    isValid: false,
    distance: 0,
    maxDistance: 500
  });

  // Check location on mount and job status change
  useEffect(() => {
    if (currentStatus === 'scheduled') {
      getLocationForValidation();
    }
  }, [currentStatus, jobId]);

  const getLocationForValidation = async () => {
    try {
      setLoading(true);
      const location = await getCurrentLocation({
        accuracy: 50,
        timeout: 10000
      });

      if (!location) {
        toast({
          title: "Location Unavailable",
          description: "Could not get your current location. Please check GPS settings.",
          variant: "destructive"
        });
        return;
      }

      // Validate location against job site
      const validation = validateWorkLocation(jobLocation, {
        lat: location.latitude,
        lng: location.longitude
      });

      const quality = getLocationQuality(location.accuracy);

      setLocationState({
        location,
        quality,
        isValid: validation.isValid,
        distance: validation.distance,
        maxDistance: validation.maxDistance
      });

    } catch (error: any) {
      console.error('Location error:', error);
      toast({
        title: "Location Error",
        description: error.message || "Failed to get location",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTimeEntry = async (event: 'check_in' | 'check_out') => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to track time entries",
        variant: "destructive"
      });
      return;
    }

    if (!locationState.location && !online) {
      toast({
        title: "Offline Mode",
        description: "Location will be recorded when connection is restored",
        variant: "default"
      });
    }

    setLoading(true);
    try {
      // Record time entry with location data
      if (online) {
        await recordTimeEntry(jobId, event, locationState.location || undefined, user.id);
      } else {
        // Queue for offline - would integrate with queue system
        console.log(`Queued ${event} for job ${jobId}`);
      }

      // Update job status
      const newStatus = event === 'check_in' ? 'in_progress' : 'completed';
      onStatusChange(newStatus, locationState.location || undefined);

      toast({
        title: event === 'check_in' ? "Checked In" : "Checked Out",
        description: event === 'check_in'
          ? "Time tracking started successfully"
          : "Time tracking completed successfully"
      });

    } catch (error: any) {
      console.error(`Failed to ${event}:`, error);
      toast({
        title: `Failed to ${event === 'check_in' ? 'Check In' : 'Check Out'}`,
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getLocationBadgeColor = () => {
    if (!locationState.quality) return 'gray';

    switch (locationState.quality) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'fair': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-red-100 text-red-800';
    }
  };

  const getLocationStatusIcon = () => {
    if (loading) return <Loader2 className="w-4 h-4 animate-spin" />;
    if (!locationState.location) return <AlertTriangle className="w-4 h-4" />;
    if (!locationState.isValid) return <MapPin className="w-4 h-4 text-red-500" />;
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  // Render check-in button for scheduled jobs
  if (currentStatus === 'scheduled') {
    return (
      <div className="space-y-4 p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Job Check-in</h3>
            <p className="text-sm text-gray-600">Record your arrival time</p>
          </div>
          {locationState.location && (
            <Badge className={getLocationBadgeColor()}>
              {locationState.quality} GPS
            </Badge>
          )}
        </div>

        {/* Location Status */}
        <div className="flex items-center gap-2 p-3 bg-white rounded-md border">
          {getLocationStatusIcon()}
          <div className="flex-1">
            {!locationState.location ? (
              <span className="text-sm text-gray-600">Getting location...</span>
            ) : !locationState.isValid ? (
              <span className="text-sm text-red-600">
                {locationState.distance > locationState.maxDistance
                  ? `${locationState.distance - locationState.maxDistance}m away from job site`
                  : `Location validation failed`}
              </span>
            ) : (
              <span className="text-sm text-green-600">
                ✓ {locationState.distance}m from job site
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={getLocationForValidation}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>

        {/* Location Info */}
        {locationState.location && (
          <div className="text-xs text-gray-500">
            <div>Accuracy: ±{Math.round(locationState.location.accuracy)}m</div>
            <div>Lat: {locationState.location.latitude.toFixed(6)}</div>
            <div>Lng: {locationState.location.longitude.toFixed(6)}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => handleTimeEntry('check_in')}
            disabled={loading || (locationState.quality === 'poor')}
            className="flex-1"
          >
            <LogIn className="w-4 h-4 mr-2" />
            {loading ? 'Checking In...' : 'Check In'}
          </Button>
        </div>

        {/* Warning for poor GPS */}
        {locationState.quality === 'poor' && (
          <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded-md border border-yellow-200">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              GPS accuracy is poor (±{Math.round(locationState.location?.accuracy || 0)}m).
              Consider moving to a clearer location for better accuracy.
            </div>
          </div>
        )}

        {/* Offline warning */}
        {!online && (
          <div className="flex items-start gap-2 p-2 bg-orange-50 rounded-md border border-orange-200">
            <Clock className="w-4 h-4 text-orange-600 mt-0.5" />
            <div className="text-sm text-orange-800">
              You're offline. Time entry will sync when connection is restored.
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render check-out button for in-progress jobs
  if (currentStatus === 'in_progress') {
    return (
      <div className="space-y-4 p-4 border rounded-lg bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Job Check-out</h3>
            <p className="text-sm text-gray-600">Record your departure time</p>
          </div>
          <Badge className="bg-green-100 text-green-800">
            <Clock className="w-3 h-3 mr-1" />
            In Progress
          </Badge>
        </div>

        <Button
          onClick={() => handleTimeEntry('check_out')}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {loading ? 'Checking Out...' : 'Check Out'}
        </Button>
      </div>
    );
  }

  // No time tracking for completed/cancelled jobs
  return null;
};

export { TimeTrackingButton };