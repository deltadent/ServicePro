import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNetwork } from '@/hooks/useNetwork';
import {
  Clock,
  MapPin,
  AlertTriangle,
  Wifi,
  WifiOff,
  StopCircle,
  RefreshCw
} from "lucide-react";

interface TechnicianTimeTrackerProps {
  jobId: string;
  currentJob?: {
    id: string;
    title: string;
    started_at?: string;
    status: string;
  };
  onEmergencyStop?: () => void;
}

interface CurrentSession {
  jobId: string;
  jobTitle: string;
  startTime: Date;
  duration: number; // in milliseconds
  lastLocation?: {
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: Date;
  };
}

const TechnicianTimeTracker = ({
  jobId,
  currentJob,
  onEmergencyStop
}: TechnicianTimeTrackerProps) => {
  const { toast } = useToast();
  const online = useNetwork();

  const [currentSession, setCurrentSession] = useState<CurrentSession | null>(null);
  const [duration, setDuration] = useState(0);
  const [lastLocation, setLastLocation] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: Date;
  } | null>(null);
  const [locationWatchId, setLocationWatchId] = useState<number | null>(null);

  // Initialize session when currentJob changes
  useEffect(() => {
    if (currentJob && currentJob.status === 'in_progress' && currentJob.started_at) {
      const startTime = new Date(currentJob.started_at);
      const session: CurrentSession = {
        jobId: currentJob.id,
        jobTitle: currentJob.title,
        startTime: startTime,
        duration: Date.now() - startTime.getTime(),
      };
      setCurrentSession(session);
      startLocationTracking();
    } else {
      setCurrentSession(null);
      stopLocationTracking();
    }
  }, [currentJob]);

  // Update duration every second
  useEffect(() => {
    if (!currentSession) return;

    const interval = setInterval(() => {
      const newDuration = Date.now() - currentSession.startTime.getTime();
      setCurrentSession(prev => prev ? { ...prev, duration: newDuration } : null);
      setDuration(newDuration);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentSession]);

  // Start GPS tracking for current session
  const startLocationTracking = () => {
    // Only track location if supported and we're online
    if (!navigator.geolocation || !online) return;

    try {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp)
          };
          setLastLocation(location);

          // Update current session with latest location
          setCurrentSession(prev => prev ? { ...prev, lastLocation: location } : null);
        },
        (error) => {
          console.warn('Location tracking error:', error);
          // Don't show error toast as this happens frequently
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 60000
        }
      );

      setLocationWatchId(watchId);
    } catch (error) {
      console.error('Failed to start location tracking:', error);
    }
  };

  // Stop location tracking
  const stopLocationTracking = () => {
    if (locationWatchId && navigator.geolocation) {
      navigator.geolocation.clearWatch(locationWatchId);
      setLocationWatchId(null);
    }
  };

  // Format duration display
  const formatDuration = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format start time
  const formatStartTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get location quality
  const getLocationQuality = (accuracy: number) => {
    if (accuracy <= 10) return { quality: 'excellent', color: 'text-green-600' };
    if (accuracy <= 25) return { quality: 'good', color: 'text-blue-600' };
    if (accuracy <= 50) return { quality: 'fair', color: 'text-yellow-600' };
    return { quality: 'poor', color: 'text-red-600' };
  };

  // Handle emergency stop
  const handleEmergencyStop = () => {
    if (onEmergencyStop) {
      onEmergencyStop();
    }
    stopLocationTracking();
    setCurrentSession(null);

    toast({
      title: "Emergency Stop",
      description: "Time tracking stopped. Please contact your supervisor.",
      variant: "destructive"
    });
  };

  if (!currentSession) {
    return (
      <Card className="p-4 border-dashed border-gray-300">
        <div className="flex items-center justify-center py-8 text-gray-500">
          <div className="text-center">
            <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No active session</p>
            <p className="text-xs">Check in to a job to start tracking time</p>
          </div>
        </div>
      </Card>
    );
  }

  const currentTime = new Date();
  const locationQualityInfo = lastLocation ?
    getLocationQuality(lastLocation.accuracy) :
    null;

  return (
    <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <h3 className="font-semibold text-gray-900">Active Session</h3>
        </div>
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
          Working
        </Badge>
      </div>

      {/* Job Info */}
      <div className="mb-4">
        <h4 className="font-medium text-gray-900 truncate">{currentSession.jobTitle}</h4>
        <p className="text-sm text-gray-600">
          Started at {formatStartTime(currentSession.startTime)}
        </p>
      </div>

      {/* Duration Display */}
      <div className="mb-4">
        <div className="text-center">
          <div className="text-3xl font-mono font-bold text-gray-900 mb-1">
            {formatDuration(duration)}
          </div>
          <p className="text-xs text-gray-600">Current Session</p>
        </div>
      </div>

      {/* Location Status */}
      <div className="mb-4 p-3 bg-white rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {lastLocation ? (
              <MapPin className={`w-4 h-4 ${
                locationQualityInfo?.color || 'text-gray-400'
              }`} />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            )}
            <div>
              {!lastLocation ? (
                <span className="text-sm text-gray-600">No location data</span>
              ) : (
                <div>
                  <div className="text-sm font-medium">
                    ±{Math.round(lastLocation.accuracy)}m accuracy
                  </div>
                  <div className="text-xs text-gray-500">
                    {locationQualityInfo?.quality || 'unknown'} GPS
                  </div>
                </div>
              )}
            </div>
          </div>
          {!online && (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
        </div>
      </div>

      {/* Network Status */}
      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm">
          {online ? (
            <>
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-green-700">Online - tracked in real-time</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-red-500" />
              <span className="text-red-700">Offline - will sync when connected</span>
            </>
          )}
        </div>
      </div>

      {/* Emergency Stop */}
      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          Need to stop tracking?
        </div>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleEmergencyStop}
        >
          <StopCircle className="w-4 h-4 mr-1" />
          Stop
        </Button>
      </div>

      {/* Last Location Details */}
      {lastLocation && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <div>
              <span className="font-medium">GPS:</span> {lastLocation.lat.toFixed(6)}, {lastLocation.lng.toFixed(6)}
            </div>
            <div>
              <span className="font-medium">Last update:</span> {lastLocation.timestamp.toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export { TechnicianTimeTracker };