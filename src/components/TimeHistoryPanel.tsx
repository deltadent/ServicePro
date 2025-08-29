import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { useToast } from "@/hooks/use-toast";
import { useNetwork } from '@/hooks/useNetwork';
import {
  Clock,
  MapPin,
  Calendar,
  FileText,
  Download,
  Filter,
  RefreshCw,
  ChartBar
} from "lucide-react";
import { getJobVisits, getTechnicianTimeEntries, DateRange } from '@/lib/jobsRepo';
import { formatDistance, LocationData } from '@/lib/location';

interface TimeHistoryPanelProps {
  jobId?: string;
  technicianId?: string;
  showFilters?: boolean;
}

interface TimeEntryDisplay {
  id: string;
  jobVisitId: string;
  event: 'check_in' | 'check_out';
  timestamp: Date;
  lat?: number;
  lng?: number;
  accuracy?: number;
  duration?: number; // in minutes
  jobTitle?: string;
}

const TimeHistoryPanel = ({
  jobId,
  technicianId,
  showFilters = true
}: TimeHistoryPanelProps) => {
  const { toast } = useToast();
  const online = useNetwork();

  const [timeEntries, setTimeEntries] = useState<TimeEntryDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    end: new Date()
  });
  const [showAll, setShowAll] = useState(false);

  // Load time entries
  useEffect(() => {
    fetchTimeEntries();
  }, [jobId, technicianId, dateRange, online]);

  const fetchTimeEntries = async () => {
    if (!online) return;

    try {
      setLoading(true);
      let entries: any[] = [];

      if (jobId) {
        // Get job visits and their time entries
        const visits = await getJobVisits(jobId);
        const allEntries = await Promise.all(
          visits.map(async (visit) => {
            // This would need to be implemented to get time entries for a visit
            return [];
          })
        );
        entries = allEntries.flat();
      } else if (technicianId) {
        // Get technician's time entries
        const technicianEntries = await getTechnicianTimeEntries(technicianId, dateRange);
        entries = technicianEntries;
      }

      // Process and format entries
      const processedEntries = processTimeEntries(entries);
      setTimeEntries(processedEntries);

    } catch (error) {
      console.error('Failed to fetch time entries:', error);
      toast({
        title: "Error",
        description: "Failed to load time history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const processTimeEntries = (entries: any[]): TimeEntryDisplay[] => {
    if (!entries.length) return [];

    // Group entries by job visit and pair check-in/check-out
    const visitMap = new Map<string, TimeEntryDisplay[]>();
    const processed: TimeEntryDisplay[] = [];

    // Sort entries by timestamp
    const sorted = entries.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

    sorted.forEach(entry => {
      const visitId = entry.job_visit_id;
      if (!visitMap.has(visitId)) {
        visitMap.set(visitId, []);
      }
      visitMap.get(visitId)?.push({
        id: entry.id,
        jobVisitId: visitId,
        event: entry.event,
        timestamp: new Date(entry.ts),
        lat: entry.lat,
        lng: entry.lng,
        accuracy: entry.accuracy,
        jobTitle: entry.jobs?.title || `Job ${entry.job_id}`,
      });
    });

    // Process each visit's entries
    visitMap.forEach(visitEntries => {
      let checkIn: TimeEntryDisplay | undefined;
      let checkOut: TimeEntryDisplay | undefined;

      visitEntries.forEach(entry => {
        if (entry.event === 'check_in') {
          checkIn = entry;
        } else if (entry.event === 'check_out') {
          checkOut = entry;
        }
      });

      // Add paired entries with duration
      if (checkIn) {
        checkIn.duration = checkOut
          ? (checkOut.timestamp.getTime() - checkIn.timestamp.getTime()) / (1000 * 60)
          : undefined;
        processed.push(checkIn);
      }
      if (checkOut) {
        processed.push(checkOut);
      }
    });

    return processed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const getEventIcon = (event: 'check_in' | 'check_out') => {
    return event === 'check_in' ? '🔵' : '🟢';
  };

  const getEventColor = (event: 'check_in' | 'check_out') => {
    return event === 'check_in' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  const formatTime = (date: Date) => {
    return date.toLocaleString([], {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getLocationQuality = (accuracy?: number) => {
    if (!accuracy) return { quality: 'No GPS', color: 'text-gray-500' };
    if (accuracy <= 10) return { quality: 'Excellent', color: 'text-green-600' };
    if (accuracy <= 25) return { quality: 'Good', color: 'text-blue-600' };
    if (accuracy <= 50) return { quality: 'Fair', color: 'text-yellow-600' };
    return { quality: 'Poor', color: 'text-red-600' };
  };

  const handleExport = () => {
    const csvData = timeEntries.map(entry => ({
      'Timestamp': entry.timestamp.toISOString(),
      'Event': entry.event.replace('_', ' ').toUpperCase(),
      'Job': entry.jobTitle || 'Unknown',
      'Duration': entry.duration ? formatDuration(entry.duration) : '',
      'Latitude': entry.lat || '',
      'Longitude': entry.lng || '',
      'GPS Accuracy': entry.accuracy || '',
      'Location': entry.lat && entry.lng
        ? `${entry.lat.toFixed(6)}, ${entry.lng.toFixed(6)}`
        : 'No GPS data'
    }));

    const csvString = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-entries-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${timeEntries.length} time entries to CSV`
    });
  };

  const displayedEntries = showAll ? timeEntries : timeEntries.slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Time Entries</h3>
          <Badge variant="secondary">{timeEntries.length} entries</Badge>
        </div>
        {timeEntries.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4" />
            <h4 className="font-medium">Filter by Date Range</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <DateTimePicker
                date={dateRange.start}
                setDate={(date) => setDateRange(prev => ({ ...prev, start: date || new Date() }))}
              />
            </div>
            <div>
              <Label htmlFor="end-date">End Date</Label>
              <DateTimePicker
                date={dateRange.end}
                setDate={(date) => setDateRange(prev => ({ ...prev, end: date || new Date() }))}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={fetchTimeEntries}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </Card>
      )}

      {/* Entries List */}
      {loading ? (
        <Card className="p-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            Loading time entries...
          </div>
        </Card>
      ) : timeEntries.length === 0 ? (
        <Card className="p-8">
          <div className="text-center text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <h4 className="text-lg font-medium mb-2">No Time Entries</h4>
            <p className="text-sm">
              {jobId
                ? "No time entries found for this job"
                : technicianId
                ? "No time entries found for this technician"
                : "No time entries in the selected date range"
              }
            </p>
          </div>
        </Card>
      ) : (
        <>
          {displayedEntries.map((entry) => {
            const locationQuality = getLocationQuality(entry.accuracy);

            return (
              <Card key={entry.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="text-xl">{getEventIcon(entry.event)}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className={getEventColor(entry.event)}>
                          {entry.event.replace('_', ' ')}
                        </Badge>
                        {entry.jobTitle && (
                          <span className="text-sm font-medium">{entry.jobTitle}</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatTime(entry.timestamp)}
                      </div>
                    </div>
                  </div>

                  {entry.duration && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {formatDuration(entry.duration)}
                    </Badge>
                  )}
                </div>

                {/* GPS Information */}
                {entry.lat && entry.lng ? (
                  <div className="flex items-center gap-2 mt-3 p-2 bg-gray-50 rounded-md">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <div className="text-sm">
                      <span className="font-medium">GPS:</span> {entry.lat.toFixed(6)}, {entry.lng.toFixed(6)}
                    </div>
                    <Badge className={`text-xs ${locationQuality.color}`}>
                      {locationQuality.quality}
                    </Badge>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-3 p-2 bg-red-50 rounded-md">
                    <MapPin className="w-4 h-4 text-red-500" />
                    <div className="text-sm text-red-600">No GPS data recorded</div>
                  </div>
                )}
              </Card>
            );
          })}

          {/* Show More/Less Button */}
          {timeEntries.length > 10 && (
            <div className="text-center pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? 'Show Less' : `Show All ${timeEntries.length} Entries`}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Summary Stats */}
      {timeEntries.length > 0 && (
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2 mb-3">
            <ChartBar className="w-4 h-4" />
            <h4 className="font-medium">Summary</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {timeEntries.filter(e => e.event === 'check_in').length}
              </div>
              <div className="text-sm text-gray-600">Check-ins</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {timeEntries.filter(e => e.event === 'check_out').length}
              </div>
              <div className="text-sm text-gray-600">Check-outs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {timeEntries.filter(e => e.lat && e.lng).length}
              </div>
              <div className="text-sm text-gray-600">With GPS</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(timeEntries
                  .filter(e => e.duration)
                  .reduce((sum, e) => sum + (e.duration || 0), 0) / 60 * 10) / 10}
              </div>
              <div className="text-sm text-gray-600">Total Hours</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export { TimeHistoryPanel };