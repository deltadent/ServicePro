
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  Search,
  Filter,
  FileText,
  MapPin,
  Clock,
  Download,
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
import { generateJobReport } from '@/utils/pdfGenerator';

const JobHistory = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<any[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showJobDetails, setShowJobDetails] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, [user]);

  useEffect(() => {
    filterJobs();
  }, [jobs, searchTerm, statusFilter]);

  const fetchJobs = async () => {
    try {
      let query = supabase
        .from('jobs')
        .select(`
          *,
          customers(name, phone_mobile, phone_work, preferred_contact, address, city, state, email),
          profiles(full_name)
        `)
        .order('created_at', { ascending: false });

      // If not admin, only show jobs assigned to current user
      if (!isAdmin) {
        query = query.eq('technician_id', user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setJobs(data || []);
    } catch (error: any) {
      console.error('Error fetching jobs:', error);
      toast({
        title: "Error",
        description: "Failed to load job history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterJobs = () => {
    let filtered = jobs;

    if (searchTerm) {
      filtered = filtered.filter(job => 
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.job_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.customers?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter);
    }

    setFilteredJobs(filtered);
  };

  const handleViewDetails = (job: any) => {
    setSelectedJob(job);
    setShowJobDetails(true);
  };

  const handleGenerateReport = async (job: any) => {
    try {
      // Fetch additional data for the report
      const [photosResponse, partsResponse] = await Promise.all([
        supabase.from('job_photos').select('*').eq('job_id', job.id),
        supabase.from('job_parts').select(`
          *,
          parts_inventory(name, part_number)
        `).eq('job_id', job.id)
      ]);

      const rawPhotos = photosResponse.data || [];
      const photosWithUrls = await Promise.all(
        rawPhotos.map(async (p: any) => {
          if (p?.storage_path) {
            const { data: signed } = await supabase.storage
              .from('job-photos')
              .createSignedUrl(p.storage_path, 60 * 60);
            return { ...p, photo_url: signed?.signedUrl || p.photo_url };
          }
          return p;
        })
      );

      const reportData = {
        job,
        photos: photosWithUrls,
        partsUsed: partsResponse.data || [],
        workNotes: job.customer_feedback
      };
      
      await generateJobReport(reportData);
      
      toast({
        title: "Success",
        description: "Job report generated successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    const baseClasses = "w-3 h-3 rounded-full";
    switch (priority) {
      case 'urgent': return <div className={`${baseClasses} bg-red-500`} />;
      case 'high': return <div className={`${baseClasses} bg-orange-500`} />;
      case 'medium': return <div className={`${baseClasses} bg-yellow-500`} />;
      case 'low': return <div className={`${baseClasses} bg-green-500`} />;
      default: return <div className={`${baseClasses} bg-gray-500`} />;
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
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Job History</h2>
        <p className="text-gray-600">View and manage completed and ongoing work</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search jobs, customers, or job numbers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      <div className="space-y-4">
        {filteredJobs.map((job) => (
          <Card key={job.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start gap-3">
                    {getPriorityIcon(job.priority)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{job.title}</h3>
                        <Badge className={getStatusColor(job.status)} variant="outline">
                          {job.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Job #{job.job_number} • {job.service_type.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium">{job.customers?.name}</p>
                        <p className="text-gray-600">{job.customers?.city}, {job.customers?.state}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium">
                          {job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : 'Not scheduled'}
                        </p>
                        <p className="text-gray-600">
                          {job.scheduled_date ? new Date(job.scheduled_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                        </p>
                      </div>
                    </div>
                    {isAdmin && job.profiles?.full_name && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="font-medium">Technician</p>
                          <p className="text-gray-600">{job.profiles.full_name}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {job.description && (
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                      {job.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 ml-4">
                  {job.total_cost > 0 && (
                    <div className="text-right mb-2">
                      <p className="text-lg font-bold text-green-600">
                        ${job.total_cost.toFixed(2)}
                      </p>
                    </div>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewDetails(job)}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>View Details</span>
                      </DropdownMenuItem>
                      {job.status === 'completed' && (
                        <DropdownMenuItem onClick={() => handleGenerateReport(job)}>
                          <Download className="mr-2 h-4 w-4" />
                          <span>Download Report</span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredJobs.length === 0 && !loading && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'No job history available yet'
                }
              </p>
            </CardContent>
          </Card>
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
            fetchJobs();
          }}
        />
      )}
    </div>
  );
};

export default JobHistory;
