import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  CheckCircle, 
  Clock,
  Navigation,
  Camera,
  Play,
  Pause,
  Square,
  FileText,
  Search,
  Filter,
  TrendingUp,
  MapPin,
  Phone,
  User,
  MoreVertical
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
import JobDetailsDialog from './JobDetailsDialog';
import JobHistory from './JobHistory';

const WorkerDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
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
  const [activeTab, setActiveTab] = useState('current');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('scheduled_date');

  useEffect(() => {
    if (user) {
      fetchWorkerData();
    }
  }, [user]);

  const fetchWorkerData = async () => {
    try {
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          *,
          customers(name, phone, address, short_address, city, state, email)
        `)
        .eq('technician_id', user?.id)
        .order('scheduled_date', { ascending: true });

      if (jobsError) throw jobsError;

      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      const { data: todayJobsData, error: todayJobsError } = await supabase
        .from('jobs')
        .select('id')
        .eq('technician_id', user?.id)
        .gte('scheduled_date', todayStart)
        .lt('scheduled_date', todayEnd);

      if (todayJobsError) throw todayJobsError;

      const todayJobs = todayJobsData?.length || 0;

      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const completedJobs = jobs?.filter(j => j.status === 'completed').length || 0;
      const pendingJobs = jobs?.filter(j => j.status === 'scheduled' || j.status === 'in_progress').length || 0;
      
      const weeklyCompletedJobs = jobs?.filter(job => {
        const completedDate = new Date(job.completed_at || job.created_at);
        return job.status === 'completed' && completedDate >= weekAgo;
      }).length || 0;

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyCompletedJobs = jobs?.filter(job => {
        const jobDate = new Date(job.completed_at || job.created_at);
        return job.status === 'completed' && 
               jobDate.getMonth() === currentMonth && 
               jobDate.getFullYear() === currentYear;
      }) || [];

      const monthlyRating = 0;

      // Calculate average completion time
      const completedJobsWithDuration = jobs?.filter(job => 
        job.status === 'completed' && job.started_at && job.completed_at
      ) || [];
      
      const avgCompletionTime = completedJobsWithDuration.length > 0 
        ? completedJobsWithDuration.reduce((sum, job) => {
            const start = new Date(job.started_at);
            const end = new Date(job.completed_at);
            return sum + (end.getTime() - start.getTime()) / (1000 * 60); // minutes
          }, 0) / completedJobsWithDuration.length
        : 0;

      // Calculate total revenue
      const totalRevenue = jobs?.filter(job => job.status === 'completed')
        .reduce((sum, job) => sum + (job.total_cost || 0), 0) || 0;

      setStats({
        todayJobs,
        completedJobs,
        pendingJobs,
        monthlyRating,
        weeklyCompletedJobs,
        avgCompletionTime,
        totalRevenue
      });

      setMyJobs(jobs?.filter(job => 
        job.status === 'scheduled' || job.status === 'in_progress'
      ) || []);

    } catch (error: any) {
      console.error('Error fetching worker data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedJobs = useMemo(() => {
    let filtered = myJobs.filter(job => {
      const matchesSearch = 
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.job_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.customers?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || job.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    // Sort jobs
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'customer_name') {
        aValue = a.customers?.name || '';
        bValue = b.customers?.name || '';
      }
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (!aValue) return 1;
      if (!bValue) return -1;
      
      return aValue < bValue ? -1 : 1;
    });

    return filtered;
  }, [myJobs, searchTerm, statusFilter, sortBy]);

  const startJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Job started successfully"
      });

      fetchWorkerData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to start job",
        variant: "destructive"
      });
    }
  };

  const openNavigation = (job: any) => {
    const customer = job.customers;
    if (!customer) return;

    // Prioritize short address (National Address) for more precise navigation
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-destructive';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-muted-foreground';
    }
  };

  const handleViewDetails = (job: any) => {
    setSelectedJob(job);
    setShowJobDetails(true);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-20 sm:pb-6">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
              <p className="text-xs text-muted-foreground">Welcome back!</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {stats.pendingJobs} active
          </Badge>
        </div>
        
        {/* Mobile Tab Navigation */}
        <div className="flex gap-1 mt-4 p-1 bg-muted rounded-lg">
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

      <div className="p-4 space-y-4">
        {activeTab === 'current' ? (
          <>
            {/* Mobile-First Stats Overview */}
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


            {/* Mobile Search - Simplified */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 bg-background"
              />
            </div>

            {/* Mobile Job Cards */}
            <div className="space-y-3">
              {filteredAndSortedJobs.length === 0 ? (
                <Card className="p-8 text-center">
                  <div className="text-muted-foreground text-sm">No jobs found</div>
                </Card>
              ) : (
                filteredAndSortedJobs.map((job) => (
                  <Card key={job.id} className="overflow-hidden border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      {/* Job Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${getPriorityColor(job.priority)}`}></div>
                            <Badge variant="secondary" className="text-xs px-2 py-0.5">
                              {job.job_number}
                            </Badge>
                          </div>
                          <h3 className="font-medium text-sm leading-tight truncate">{job.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1">{job.customers?.name}</p>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`text-xs shrink-0 ${
                            job.status === 'scheduled' ? 'border-primary/30 text-primary bg-primary/10' :
                            job.status === 'in_progress' ? 'border-destructive/30 text-destructive bg-destructive/10' :
                            'border-muted-foreground/30'
                          }`}
                        >
                          {job.status === 'scheduled' ? 'Scheduled' : 
                           job.status === 'in_progress' ? 'In Progress' : job.status}
                        </Badge>
                      </div>

                      {/* Job Details */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(job.scheduled_date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(job.scheduled_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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
                            <DropdownMenuItem onClick={() => handleViewDetails(job)}>
                              <FileText className="mr-2 h-4 w-4" />
                              <span>View Details</span>
                            </DropdownMenuItem>
                            {job.customers?.phone && (
                              <DropdownMenuItem onClick={() => callCustomer(job.customers.phone)}>
                                <Phone className="mr-2 h-4 w-4" />
                                <span>Call Customer</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
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
    </div>
  );
};

export default WorkerDashboard;
