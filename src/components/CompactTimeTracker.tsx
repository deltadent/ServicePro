import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { getCurrentLocation, LocationData, validateWorkLocation } from '@/lib/location';
import { recordTimeEntry } from '@/lib/jobsRepo';

interface LocationValidation {
  isValid: boolean;
  distance: number;
}

interface CompactTimeTrackerProps {
  availableJobs: Array<{
    id: string;
    title: string;
    status: string;
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

const CompactTimeTracker = ({
  availableJobs,
  currentActiveJob,
  onTimeEntryUpdate
}: CompactTimeTrackerProps) => {
  const { toast } = useToast();
  const online = useNetwork();
  const { user } = useAuth();

  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [locationValidation, setLocationValidation] = useState<LocationValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);

  const availableForCheckIn = availableJobs.filter(job => job.status === 'scheduled');

  const validateJobLocation = async (jobId: string) => {
    const job = availableJobs.find(j => j.id === jobId);
    if (!job?.customers?.lat || !job.customers?.lng) {
      setLocationValidation(null);
      return;
    }

    setIsValidating(true);
    try {
      const location = await getCurrentLocation({
        accuracy: 50,
        timeout: 10000
      });

      if (location) {
        const validation = validateWorkLocation(
          { lat: job.customers.lat, lng: job.customers.lng },
          { lat: location.latitude, lng: location.longitude }
        );
        setLocationData(location);
        setLocationValidation(validation);
      }
    } catch (error) {
      console.error('Location validation failed:', error);
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

    if (!selectedJobId && event === 'check_in') {
      toast({
        title: "Select a job",
        description: "Choose a job before checking in",
        variant: "destructive"
      });
      return;
    }

    const jobId = event === 'check_in' ? selectedJobId : currentActiveJob?.id;
    if (!jobId) return;

    setLoading(true);
    try {
      await recordTimeEntry(jobId, event, locationData || undefined, user.id);

      toast({
        title: event === 'check_in' ? "Checked In" : "Checked Out",
        description: event === 'check_in'
          ? "Time tracking started successfully"
          : "Time tracking completed successfully"
      });

      setSelectedJobId('');
      setLocationData(null);
      setLocationValidation(null);
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

  const getStatusIcon = () => {
    if (!online) return <WifiOff className="w-4 h-4 text-red-500" />;
    if (currentActiveJob) return <Clock className="w-4 h-4 text-green-600 animate-pulse" />;
    if (availableForCheckIn.length > 0) return <Clock className="w-4 h-4 text-blue-600" />;
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  const getStatusText = () => {
    if (!online) return "Offline";
    if (currentActiveJob) return `Working on: ${currentActiveJob.title}`;
    if (availableForCheckIn.length > 0) return `${availableForCheckIn.length} job${availableForCheckIn.length > 1 ? 's' : ''} ready`;
    return "No jobs available";
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border border-gray-200">
      {/* Status Indicator */}
      <div className="flex-shrink-0">
        {getStatusIcon()}
      </div>

      {/* Status Text */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">
          {getStatusText()}
        </div>
        {currentActiveJob && (
          <div className="text-xs text-gray-600 mt-0.5">
            Since {new Date(currentActiveJob.started_at || '').toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        )}
      </div>

      {/* Time Tracking Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Check In - Only show if jobs available */}
        {availableForCheckIn.length > 0 && !currentActiveJob && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="default"
                className="h-8 px-3 bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                <Play className="w-3 h-3 mr-1" />
                Check In
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Check In</h4>

                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a job..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableForCheckIn.map(job => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedJobId && (
                  <div className="space-y-2">
                    {isValidating ? (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>Getting your location...</AlertDescription>
                      </Alert>
                    ) : locationValidation ? (
                      <Alert className={locationValidation.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                        <MapPin className="h-4 w-4" />
                        <AlertDescription>
                          {locationValidation.isValid
                            ? `${locationValidation.distance}m from job site`
                            : `${locationValidation.distance}m from job site - too far?`
                          }
                        </AlertDescription>
                      </Alert>
                    ) : null}
                  </div>
                )}

                <Button
                  onClick={() => handleTimeEntry('check_in')}
                  disabled={!selectedJobId || isValidating || !online}
                  className="w-full"
                >
                  {!online && (
                    <WifiOff className="w-3 h-3 mr-1" />
                  )}
                  {loading ? 'Checking In...' : 'Confirm Check In'}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Check Out - Only show if currently working */}
        {currentActiveJob && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleTimeEntry('check_out')}
            disabled={loading}
            className="h-8 px-3 border-green-600 text-green-700 hover:bg-green-50"
          >
            <Square className="w-3 h-3 mr-1" />
            {loading ? 'Checking Out...' : 'Check Out'}
          </Button>
        )}

        {/* Refresh Location for Check In Job */}
        {selectedJobId && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => validateJobLocation(selectedJobId)}
            disabled={isValidating}
            className="h-8 px-2"
          >
            {isValidating ? (
              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <MapPin className="w-3 h-3" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export { CompactTimeTracker };