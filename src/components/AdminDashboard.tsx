
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Target
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-brand-blue-600 to-brand-blue-700 bg-clip-text text-transparent">
          Admin Dashboard
        </h2>
        <p className="text-muted-foreground text-lg">Comprehensive overview of your field service operations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-brand-blue-500 to-brand-blue-600 text-white hover:shadow-medium transition-all duration-300 rounded-2xl group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-brand-blue-100 text-sm font-medium">Total Jobs</p>
                <p className="text-3xl font-bold group-hover:scale-105 transition-transform duration-200">{stats.totalJobs}</p>
              </div>
              <div className="p-3 bg-white/10 rounded-2xl group-hover:bg-white/20 transition-colors">
                <Wrench className="w-8 h-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-brand-green-500 to-brand-green-600 text-white hover:shadow-medium transition-all duration-300 rounded-2xl group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-brand-green-100 text-sm font-medium">Completed</p>
                <p className="text-3xl font-bold group-hover:scale-105 transition-transform duration-200">{stats.completedJobs}</p>
              </div>
              <div className="p-3 bg-white/10 rounded-2xl group-hover:bg-white/20 transition-colors">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-brand-gold-500 to-brand-gold-600 text-white hover:shadow-medium transition-all duration-300 rounded-2xl group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-brand-gold-100 text-sm font-medium">In Progress</p>
                <p className="text-3xl font-bold group-hover:scale-105 transition-transform duration-200">{stats.inProgressJobs}</p>
              </div>
              <div className="p-3 bg-white/10 rounded-2xl group-hover:bg-white/20 transition-colors">
                <Clock className="w-8 h-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white hover:shadow-medium transition-all duration-300 rounded-2xl group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Revenue</p>
                <p className="text-3xl font-bold group-hover:scale-105 transition-transform duration-200">${stats.monthlyRevenue.toFixed(0)}</p>
              </div>
              <div className="p-3 bg-white/10 rounded-2xl group-hover:bg-white/20 transition-colors">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-medium transition-all duration-300 rounded-2xl border-0 shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Total Customers</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalCustomers}</p>
                <p className="text-xs text-brand-green-600 font-medium">+12% from last month</p>
              </div>
              <div className="p-3 bg-brand-blue-100 rounded-2xl">
                <Users className="w-6 h-6 text-brand-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-medium transition-all duration-300 rounded-2xl border-0 shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Active Technicians</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalTechnicians}</p>
                <p className="text-xs text-brand-blue-600 font-medium">Field staff</p>
              </div>
              <div className="p-3 bg-brand-green-100 rounded-2xl">
                <Wrench className="w-6 h-6 text-brand-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-medium transition-all duration-300 rounded-2xl border-0 shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Avg Completion</p>
                <p className="text-2xl font-bold text-foreground">{formatDuration(stats.avgCompletionTime)}</p>
                <p className="text-xs text-purple-600 font-medium">Per job</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-2xl">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job Progress Overview */}
      <Card className="rounded-2xl border-0 shadow-soft">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5 text-brand-blue-600" />
            Job Status Overview
          </CardTitle>
          <CardDescription>Current distribution of job statuses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">Completed Jobs</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{stats.completedJobs}/{stats.totalJobs}</span>
                  <div className="w-2 h-2 bg-brand-green-500 rounded-full"></div>
                </div>
              </div>
              <Progress value={stats.totalJobs > 0 ? (stats.completedJobs / stats.totalJobs) * 100 : 0} className="h-3 rounded-full" />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">In Progress</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{stats.inProgressJobs}/{stats.totalJobs}</span>
                  <div className="w-2 h-2 bg-brand-gold-500 rounded-full"></div>
                </div>
              </div>
              <Progress
                value={stats.totalJobs > 0 ? (stats.inProgressJobs / stats.totalJobs) * 100 : 0}
                className="h-3 rounded-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">Scheduled</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{stats.pendingJobs}/{stats.totalJobs}</span>
                  <div className="w-2 h-2 bg-brand-blue-500 rounded-full"></div>
                </div>
              </div>
              <Progress
                value={stats.totalJobs > 0 ? (stats.pendingJobs / stats.totalJobs) * 100 : 0}
                className="h-3 rounded-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Jobs */}
      <Card className="rounded-2xl border-0 shadow-soft">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5 text-brand-blue-600" />
            Recent Jobs
          </CardTitle>
          <CardDescription>Latest job assignments and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentJobs.map((job, index) => (
              <div
                key={job.id}
                className={`flex items-center justify-between p-4 rounded-2xl transition-all duration-200 hover:shadow-soft ${
                  index % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'
                } hover:bg-white`}
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-sm text-foreground">{job.title}</h4>
                      <Badge className={`${getStatusColor(job.status)} text-xs px-2 py-1`} variant="outline">
                        {job.status?.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Customer: {job.customers?.name} | Technician: {job.profiles?.full_name || 'Unassigned'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : 'No date set'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">${(job.total_cost || 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground font-medium">{job.job_number}</p>
                </div>
              </div>
            ))}

            {recentJobs.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-muted-foreground font-medium">No recent jobs</p>
                <p className="text-sm text-muted-foreground mt-1">New jobs will appear here</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
