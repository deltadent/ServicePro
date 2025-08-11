import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  Search, 
  Filter as FilterIcon,
  MapPin,
  Clock,
  User,
  Wrench,
  AlertCircle,
  Eye,
  Download,
  RefreshCw,
  SortAsc,
  SortDesc,
  MoreHorizontal,
  PlusCircle,
  List
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import FullCalendar from './FullCalendar';
import { EventsProvider } from '@/context/EventsContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from "@/hooks/use-toast";
import JobCreationDialog from './JobCreationDialog';
import JobDetailsDialog from './JobDetailsDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { JobCreationProvider } from '@/context/JobCreationContext';

const JobManagement = () => {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          customers(name, phone, address, city, state),
          profiles(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error: any) {
      console.error('Error fetching jobs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch jobs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateJobStatus = async (jobId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: newStatus })
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Job status updated successfully"
      });

      fetchJobs(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const bulkUpdateStatus = async (status: string) => {
    if (selectedJobs.length === 0) return;

    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status })
        .in('id', selectedJobs);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedJobs.length} jobs updated to ${status}`
      });

      setSelectedJobs([]);
      fetchJobs(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update jobs",
        variant: "destructive"
      });
    }
  };

  const filteredAndSortedJobs = useMemo(() => {
    let filtered = jobs.filter(job => {
      const matchesSearch = 
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.job_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.customers?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || job.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || job.priority === priorityFilter;
      const matchesServiceType = serviceTypeFilter === "all" || job.service_type === serviceTypeFilter;
      
      let matchesDateRange = true;
      if (dateRangeFilter !== "all") {
        const now = new Date();
        const jobDate = new Date(job.scheduled_date || job.created_at);
        
        switch (dateRangeFilter) {
          case "today":
            matchesDateRange = jobDate.toDateString() === now.toDateString();
            break;
          case "week":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDateRange = jobDate >= weekAgo;
            break;
          case "month":
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDateRange = jobDate >= monthAgo;
            break;
        }
      }
      
      return matchesSearch && matchesStatus && matchesPriority && matchesServiceType && matchesDateRange;
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
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [jobs, searchTerm, statusFilter, priorityFilter, serviceTypeFilter, dateRangeFilter, sortBy, sortOrder]);

  const handleViewJobDetails = (job: any) => {
    setSelectedJob(job);
    setShowJobDetails(true);
  };

  const toggleJobSelection = (jobId: string) => {
    setSelectedJobs(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  const selectAllJobs = () => {
    if (selectedJobs.length === filteredAndSortedJobs.length) {
      setSelectedJobs([]);
    } else {
      setSelectedJobs(filteredAndSortedJobs.map(job => job.id));
    }
  };

  const exportJobsData = () => {
    const csvContent = [
      ['Job Number', 'Title', 'Customer', 'Status', 'Priority', 'Service Type', 'Scheduled Date', 'Total Cost'].join(','),
      ...filteredAndSortedJobs.map(job => [
        job.job_number,
        job.title,
        job.customers?.name || '',
        job.status,
        job.priority,
        job.service_type,
        job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : '',
        job.total_cost || 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jobs-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'on_hold': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'high': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'medium': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'low': return <AlertCircle className="w-4 h-4 text-green-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getServiceTypeIcon = (serviceType: string) => {
    switch (serviceType) {
      case 'ac_repair':
      case 'ac_maintenance':
      case 'hvac':
        return '❄️';
      case 'plumbing':
        return '🔧';
      case 'electrical':
        return '⚡';
      default:
        return '🛠️';
    }
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Job Management</h2>
          <p className="text-gray-600">Manage and track all service jobs ({filteredAndSortedJobs.length} jobs)</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fetchJobs(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={exportJobsData}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          {isAdmin && (
            <JobCreationProvider>
              <JobCreationDialog onJobCreated={() => fetchJobs(true)} />
            </JobCreationProvider>
          )}
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">
            <List className="w-4 h-4 mr-2" />
            List
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule
          </TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search jobs, customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  {/* Desktop Filters */}
                  <div className="hidden md:flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priority</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Mobile Filter Sheet */}
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="md:hidden">
                        <FilterIcon className="w-4 h-4 mr-2" />
                        Filters
                      </Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>Filter Jobs</SheetTitle>
                      </SheetHeader>
                      <div className="space-y-4 py-4">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="on_hold">On Hold</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                          <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Priority</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                          <SelectTrigger><SelectValue placeholder="Service Type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Services</SelectItem>
                            <SelectItem value="ac_repair">AC Repair</SelectItem>
                            <SelectItem value="ac_maintenance">AC Maintenance</SelectItem>
                            <SelectItem value="hvac">HVAC</SelectItem>
                            <SelectItem value="plumbing">Plumbing</SelectItem>
                            <SelectItem value="electrical">Electrical</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                          <SelectTrigger><SelectValue placeholder="Date Range" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="week">Last Week</SelectItem>
                            <SelectItem value="month">Last Month</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sort and Bulk Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Created Date</SelectItem>
                  <SelectItem value="scheduled_date">Scheduled Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="customer_name">Customer</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              </Button>
            </div>

            {selectedJobs.length > 0 && isAdmin && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{selectedJobs.length} selected</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Bulk Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => bulkUpdateStatus('scheduled')}>
                      Set to Scheduled
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => bulkUpdateStatus('in_progress')}>
                      Set to In Progress
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => bulkUpdateStatus('completed')}>
                      Set to Completed
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => bulkUpdateStatus('on_hold')}>
                      Set to On Hold
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Jobs List */}
          <div className="grid gap-4 md:grid-cols-1">
            {isAdmin && (
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border">
                <Checkbox
                  id="selectAll"
                  checked={selectedJobs.length === filteredAndSortedJobs.length && filteredAndSortedJobs.length > 0}
                  onCheckedChange={selectAllJobs}
                />
                <label htmlFor="selectAll" className="text-sm text-gray-600">Select All</label>
              </div>
            )}

            {filteredAndSortedJobs.map((job) => (
              <Card key={job.id} className="overflow-hidden border-l-4 border-blue-500">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    {/* Checkbox */}
                    {isAdmin && (
                      <div className="flex-shrink-0 pt-1">
                        <Checkbox
                          checked={selectedJobs.includes(job.id)}
                          onCheckedChange={() => toggleJobSelection(job.id)}
                        />
                      </div>
                    )}
                    
                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header Row - Title, Job Number, Status, Menu */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base leading-tight truncate">{job.title}</h3>
                          <p className="text-xs text-gray-500 mt-1">#{job.job_number}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={`${getStatusColor(job.status)} capitalize text-xs px-2 py-1 whitespace-nowrap`} variant="outline">
                            {job.status.replace('_', ' ')}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewJobDetails(job)}>
                                <Eye className="mr-2 h-4 w-4" />
                                <span>View Details</span>
                              </DropdownMenuItem>
                              {isAdmin && (
                                <>
                                  <DropdownMenuItem onClick={() => updateJobStatus(job.id, 'scheduled')}>Set Scheduled</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updateJobStatus(job.id, 'in_progress')}>Set In Progress</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updateJobStatus(job.id, 'completed')}>Set Completed</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updateJobStatus(job.id, 'on_hold')}>Set On Hold</DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      
                      {/* Job Details */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-700">
                          <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{job.customers?.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{job.customers?.address}, {job.customers?.city}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate">
                            {job.scheduled_date 
                              ? new Date(job.scheduled_date).toLocaleString()
                              : 'Not scheduled'
                            }
                          </span>
                        </div>
                        {job.profiles?.full_name && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <Wrench className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{job.profiles.full_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filteredAndSortedJobs.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">No jobs found</h3>
                  <p className="text-gray-500">
                    {searchTerm || statusFilter !== "all" || priorityFilter !== "all" 
                      ? "No jobs match your current filters"
                      : "No jobs have been created yet"
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        <TabsContent value="schedule">
          <JobCreationProvider>
            <EventsProvider>
              <FullCalendar />
            </EventsProvider>
          </JobCreationProvider>
        </TabsContent>
      </Tabs>

      {/* Job Details Dialog */}
      {selectedJob && (
        <JobDetailsDialog
          job={selectedJob}
          isOpen={showJobDetails}
          onClose={() => {
            setShowJobDetails(false);
            setSelectedJob(null);
            fetchJobs(true);
          }}
        />
      )}
    </div>
  );
};

export default JobManagement;
