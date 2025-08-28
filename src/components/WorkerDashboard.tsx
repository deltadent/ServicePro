import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Target,
  TrendingUp,
  CheckCircle
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
import WorkerDashboardTablet from './WorkerDashboardTablet';
import BottomNavBar from './BottomNavBar';

// --- Helpers ---
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'bg-red-500 text-white';
    case 'high': return 'bg-brand-gold-500 text-white';
    case 'medium': return 'bg-brand-blue-500 text-white';
    case 'low': return 'bg-brand-green-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
};

const getPriorityGlow = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'shadow-glow';
    case 'high': return 'shadow-glow-gold';
    case 'medium': return 'shadow-glow';
    case 'low': return 'shadow-soft';
    default: return 'shadow-soft';
  }
};

// Empty State Component
const EmptyState = ({ icon: Icon, title, description, action }: {
  icon: any;
  title: string;
  description: string;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div className="relative mb-6">
      <div className="w-24 h-24 bg-gradient-to-br from-brand-blue-100 to-brand-blue-200 rounded-2xl flex items-center justify-center animate-float">
        <Icon className="w-12 h-12 text-brand-blue-600" />
      </div>
      <div className="absolute -top-2 -right-2 w-8 h-8 bg-brand-gold-400 rounded-full flex items-center justify-center">
        <CheckCircle className="w-4 h-4 text-white" />
      </div>
    </div>
    <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
    <p className="text-muted-foreground mb-6 max-w-sm">{description}</p>
    {action}
  </div>
);

const getStatusBadgeStyle = (status: string) => {
  switch (status) {
    case 'scheduled':
      return 'border-primary/30 text-primary bg-primary/10';
    case 'in_progress':
      return 'border-destructive/30 text-destructive bg-destructive/10';
    case 'completed':
      return 'border-emerald-400/30 text-emerald-600 bg-emerald-500/10';
    default:
      return 'border-muted-foreground/30';
  }
};

const formatDayLabel = (date: Date) => {
  const today = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const t0 = startOf(today).getTime();
  const d0 = startOf(date).getTime();
  const diffDays = Math.round((d0 - t0) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  const fmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: '2-digit', month: 'short' });
  return fmt.format(date);
};

const formatTime = (date: Date) => new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date);
const formatDate = (date: Date) => new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit' }).format(date);

const minutesUntil = (when: Date) => Math.round((when.getTime() - Date.now()) / (1000 * 60));

const relativeTime = (when: Date) => {
  const mins = minutesUntil(when);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (Math.abs(mins) < 60) return rtf.format(mins, 'minute');
  const hours = Math.round(mins / 60);
  return rtf.format(hours, 'hour');
};

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
    totalRevenue: 0
  });

  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [syncing, setSyncing] = useState(false);
  const [pendingSyncCounts, setPendingSyncCounts] = useState<Record<string, number>>({});

  // --- Search / filter / sort ---
  const [rawSearch, setRawSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(() => localStorage.getItem('wd_statusFilter') || 'all');
  const [sortBy, setSortBy] = useState<string>(() => localStorage.getItem('wd_sortBy') || 'scheduled_date');

  // Debounce search input
  useEffect(() => {
    const id = setTimeout(() => setSearchTerm(rawSearch), 250);
    return () => clearTimeout(id);
  }, [rawSearch]);

  // Persist filters
  useEffect(() => { localStorage.setItem('wd_statusFilter', statusFilter); }, [statusFilter]);
  useEffect(() => { localStorage.setItem('wd_sortBy', sortBy); }, [sortBy]);

  useEffect(() => {
    if (user) fetchWorkerData();
  }, [user]);

  // Auto-sync when coming back online
  useEffect(() => {
    let wasOffline = false;

    if (!online) {
      wasOffline = true;
    } else if (wasOffline) {
      // Just came back online, trigger sync
      handleSync();
    }
  }, [online]);

  // Update pending sync counts when jobs change
  useEffect(() => {
    updatePendingSyncCounts();
  }, [myJobs]);

  // Realtime updates for this technician
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('jobs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs', filter: `technician_id=eq.${user.id}` },
        (payload: any) => {
          const j = payload.new;
          setMyJobs((prev) => {
            // Only keep scheduled/in_progress in current tab list
            if (!['scheduled', 'in_progress'].includes(j.status)) {
              return prev.filter(x => x.id !== j.id);
            }
            const exists = prev.some(x => x.id === j.id);
            return exists ? prev.map(x => x.id === j.id ? j : x) : [j, ...prev];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchWorkerData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Use offline-first jobs repository
      const result = await fetchJobsList({ technicianId: user.id });

      // Cache was hit if fromCache is true
      if (result.fromCache) {
        console.log('Loaded jobs from cache');
      }

      const jobs = result.jobs;
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      const todayJobs = jobs.filter(job =>
        job.scheduled_date >= todayStart && job.scheduled_date < todayEnd
      ).length;

      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const completedJobs = jobs.filter(j => j.status === 'completed').length;
      const pendingJobs = jobs.filter(j => j.status === 'scheduled' || j.status === 'in_progress').length;

      const weeklyCompletedJobs = jobs.filter(job => {
        const completedDate = new Date(job.completed_at || job.created_at);
        return job.status === 'completed' && completedDate >= weekAgo;
      }).length;

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyCompletedJobs = jobs.filter(job => {
        const jobDate = new Date(job.completed_at || job.created_at);
        return job.status === 'completed' &&
               jobDate.getMonth() === currentMonth &&
               jobDate.getFullYear() === currentYear;
      });

      const monthlyRating = 0;

      const completedJobsWithDuration = jobs.filter(job =>
        job.status === 'completed' && job.started_at && job.completed_at
      );

      const avgCompletionTime = completedJobsWithDuration.length > 0
        ? completedJobsWithDuration.reduce((sum, job) => {
            const start = new Date(job.started_at);
            const end = new Date(job.completed_at);
            return sum + (end.getTime() - start.getTime()) / (1000 * 60);
          }, 0) / completedJobsWithDuration.length
        : 0;

      const totalRevenue = jobs.filter(job => job.status === 'completed')
        .reduce((sum, job) => sum + (job.total_cost || 0), 0);

      setStats({
        todayJobs,
        completedJobs,
        pendingJobs,
        monthlyRating,
        weeklyCompletedJobs,
        avgCompletionTime,
        totalRevenue
      });

      setMyJobs(jobs.filter(job => job.status === 'scheduled' || job.status === 'in_progress'));

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

  // Optimistic start
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
    } catch (error:any) {
      // rollback
      setMyJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'scheduled', started_at: null } : j));
      toast({ title: 'Error', description: 'Failed to start job', variant: 'destructive' });
    }
  };

  const openNavigation = (job: any) => {
    const customer = job.customers;
    if (!customer) return;
    let query = '';
    if (customer.short_address && customer.short_address.trim()) {
      query = customer.short_address.trim();
    } else if (customer.address) {
      query = `${customer.address}, ${customer.city}, ${customer.state}`;
    } else {
      query = `${customer.city}, ${customer.state}`;
    }
    const encodedQuery = encodeURIComponent(query);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedQuery}`, '_blank');
  };

  const callCustomer = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  // Handle manual sync
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
        // Refresh jobs data
        await fetchWorkerData();
        // Update pending counts
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

  // Update pending sync counts for all jobs
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

  // Filtering + Sorting
  const filteredAndSortedJobs = useMemo(() => {
    let filtered = myJobs.filter(job => {
      const title = (job.title || '').toLowerCase();
      const jobNo = (job.job_number || '').toLowerCase();
      const cust = (job.customers?.name || '').toLowerCase();
      const q = searchTerm.toLowerCase();
      const matchesSearch = title.includes(q) || jobNo.includes(q) || cust.includes(q);
      const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];
      if (sortBy === 'customer_name') {
        aValue = a.customers?.name || '';
        bValue = b.customers?.name || '';
      }
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      if (!aValue) return 1;
      if (!bValue) return -1;
      return aValue < bValue ? -1 : 1;
    });

    return filtered;
  }, [myJobs, searchTerm, statusFilter, sortBy]);

  // Group by day for sticky section headers
  const groupedJobs = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const job of filteredAndSortedJobs) {
      const d = new Date(job.scheduled_date);
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(job);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredAndSortedJobs]);

  // --- Loading skeleton ---
  if (loading) {
    return (
      <div className="h-screen bg-muted/30 flex flex-col">
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
                <p className="text-xs text-muted-foreground">Loading…</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">—</Badge>
          </div>
          <div className="hidden sm:flex gap-1 mt-4 p-1 bg-muted rounded-lg">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            {[0,1].map(i => (
              <Card key={i} className="bg-gradient-to-br from-muted/40 to-muted/20">
                <CardContent className="p-3">
                  <div className="text-center space-y-2">
                    <Skeleton className="h-7 w-14 mx-auto" />
                    <Skeleton className="h-4 w-20 mx-auto" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {[...Array(4)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-muted/30 flex flex-col">
      {/* Animated Offline Banner */}
      {!online && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200/50 px-4 py-3 animate-slide-down shadow-soft">
          <div className="flex items-center gap-3 text-amber-800">
            <div className="relative">
              <WifiOff className="w-5 h-5 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full animate-ping"></div>
            </div>
            <span className="text-sm font-medium">{OFFLINE_MESSAGES.OFFLINE_BANNER}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Welcome back!</p>
                <div className="flex items-center gap-1">
                  {online ? (
                    <Wifi className="w-3 h-3 text-green-500" />
                  ) : (
                    <WifiOff className="w-3 h-3 text-amber-500" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {online ? OFFLINE_MESSAGES.ONLINE_STATUS : OFFLINE_MESSAGES.OFFLINE_STATUS}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing || !online}
              className="h-8"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? OFFLINE_MESSAGES.SYNCING_BUTTON : OFFLINE_MESSAGES.SYNC_BUTTON}
            </Button>
            <Badge variant="secondary" className="text-xs">
              {stats.pendingJobs} active
            </Badge>
          </div>
        </div>

        {/* Tabs (mobile visible when >= sm as in original) */}
        <div className="hidden sm:flex gap-1 mt-4 p-1 bg-muted rounded-lg">
          <Button
            variant={activeTab === 'current' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('current')}
            size="sm"
            className="flex-1 h-8 text-xs font-medium"
          >
            Current
          </Button>
          <Button
            variant={activeTab === 'history' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('history')}
            size="sm"
            className="flex-1 h-8 text-xs font-medium"
          >
            History
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {activeTab === 'current' ? (
          <>
            {/* Stats overview */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="p-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{stats.todayJobs}</div>
                    <div className="text-xs text-muted-foreground">Today's Jobs</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
                <CardContent className="p-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-destructive">{stats.pendingJobs}</div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search + status filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search jobs..."
                  value={rawSearch}
                  onChange={(e) => setRawSearch(e.target.value)}
                  className="pl-10 h-10 bg-background"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'scheduled', label: 'Scheduled' },
                  { key: 'in_progress', label: 'In Progress' },
                ].map(({ key, label }) => (
                  <Button
                    key={key}
                    size="sm"
                    variant={statusFilter === key ? 'default' : 'outline'}
                    className="h-8 px-3"
                    onClick={() => setStatusFilter(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Conditional rendering for tablet */}
            {isTablet ? (
              <WorkerDashboardTablet 
                jobs={filteredAndSortedJobs}
                handleViewDetails={(job: any) => { setSelectedJob(job); setShowJobDetails(true); }}
                openNavigation={openNavigation}
                callCustomer={(phone: string) => callCustomer(phone)}
                startJob={(id: string) => startJob(id)}
              />
            ) : (
              <div className="space-y-3">
                {/* Grouped by day with sticky headers */}
                {groupedJobs.length === 0 ? (
                  <Card className="p-8 text-center">
                    <div className="text-muted-foreground text-sm">No jobs found</div>
                  </Card>
                ) : (
                  groupedJobs.map(([isoKey, jobs]) => {
                    const d = new Date(isoKey);
                    return (
                      <div key={isoKey} className="space-y-3">
                        <div className="sticky top-[96px] z-40 bg-background/95 backdrop-blur px-1 py-2 font-medium text-sm border-b">
                          {formatDayLabel(d)}
                        </div>
                        {jobs.map((job: any) => (
                          <Card key={job.id} className="overflow-hidden border-l-4 border-l-primary">
                            <CardContent className="p-4">
                              {/* Job Header */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-2 h-2 rounded-full ${getPriorityColor(job.priority)}`}></div>
                                    <div className="flex items-center gap-1">
                                      <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                        {job.job_number}
                                      </Badge>
                                      {pendingSyncCounts[job.id] > 0 && (
                                        <Badge variant="outline" className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border-amber-200">
                                          {OFFLINE_MESSAGES.PENDING_BADGE(pendingSyncCounts[job.id])}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <h3 className="font-medium text-sm leading-tight truncate">{job.title}</h3>
                                  <p
                                    className="text-xs text-blue-600 hover:text-blue-800 mt-1 cursor-pointer underline"
                                    onClick={() => {
                                      const customerId = job.customers?.id;
                                      if (customerId) {
                                        navigate(`/customers/${customerId}?from=job`);
                                      }
                                    }}
                                  >
                                    {job.customers?.name}
                                  </p>
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs shrink-0 ${getStatusBadgeStyle(job.status)}`}
                                >
                                  {job.status === 'scheduled' ? 'Scheduled' : 
                                   job.status === 'in_progress' ? 'In Progress' : job.status}
                                </Badge>
                              </div>

                              {/* Job Details */}
                              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(new Date(job.scheduled_date))}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(new Date(job.scheduled_date))}
                                  <span className="ml-2">· {relativeTime(new Date(job.scheduled_date))}</span>
                                </div>
                              </div>

                              {/* Location */}
                              {job.customers?.short_address && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
                                  <MapPin className="w-3 h-3" />
                                  <span className="truncate">{job.customers.short_address}</span>
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex gap-2 mt-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openNavigation(job)}
                                  className="flex-1 h-9 text-xs"
                                >
                                  <Navigation className="w-3.5 h-3.5 mr-1.5" />
                                  Navigate
                                </Button>
                                {job.status === 'scheduled' && (
                                  <Button
                                    size="sm"
                                    onClick={() => startJob(job.id)}
                                    className="flex-1 h-9 text-xs bg-green-600 hover:bg-green-700"
                                  >
                                    <Play className="w-3.5 h-3.5 mr-1.5" />
                                    Start Job
                                  </Button>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-9 w-9">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => { setSelectedJob(job); setShowJobDetails(true); }}>
                                      <FileText className="mr-2 h-4 w-4" />
                                      <span>View Details</span>
                                    </DropdownMenuItem>
                                    {(job.customers?.phone_mobile || job.customers?.phone_work) && (() => {
                                      const phoneToCall = job.customers?.preferred_contact === 'mobile' ? job.customers.phone_mobile :
                                                         job.customers?.preferred_contact === 'work' ? job.customers.phone_work :
                                                         job.customers?.phone_mobile || job.customers?.phone_work;
                                      return (
                                        <DropdownMenuItem onClick={() => callCustomer(phoneToCall!)}>
                                          <Phone className="mr-2 h-4 w-4" />
                                          <span>Call Customer</span>
                                        </DropdownMenuItem>
                                      );
                                    })()}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        ) : (
          <JobHistory />
        )}
      </div>

      {/* Job Details Dialog */}
      {showJobDetails && selectedJob && (
        <JobDetailsDialog
          job={selectedJob}
          isOpen={showJobDetails}
          onClose={() => {
            setShowJobDetails(false);
            setSelectedJob(null);
            fetchWorkerData();
          }}
        />
      )}

      <BottomNavBar activeTab={activeTab} setActiveTab={(t: 'current'|'history') => setActiveTab(t)} />
    </div>
  );
};

export default WorkerDashboard;
