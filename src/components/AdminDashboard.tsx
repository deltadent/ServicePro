
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
  BarChart3
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
        <p className="text-gray-600">Overview of your field service operations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Jobs</p>
                <p className="text-2xl font-bold">{stats.totalJobs}</p>
              </div>
              <Wrench className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Completed</p>
                <p className="text-2xl font-bold">{stats.completedJobs}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgressJobs}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Revenue</p>
                <p className="text-2xl font-bold">${stats.monthlyRevenue.toFixed(0)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Customers</p>
                <p className="text-xl font-bold">{stats.totalCustomers}</p>
                <p className="text-xs text-green-600">+12% from last month</p>
              </div>
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Active Technicians</p>
                <p className="text-xl font-bold">{stats.totalTechnicians}</p>
                <p className="text-xs text-blue-600">Field staff</p>
              </div>
              <Wrench className="w-6 h-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Avg Completion</p>
                <p className="text-xl font-bold">{formatDuration(stats.avgCompletionTime)}</p>
                <p className="text-xs text-purple-600">Per job</p>
              </div>
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Job Status Overview</CardTitle>
          <CardDescription>Current distribution of job statuses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Completed Jobs</span>
                <span>{stats.completedJobs}/{stats.totalJobs}</span>
              </div>
              <Progress value={stats.totalJobs > 0 ? (stats.completedJobs / stats.totalJobs) * 100 : 0} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>In Progress</span>
                <span>{stats.inProgressJobs}/{stats.totalJobs}</span>
              </div>
              <Progress 
                value={stats.totalJobs > 0 ? (stats.inProgressJobs / stats.totalJobs) * 100 : 0} 
                className="h-2"
              />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Scheduled</span>
                <span>{stats.pendingJobs}/{stats.totalJobs}</span>
              </div>
              <Progress 
                value={stats.totalJobs > 0 ? (stats.pendingJobs / stats.totalJobs) * 100 : 0} 
                className="h-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Jobs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Recent Jobs
          </CardTitle>
          <CardDescription>Latest job assignments and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{job.title}</h4>
                      <Badge className={getStatusColor(job.status)} variant="outline">
                        {job.status?.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">
                      Customer: {job.customers?.name} | Technician: {job.profiles?.full_name || 'Unassigned'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : 'No date set'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">${(job.total_cost || 0).toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{job.job_number}</p>
                </div>
              </div>
            ))}
            
            {recentJobs.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No recent jobs</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
