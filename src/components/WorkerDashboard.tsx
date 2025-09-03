import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModernCard, StatsCard } from "@/components/ui/modern-card";
import { ModernButton } from "@/components/ui/modern-button";
import { MotionDiv, MotionContainer, AnimatedPage } from "@/components/ui/motion";
import { ModernSkeleton, SkeletonCard } from "@/components/ui/modern-skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

const WorkerDashboard = () => {
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
      <AnimatedPage>
        <div className="h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex flex-col">
          {/* Header skeleton */}
          <div className="bg-white/80 backdrop-blur-sm border-b p-4">
            <ModernSkeleton className="h-8 w-32 mb-2" />
            <ModernSkeleton className="h-4 w-48" />
          </div>

          {/* Compact tracker skeleton */}
          <div className="p-4">
            <ModernSkeleton className="h-12 w-full rounded-xl" />
          </div>

          {/* Job list skeleton */}
          <div className="flex-1 p-4 space-y-3">
            <MotionContainer>
              {[1, 2, 3].map(i => (
                <MotionDiv key={i} variant="fadeInUp" delay={i * 0.1}>
                  <SkeletonCard />
                </MotionDiv>
              ))}
            </MotionContainer>
          </div>
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <div className="h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex flex-col">
        {/* Offline Banner */}
        {!online && (
          <MotionDiv variant="slideInDown" className="bg-gradient-to-r from-orange-100 to-amber-50 border-b border-orange-200 px-4 py-3 flex items-center gap-2 backdrop-blur-sm">
            <div className="w-6 h-6 bg-orange-200 rounded-full flex items-center justify-center">
              <WifiOff className="w-3 h-3 text-orange-600" />
            </div>
            <span className="text-sm font-medium text-orange-800">{OFFLINE_MESSAGES.OFFLINE_BANNER}</span>
          </MotionDiv>
        )}

        {/* Modern Header */}
        <MotionDiv variant="slideInDown" className="bg-white/90 backdrop-blur-md border-b border-white/20 sticky top-0 z-40 shadow-sm">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Dashboard</h1>
                  <p className="text-sm text-gray-500 font-medium">Worker Portal</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {syncing && (
                  <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  </div>
                )}
                <Badge variant="outline" className="hidden sm:inline-flex bg-white/80 backdrop-blur-sm border-blue-200 text-blue-700 font-semibold">
                  {stats.pendingJobs} active
                </Badge>
              </div>
            </div>
          </div>

          {/* Modern Search and Filters */}
          <div className="px-4 pb-4">
            <MotionDiv variant="fadeInUp" delay={0.1} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search jobs..."
                  value={rawSearch}
                  onChange={(e) => setRawSearch(e.target.value)}
                  className="pl-12 h-12 border-gray-200 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm focus:shadow-md transition-all duration-200"
                />
              </div>

              <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded-xl p-1 shadow-sm border border-gray-100 flex-wrap">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'scheduled', label: 'Ready' },
                  { key: 'in_progress', label: 'Active' },
                  { key: 'completed', label: 'Done' }
                ].map(({ key, label }) => (
                  <ModernButton
                    key={key}
                    size="sm"
                    variant={statusFilter === key ? 'gradient' : 'ghost'}
                    className="h-9 px-4 text-sm flex-grow rounded-lg"
                    onClick={() => setStatusFilter(key)}
                  >
                    {label}
                  </ModernButton>
                ))}
              </div>

              <ModernButton
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncing || !online}
                className="h-12 w-full sm:w-auto rounded-xl bg-white/80 backdrop-blur-sm"
                leftIcon={<RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />}
              >
                Sync
              </ModernButton>
            </MotionDiv>
          </div>
        </MotionDiv>

        {/* Modern Compact Time Tracker */}
        <MotionDiv variant="fadeInUp" delay={0.2} className="px-4 py-4 bg-white/60 backdrop-blur-sm border-b border-white/20">
          <ModernCard variant="glass" className="p-1">
            <CompactTimeTracker
              availableJobs={myJobs}
              currentActiveJob={currentActiveJob}
              onTimeEntryUpdate={fetchWorkerData}
            />
          </ModernCard>
        </MotionDiv>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
          {/* Modern Status Summary */}
          <MotionDiv variant="fadeInUp" delay={0.3} className="px-4 py-4 bg-white/40 backdrop-blur-sm border-b border-white/10">
            <div className="grid grid-cols-3 gap-4">
              <MotionDiv variant="scaleIn" delay={0.1} className="text-center">
                <StatsCard 
                  label="Ready" 
                  value={stats.totalScheduled}
                  variant="compact"
                  className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100"
                />
              </MotionDiv>
              <MotionDiv variant="scaleIn" delay={0.2} className="text-center">
                <StatsCard 
                  label="Active" 
                  value={groupedJobs.inProgress.length}
                  variant="compact"
                  className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100"
                  trend={{ value: 0, isPositive: true }}
                />
              </MotionDiv>
              <MotionDiv variant="scaleIn" delay={0.3} className="text-center">
                <StatsCard 
                  label="Done" 
                  value={groupedJobs.completed.length}
                  variant="compact"
                  className="bg-gradient-to-br from-gray-50 to-slate-50 border-gray-100"
                />
              </MotionDiv>
            </div>
          </MotionDiv>

          {/* Modern Jobs List */}
          <div className="p-4 space-y-6">
            <MotionContainer className="space-y-6">
              {/* In Progress Jobs */}
              {groupedJobs.inProgress.length > 0 && (
                <MotionDiv variant="fadeInUp" delay={0.4}>
                  <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg"></div>
                    <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Active Jobs</span>
                  </h2>
                  <div className="space-y-4">
                    {groupedJobs.inProgress.map((job: any, index: number) => (
                      <MotionDiv key={job.id} variant="slideInLeft" delay={index * 0.1}>
                        <ModernCard
                          variant="floating"
                          animated
                          className="border-l-4 border-l-green-500 cursor-pointer hover:border-l-green-600 transition-all duration-300 hover:shadow-xl bg-gradient-to-r from-green-50/50 to-emerald-50/30"
                          onClick={() => {
                            setSelectedJob(job);
                            setShowJobDetails(true);
                          }}
                        >
                          <div className="p-5">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-base font-bold text-gray-900 truncate mb-1">
                                  {job.title}
                                </h3>
                                <p className="text-sm text-gray-600 font-medium">
                                  Job #{job.job_number}
                                </p>
                              </div>
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <ChevronRight className="w-4 h-4 text-green-600" />
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mb-3">
                              <Badge className={`${getPriorityColor(job.priority)} font-semibold`}>
                                {job.priority}
                              </Badge>
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                Started {formatTime(job.started_at)}
                              </Badge>
                            </div>

                            {job.customers?.name && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/60 rounded-lg px-3 py-2">
                                <User className="w-4 h-4 text-green-600" />
                                <span className="font-medium">{job.customers.name}</span>
                              </div>
                            )}
                          </div>
                        </ModernCard>
                      </MotionDiv>
                    ))}
                  </div>
                </MotionDiv>
              )}

              {/* Scheduled Jobs */}
              {groupedJobs.scheduled.length > 0 && (
                <MotionDiv variant="fadeInUp" delay={0.5}>
                  <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full shadow-lg"></div>
                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Scheduled Jobs</span>
                  </h2>
                  <div className="space-y-4">
                    {groupedJobs.scheduled.map((job: any, index: number) => (
                      <MotionDiv key={job.id} variant="slideInLeft" delay={index * 0.1}>
                        <ModernCard
                          variant="elevated"
                          animated
                          className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-blue-50/50 to-indigo-50/30"
                          onClick={() => {
                            setSelectedJob(job);
                            setShowJobDetails(true);
                          }}
                        >
                          <div className="p-5">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-base font-bold text-gray-900 truncate mb-1">
                                  {job.title}
                                </h3>
                                <p className="text-sm text-gray-600 font-medium">
                                  Job #{job.job_number}
                                </p>
                              </div>
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <ChevronRight className="w-4 h-4 text-blue-600" />
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mb-3">
                              <Badge className={`${getPriorityColor(job.priority)} font-semibold`}>
                                {job.priority}
                              </Badge>
                              <Badge className={`${getStatusBadge(job.status)} font-semibold`}>
                                {job.status.replace('_', ' ')}
                              </Badge>
                            </div>

                            {job.scheduled_date && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/60 rounded-lg px-3 py-2">
                                <Calendar className="w-4 h-4 text-blue-600" />
                                <span className="font-medium">{new Date(job.scheduled_date).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </ModernCard>
                      </MotionDiv>
                    ))}
                  </div>
                </MotionDiv>
              )}

              {/* Completed Jobs */}
              {groupedJobs.completed.length > 0 && (
                <MotionDiv variant="fadeInUp" delay={0.6}>
                  <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-3">
                    <div className="w-3 h-3 bg-gray-400 rounded-full shadow-lg"></div>
                    <span className="bg-gradient-to-r from-gray-600 to-slate-600 bg-clip-text text-transparent">Completed Today</span>
                  </h2>
                  <div className="space-y-4">
                    {groupedJobs.completed.slice(0, 3).map((job: any, index: number) => (
                      <MotionDiv key={job.id} variant="slideInLeft" delay={index * 0.1}>
                        <ModernCard
                          variant="glass"
                          animated
                          className="border-l-4 border-l-gray-400 cursor-pointer hover:border-l-gray-500 transition-all duration-300 hover:shadow-lg bg-gradient-to-r from-gray-50/50 to-slate-50/30"
                          onClick={() => {
                            setSelectedJob(job);
                            setShowJobDetails(true);
                          }}
                        >
                          <div className="p-5">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-base font-bold text-gray-900 truncate mb-1">
                                  {job.title}
                                </h3>
                                <p className="text-sm text-gray-600 font-medium">
                                  Job #{job.job_number}
                                </p>
                              </div>
                              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                <ChevronRight className="w-4 h-4 text-gray-600" />
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mb-3">
                              <Badge className="bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 font-semibold border border-gray-200">
                                ✓ Completed
                              </Badge>
                            </div>

                            {job.completed_at && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/60 rounded-lg px-3 py-2">
                                <Clock className="w-4 h-4 text-gray-600" />
                                <span className="font-medium">{formatTime(job.completed_at)}</span>
                              </div>
                            )}
                          </div>
                        </ModernCard>
                      </MotionDiv>
                    ))}
                  </div>
                </MotionDiv>
              )}

              {/* Empty State */}
              {filteredJobs.length === 0 && (
                <MotionDiv variant="fadeInUp" delay={0.4} className="text-center py-16">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Wrench className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">No jobs found</h3>
                  <p className="text-base text-gray-600 max-w-sm mx-auto">
                    {rawSearch ? 'Try adjusting your search terms' : 'All caught up for now! Great work!'}
                  </p>
                </MotionDiv>
              )}
            </MotionContainer>
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
      </div>
    </AnimatedPage>
  );
};

export default WorkerDashboard;
