import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useNetwork } from '@/hooks/useNetwork';
import { useAuth } from '@/hooks/useAuth';
import {
  Clock,
  MapPin,
  Play,
  Square,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { getCurrentLocation, LocationData, getLocationQuality, validateWorkLocation } from '@/lib/location';
import { recordTimeEntry } from '@/lib/jobsRepo';

interface TimeTrackingWidgetProps {
  availableJobs: Array<{
    id: string;
    title: string;
    status: string;
    scheduled_date: string;
    customers?: {
      lat?: number;
      lng?: number;
    };
  }>;
  currentActiveJob?: {
    id: string;
    title: string;
    started_at?: string;
  };
  onTimeEntryUpdate?: () => void;
}

interface LocationValidation {
  isValid: boolean;
  distance: number;
  quality?: 'excellent' | 'good' | 'fair' | 'poor';
}

const TimeTrackingWidget = ({
  availableJobs,
  currentActiveJob,
  onTimeEntryUpdate
}: TimeTrackingWidgetProps) => {
  const { toast } = useToast();
  const online = useNetwork();
  const { user } = useAuth();

  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [locationValidation, setLocationValidation] = useState<LocationValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filter available jobs based on status
  const availableForCheckIn = availableJobs.filter(job => job.status === 'scheduled');
  const availableForCheckOut = availableJobs.filter(job =>
    job.status === 'in_progress' && currentActiveJob?.id === job.id
  );

  // Validate location when job is selected
  useEffect(() => {
    if (selectedJobId) {
      validateJobLocation();
    }
  }, [selectedJobId]);

  const validateJobLocation = async () => {
    const job = availableJobs.find(j => j.id === selectedJobId);
    if (!job) return;

    setIsValidating(true);
    try {
      const location = await getCurrentLocation({
        accuracy: 50,
        timeout: 10000
      });

      if (!location) {
        toast({
          title: "Location Unavailable",
          description: "Could not get your current location. Please enable GPS.",
          variant: "destructive"
        });
        return;
      }

      // Validate against job location if available
      let validation: LocationValidation = { isValid: true, distance: 0 };
      if (job.customers?.lat && job.customers?.lng) {
        const result = validateWorkLocation(
          { lat: job.customers.lat, lng: job.customers.lng },
          { lat: location.latitude, lng: location.longitude }
        );
        validation = {
          isValid: result.isValid,
          distance: result.distance,
          quality: getLocationQuality(location.accuracy)
        };
      }

      setLocationData(location);
      setLocationValidation(validation);

    } catch (error: any) {
      console.error('Location error:', error);
      toast({
        title: "GPS Error",
        description: error.message || "Failed to get location",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
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

    if (!selectedJobId) {
      toast({
        title: "Please select a job",
        description: "Select a job from the dropdown before checking in/out",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await recordTimeEntry(selectedJobId, event, locationData || undefined, user.id);

      toast({
        title: event === 'check_in' ? "Checked In" : "Checked Out",
        description: event === 'check_in'
          ? "Time tracking started successfully"
          : "Time tracking completed successfully"
      });

      // Reset selection and refresh
      setSelectedJobId('');
      setLocationData(null);
      onTimeEntryUpdate?.();

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

  const getConnectionStatus = () => {
    return online ? (
      <div className="flex items-center gap-1 text-sm text-green-600">
        <Wifi className="w-4 h-4" />
        <span>Online</span>
      </div>
    ) : (
      <div className="flex items-center gap-1 text-sm text-red-600">
        <WifiOff className="w-4 h-4" />
        <span>Offline - will sync</span>
      </div>
    );
  };


  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg text-blue-900">
            <Clock className="w-5 h-5" />
            Time Tracking
          </CardTitle>
          {getConnectionStatus()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Active Job Display */}
        {currentActiveJob && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      Currently Working:
                    </p>
                    <p className="text-sm text-green-700">
                      {currentActiveJob.title}
                    </p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  <Clock className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Check In Section */}
        {availableForCheckIn.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Play className="w-4 h-4 text-blue-600" />
              Check In
            </h4>

            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a job to check in..." />
              </SelectTrigger>
              <SelectContent>
                {availableForCheckIn.map(job => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Location Validation Display */}
            {selectedJobId && (
              <div className="space-y-2">
                {isValidating ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>Getting your location...</AlertDescription>
                  </Alert>
                ) : locationData ? (
                  <Alert className={locationValidation?.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                    <MapPin className="h-4 w-4" />
                    <AlertDescription>
                      {locationValidation?.isValid ? (
                        <span>
                          ✓ Near job site ({locationValidation.distance}m away)
                        </span>
                      ) : (
                        <span>
                          ⚠ {locationValidation?.distance || 0}m from job site
                        </span>
                      )}
                      {locationValidation?.quality && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {locationValidation.quality}
                        </Badge>
                      )}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>Location not available</AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            <Button
              onClick={() => handleTimeEntry('check_in')}
              disabled={!selectedJobId || loading || (locationValidation && !locationValidation.isValid)}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Play className="w-4 h-4 mr-2" />
              {loading ? 'Checking In...' : 'Check In'}
            </Button>
          </div>
        )}

        {/* Check Out Section */}
        {currentActiveJob && (
          <div className="space-y-3 pt-3 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Square className="w-4 h-4 text-green-600" />
              Check Out
            </h4>

            <div className="p-3 bg-white rounded-lg border">
              <p className="text-sm font-medium">{currentActiveJob.title}</p>
              <p className="text-xs text-gray-600 mt-1">
                Started: {new Date(currentActiveJob.started_at || '').toLocaleTimeString()}
              </p>
            </div>

            <Button
              onClick={() => handleTimeEntry('check_out')}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Square className="w-4 h-4 mr-2" />
              {loading ? 'Checking Out...' : 'Check Out'}
            </Button>
          </div>
        )}

        {/* No Available Actions */}
        {!currentActiveJob && availableForCheckIn.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No jobs available for check-in</p>
          </div>
        )}

        {/* Offline Warning */}
        {!online && (
          <Alert className="border-amber-200 bg-amber-50">
            <WifiOff className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              You're offline. Time entries will be synced when you're back online.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export { TimeTrackingWidget };