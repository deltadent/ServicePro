import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  Clock,
  Navigation,
  FileText,
  Search,
  MapPin,
  Phone,
  User,
  MoreVertical,
  Play,
  Wifi,
  WifiOff,
  RefreshCw,
  Wrench,
  ChevronRight
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from "@/hooks/use-toast";
import { useDevice } from '@/hooks/use-device';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchJobsList, updateJobCache } from '@/lib/jobsRepo';
import { runSync } from '@/lib/sync';
import { getPendingCountByJob } from '@/lib/queue';
import { OFFLINE_MESSAGES } from '@/lib/constants';
import JobDetailsDialog from './JobDetailsDialog';
import JobHistory from './JobHistory';
import { TechnicianTimeTracker } from './TechnicianTimeTracker';
import { CompactTimeTracker } from './CompactTimeTracker';

const CompactWorkerDashboard = () => {
  const { user } = useAuth();
  const { isTablet, isMobile } = useDevice();
  const { toast } = useToast();
  const online = useNetwork();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    todayJobs: 0,
    completedJobs: 0,
    pendingJobs: 0,
    monthlyRating: 0,
    weeklyCompletedJobs: 0,
    avgCompletionTime: 0,
    totalRevenue: 0,
    totalScheduled: 0
  });

  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pendingSyncCounts, setPendingSyncCounts] = useState<Record<string, number>>({});

  // --- Search / filter / sort ---
  const [rawSearch, setRawSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Debounce search input
  useEffect(() => {
    const id = setTimeout(() => setSearchTerm(rawSearch), 250);
    return () => clearTimeout(id);
  }, [rawSearch]);

  useEffect(() => {
    if (user) fetchWorkerData();
  }, [user]);

  useEffect(() => {
    updatePendingSyncCounts();
  }, [myJobs]);

  // Auto-sync when coming back online
  useEffect(() => {
    let wasOffline = false;
    if (!online) {
      wasOffline = true;
    } else if (wasOffline) {
      handleSync();
    }
  }, [online]);

  const fetchWorkerData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const result = await fetchJobsList({ technicianId: user.id });

      if (result.fromCache) {
        console.log('Loaded jobs from cache');
      }

      const jobs = result.jobs;
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

      const todayJobs = jobs.filter(job =>
        job.scheduled_date >= todayStart
      ).length;

      const pendingJobs = jobs.filter(j => j.status === 'scheduled' || j.status === 'in_progress').length;
      const completedJobs = jobs.filter(j => j.status === 'completed').length;
      const totalScheduled = jobs.filter(j => j.status === 'scheduled').length;

      setStats(prev => ({
        ...prev,
        todayJobs,
        pendingJobs,
        completedJobs,
        totalScheduled
      }));

      setMyJobs(jobs);

    } catch (error: any) {
      console.error('Error fetching worker data:', error);
      toast({
        title: "Error",
        description: online ? "Failed to load dashboard data" : "You're offline - showing cached data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const startJob = async (jobId: string) => {
    const optimisticStartedAt = new Date().toISOString();
    setMyJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'in_progress', started_at: optimisticStartedAt } : j));
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'in_progress', started_at: optimisticStartedAt })
        .eq('id', jobId);
      if (error) throw error;
      toast({ title: 'Success', description: 'Job started successfully' });
    } catch (error) {
      setMyJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'scheduled', started_at: null } : j));
      toast({ title: 'Error', description: 'Failed to start job', variant: 'destructive' });
    }
  };

  const handleSync = async () => {
    if (syncing) return;

    setSyncing(true);
    try {
      const result = await runSync();
      if (result.success) {
        toast({
          title: "Sync Complete",
          description: `Synced ${result.processedCount} items successfully`,
        });
        await fetchWorkerData();
        await updatePendingSyncCounts();
      } else {
        toast({
          title: "Sync Failed",
          description: result.errors.join(', '),
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Sync Error",
        description: "Failed to sync data",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  const updatePendingSyncCounts = async () => {
    const counts: Record<string, number> = {};
    for (const job of myJobs) {
      try {
        counts[job.id] = await getPendingCountByJob(job.id);
      } catch (error) {
        counts[job.id] = 0;
      }
    }
    setPendingSyncCounts(counts);
  };

  // Get current active job
  const currentActiveJob = myJobs.find(job => job.status === 'in_progress');

  // Filter jobs based on search and status
  const filteredJobs = useMemo(() => {
    return myJobs.filter(job => {
      const matchesSearch = searchTerm === '' ||
        job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.job_number?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter = statusFilter === 'all' || job.status === statusFilter;

      return matchesSearch && matchesFilter;
    });
  }, [myJobs, searchTerm, statusFilter]);

  // Group by job status for better organization
  const groupedJobs = useMemo(() => {
    const scheduled = filteredJobs.filter(j => j.status === 'scheduled');
    const inProgress = filteredJobs.filter(j => j.status === 'in_progress');
    const completed = filteredJobs.filter(j => j.status === 'completed');

    return { scheduled, inProgress, completed };
  }, [filteredJobs]);

  // Helper functions
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (date: string | Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex flex-col">
        {/* Header skeleton */}
        <div className="bg-white border-b p-4">
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>

        {/* Compact tracker skeleton */}
        <div className="p-4">
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>

        {/* Job list skeleton */}
        <div className="flex-1 p-4 space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Offline Banner */}
      {!online && (
        <div className="bg-orange-100 border-b border-orange-300 px-4 py-2 flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-orange-600" />
          <span className="text-sm text-orange-800">{OFFLINE_MESSAGES.OFFLINE_BANNER}</span>
        </div>
      )}

      {/* Compact Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-600">Worker Portal</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {syncing && (
                <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
              )}
              <Badge variant="outline" className="hidden sm:inline-flex">
                {stats.pendingJobs} active
              </Badge>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search jobs..."
                value={rawSearch}
                onChange={(e) => setRawSearch(e.target.value)}
                className="pl-10 h-10 border-gray-200"
              />
            </div>

            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {[
                { key: 'all', label: 'All' },
                { key: 'scheduled', label: 'Ready' },
                { key: 'in_progress', label: 'Active' },
                { key: 'completed', label: 'Done' }
              ].map(({ key, label }) => (
                <Button
                  key={key}
                  size="sm"
                  variant={statusFilter === key ? 'default' : 'ghost'}
                  className="h-8 px-3 text-xs"
                  onClick={() => setStatusFilter(key)}
                >
                  {label}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing || !online}
              className="h-10"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Compact Time Tracker */}
      <div className="px-4 py-3 bg-white border-b">
        <CompactTimeTracker
          availableJobs={myJobs}
          currentActiveJob={currentActiveJob}
          onTimeEntryUpdate={fetchWorkerData}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Status Summary */}
        <div className="px-4 py-3 bg-white border-b">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600">{stats.totalScheduled}</div>
              <div className="text-xs text-gray-600">Ready</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">{groupedJobs.inProgress.length}</div>
              <div className="text-xs text-gray-600">Active</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-600">{groupedJobs.completed.length}</div>
              <div className="text-xs text-gray-600">Done</div>
            </div>
          </div>
        </div>

        {/* Jobs List */}
        <div className="p-4 space-y-3">
          {/* In Progress Jobs */}
          {groupedJobs.inProgress.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Active Jobs
              </h2>
              <div className="space-y-3">
                {groupedJobs.inProgress.map((job: any) => (
                  <Card
                    key={job.id}
                    className="shadow-sm border-l-4 border-l-green-500 cursor-pointer hover:border-l-green-600 transition-colors"
                    onClick={() => {
                      setSelectedJob(job);
                      setShowJobDetails(true);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {job.title}
                          </h3>
                          <p className="text-xs text-gray-600 mt-1">
                            Job #{job.job_number}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getPriorityColor(job.priority)}>
                            {job.priority}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            Started {formatTime(job.started_at)}
                          </Badge>
                        </div>
                      </div>

                      {job.customers?.name && (
                        <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {job.customers.name}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Scheduled Jobs */}
          {groupedJobs.scheduled.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Scheduled Jobs
              </h2>
              <div className="space-y-3">
                {groupedJobs.scheduled.map((job: any) => (
                  <Card
                    key={job.id}
                    className="shadow-sm cursor-pointer hover:shadow-md transition-all"
                    onClick={() => {
                      setSelectedJob(job);
                      setShowJobDetails(true);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {job.title}
                          </h3>
                          <p className="text-xs text-gray-600 mt-1">
                            Job #{job.job_number}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getPriorityColor(job.priority)}>
                            {job.priority}
                          </Badge>
                          <Badge className={getStatusBadge(job.status)}>
                            {job.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>

                      {job.scheduled_date && (
                        <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(job.scheduled_date).toLocaleDateString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Completed Jobs */}
          {groupedJobs.completed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                Completed Today
              </h2>
              <div className="space-y-3">
                {groupedJobs.completed.slice(0, 3).map((job: any) => (
                  <Card
                    key={job.id}
                    className="shadow-sm border-l-4 border-l-gray-400 cursor-pointer hover:border-l-gray-500 transition-colors"
                    onClick={() => {
                      setSelectedJob(job);
                      setShowJobDetails(true);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {job.title}
                          </h3>
                          <p className="text-xs text-gray-600 mt-1">
                            Job #{job.job_number}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </div>

                      <div className="flex items-center justify-between">
                        <Badge className="bg-gray-100 text-gray-800">
                          Completed
                        </Badge>
                      </div>

                      {job.completed_at && (
                        <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(job.completed_at)}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredJobs.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Wrench className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No jobs found</h3>
              <p className="text-sm text-gray-600">
                {rawSearch ? 'Try adjusting your search' : 'All caught up for now!'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Job Details Dialog */}
      {showJobDetails && selectedJob && (
        <JobDetailsDialog
          job={selectedJob}
          isOpen={showJobDetails}
          onClose={() => {
            setShowJobDetails(false);
            setSelectedJob(null);
          }}
          onJobUpdate={fetchWorkerData}
        />
      )}
    </div>
  );
};

export { CompactWorkerDashboard };