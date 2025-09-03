
import { useState, useEffect } from 'react';
import { ModernCard, StatsCard } from "@/components/ui/modern-card";
import { ModernButton, FloatingActionButton } from "@/components/ui/modern-button";
import { MotionDiv, MotionContainer, AnimatedPage } from "@/components/ui/motion";
import { SkeletonStats, SkeletonCard } from "@/components/ui/modern-skeleton";
import { AppShell, PageHeader, ContentArea, QuickStats } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Wrench,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Target,
  MapPin,
  Activity,
  Plus,
  RefreshCw,
  Download
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { getTimeTrackingStats } from '@/lib/jobsRepo';

const AdminDashboard = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalJobs: 0,
    completedJobs: 0,
    pendingJobs: 0,
    inProgressJobs: 0,
    totalCustomers: 0,
    totalTechnicians: 0,
    monthlyRevenue: 0,
    avgCompletionTime: 0
  });
  const [timeStats, setTimeStats] = useState({
    totalHoursWorked: 0,
    locationComplianceRate: 0,
    averageTimePerJob: 0,
    totalJobsTracked: 0
  });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch jobs data
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          *,
          customers(name),
          profiles(full_name)
        `)
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      // Fetch customers count
      const { count: customersCount, error: customersError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      if (customersError) throw customersError;

      // Fetch technicians count
      const { count: techniciansCount, error: techniciansError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'worker');

      if (techniciansError) throw techniciansError;

      // Fetch time tracking statistics
      const timeTrackingStats = await getTimeTrackingStats();

      // Calculate statistics
      const totalJobs = jobs?.length || 0;
      const completedJobs = jobs?.filter(j => j.status === 'completed').length || 0;
      const pendingJobs = jobs?.filter(j => j.status === 'scheduled').length || 0;
      const inProgressJobs = jobs?.filter(j => j.status === 'in_progress').length || 0;

      // Calculate monthly revenue
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyJobs = jobs?.filter(job => {
        const jobDate = new Date(job.created_at);
        return jobDate.getMonth() === currentMonth && jobDate.getFullYear() === currentYear;
      }) || [];
      const monthlyRevenue = monthlyJobs.reduce((sum, job) => sum + (job.total_cost || 0), 0);

      // Calculate average completion time
      const completedJobsWithDuration = jobs?.filter(job => 
        job.status === 'completed' && job.started_at && job.completed_at
      ) || [];
      
      const avgCompletionTime = completedJobsWithDuration.length > 0 
        ? Math.round(completedJobsWithDuration.reduce((sum, job) => {
            const start = new Date(job.started_at);
            const end = new Date(job.completed_at);
            const duration = (end.getTime() - start.getTime()) / (1000 * 60); // in minutes
            return sum + duration;
          }, 0) / completedJobsWithDuration.length)
        : 0;

      setStats({
        totalJobs,
        completedJobs,
        pendingJobs,
        inProgressJobs,
        totalCustomers: customersCount || 0,
        totalTechnicians: techniciansCount || 0,
        monthlyRevenue,
        avgCompletionTime
      });

      // Set time tracking statistics
      setTimeStats(timeTrackingStats);

      // Set recent jobs
      setRecentJobs(jobs?.slice(0, 5) || []);

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const refreshDashboard = () => {
    setLoading(true);
    fetchDashboardData();
  };

  const quickStatsData = [
    {
      label: "Total Jobs",
      value: stats.totalJobs,
      trend: { value: 12, isPositive: true },
      icon: <Wrench className="w-5 h-5" />
    },
    {
      label: "Completed",
      value: stats.completedJobs,
      trend: { value: 8, isPositive: true },
      icon: <CheckCircle className="w-5 h-5" />
    },
    {
      label: "In Progress", 
      value: stats.inProgressJobs,
      icon: <Clock className="w-5 h-5" />
    },
    {
      label: "Revenue",
      value: `$${stats.monthlyRevenue.toFixed(0)}`,
      trend: { value: 15, isPositive: true },
      icon: <DollarSign className="w-5 h-5" />
    }
  ];

  if (loading) {
    return (
      <AnimatedPage>
        <PageHeader 
          title="Admin Dashboard"
          description="Comprehensive overview of your field service operations"
        />
        <ContentArea>
          <MotionContainer className="space-y-8">
            <SkeletonStats />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </MotionContainer>
        </ContentArea>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <PageHeader 
        title="Admin Dashboard"
        description="Comprehensive overview of your field service operations"
        actions={
          <div className="flex gap-3">
            <ModernButton
              variant="outline"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={refreshDashboard}
              loading={loading}
            >
              Refresh
            </ModernButton>
            <ModernButton
              variant="outline"
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export
            </ModernButton>
          </div>
        }
      />
      
      <ContentArea>
        <MotionContainer className="space-y-8">{/* Stats Cards */}
        <MotionDiv variant="fadeInUp">
          <QuickStats stats={quickStatsData} />
        </MotionDiv>

        {/* Secondary Stats */}
        <MotionDiv variant="fadeInUp" delay={0.2}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard
              title="Total Customers"
              value={stats.totalCustomers}
              description="+12% from last month"
              trend={{ value: 12, isPositive: true }}
              icon={<Users className="w-5 h-5" />}
            />
            
            <StatsCard
              title="Active Technicians"
              value={stats.totalTechnicians}
              description="Field staff"
              icon={<Wrench className="w-5 h-5" />}
            />
            
            <StatsCard
              title="Avg Completion"
              value={formatDuration(stats.avgCompletionTime)}
              description="Per job"
              icon={<TrendingUp className="w-5 h-5" />}
            />
          </div>
        </MotionDiv>

        {/* Time Tracking Overview */}
        <MotionDiv variant="fadeInUp" delay={0.4}>
          <ModernCard variant="elevated">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Time Tracking Overview</h3>
              </div>
              <p className="text-muted-foreground mb-6">Technician productivity and location compliance metrics</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-subtle p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-foreground">{timeStats.totalHoursWorked.toFixed(1)}</div>
                      <div className="text-sm text-muted-foreground">Total Hours</div>
                    </div>
                  </div>
                </div>

                <div className="glass-subtle p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <MapPin className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-foreground">{timeStats.locationComplianceRate}%</div>
                      <div className="text-sm text-muted-foreground">GPS Compliance</div>
                    </div>
                  </div>
                </div>

                <div className="glass-subtle p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-foreground">
                        {timeStats.averageTimePerJob.toFixed(1)}m
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Time per Job</div>
                    </div>
                  </div>
                </div>

                <div className="glass-subtle p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Target className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-foreground">{timeStats.totalJobsTracked}</div>
                      <div className="text-sm text-muted-foreground">Jobs Tracked</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ModernCard>
        </MotionDiv>

        {/* Job Progress Overview */}
        <MotionDiv variant="fadeInUp" delay={0.6}>
          <ModernCard variant="floating">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Job Status Overview</h3>
              </div>
              <p className="text-muted-foreground mb-6">Current distribution of job statuses</p>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Completed Jobs</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{stats.completedJobs}/{stats.totalJobs}</span>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  </div>
                  <Progress 
                    value={stats.totalJobs > 0 ? (stats.completedJobs / stats.totalJobs) * 100 : 0} 
                    className="h-3 rounded-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">In Progress</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{stats.inProgressJobs}/{stats.totalJobs}</span>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    </div>
                  </div>
                  <Progress
                    value={stats.totalJobs > 0 ? (stats.inProgressJobs / stats.totalJobs) * 100 : 0}
                    className="h-3 rounded-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Scheduled</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{stats.pendingJobs}/{stats.totalJobs}</span>
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    </div>
                  </div>
                  <Progress
                    value={stats.totalJobs > 0 ? (stats.pendingJobs / stats.totalJobs) * 100 : 0}
                    className="h-3 rounded-full"
                  />
                </div>
              </div>
            </div>
          </ModernCard>
        </MotionDiv>

        {/* Recent Jobs */}
        <MotionDiv variant="fadeInUp" delay={0.8}>
          <ModernCard variant="glass">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Recent Jobs</h3>
              </div>
              <p className="text-muted-foreground mb-6">Latest job assignments and updates</p>
              
              <div className="space-y-3">
                {recentJobs.map((job, index) => (
                  <MotionDiv
                    key={job.id}
                    variant="fadeInUp"
                    delay={index * 0.1}
                    className="glass-subtle p-4 rounded-xl hover:bg-accent/50 transition-all duration-200 group"
                  >
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
                      <div className="flex-1 mb-2 md:mb-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">
                            {job.title}
                          </h4>
                          <Badge 
                            variant={job.status === 'completed' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {job.status?.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {job.customers?.name} • {job.profiles?.full_name || 'Unassigned'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : 'No date set'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">${(job.total_cost || 0).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{job.job_number}</p>
                      </div>
                    </div>
                  </MotionDiv>
                ))}

                {recentJobs.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 glass-subtle rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="font-medium">No recent jobs</p>
                    <p className="text-sm text-muted-foreground mt-1">New jobs will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </ModernCard>
        </MotionDiv>

        {/* Floating Action Button */}
        <FloatingActionButton position="bottom-right">
          <Plus className="w-5 h-5" />
        </FloatingActionButton>
        
        </MotionContainer>
      </ContentArea>
    </AnimatedPage>
  );
};

export default AdminDashboard;
