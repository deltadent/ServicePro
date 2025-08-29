import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
const CustomerProfile = React.lazy(() => import("@/pages/CustomerProfile"));
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin,
  Phone,
  Mail,
  Calendar,
  Edit,
  Save,
  X,
  Workflow,
  Clock,
  Wrench,
  ExternalLink,
  Shield
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from "@/hooks/use-toast";
import { useDevice } from "@/hooks/use-device";
import { useNetwork } from '@/hooks/useNetwork';
import { queueAction } from '@/lib/queue';
import JobWorkflowStepper from './JobWorkflowStepper';
import JobDocumentationPanel from './JobDocumentationPanel';
import AddPartToJobDialog from './AddPartToJobDialog';
import JobChecklist from './JobChecklist';
import CompleteJobDialog from './CompleteJobDialog';
import { fetchJobChecklist } from '@/lib/checklistsRepo';

interface JobDetailsDialogProps {
  job: any;
  isOpen: boolean;
  onClose: () => void;
  onJobUpdate?: () => void;
}

const JobDetailsDialog = ({ job, isOpen, onClose, onJobUpdate }: JobDetailsDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isMobile } = useDevice();
  const online = useNetwork();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editedJob, setEditedJob] = useState(job);
  const [photos, setPhotos] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [workNotes, setWorkNotes] = useState('');
  const [customerFeedback, setCustomerFeedback] = useState(job?.work_summary || '');
  const [selectedPhotoType, setSelectedPhotoType] = useState<'before' | 'during' | 'after'>('during');
  const [showCustomerProfile, setShowCustomerProfile] = useState(false);
  const [showCompleteJobDialog, setShowCompleteJobDialog] = useState(false);

  useEffect(() => {
    if (job) {
      setEditedJob(job);
      setCustomerFeedback(job.work_summary || '');
      fetchJobPhotos();
      fetchJobParts();
    }
  }, [job]);

  // Listen for sync events to refresh data
  useEffect(() => {
    const handlePhotoSynced = (event: CustomEvent) => {
      const { jobId } = event.detail;
      if (jobId === job?.id) {
        console.log('Photo synced for current job, refreshing photos...');
        fetchJobPhotos();
      }
    };

    const handleNoteSynced = (event: CustomEvent) => {
      const { jobId } = event.detail;
      if (jobId === job?.id) {
        console.log('Note synced for current job, refreshing data...');
        fetchJobPhotos(); // Refresh photos in case notes affect the display
      }
    };

    const handleSyncCompleted = (event: CustomEvent) => {
      const { result } = event.detail;
      // Refresh all data after sync completion
      console.log('Sync completed, refreshing all job data...');
      fetchJobPhotos();
      fetchJobParts();
    };

    window.addEventListener('photoSynced', handlePhotoSynced as EventListener);
    window.addEventListener('noteSynced', handleNoteSynced as EventListener);
    window.addEventListener('syncCompleted', handleSyncCompleted as EventListener);

    return () => {
      window.removeEventListener('photoSynced', handlePhotoSynced as EventListener);
      window.removeEventListener('noteSynced', handleNoteSynced as EventListener);
      window.removeEventListener('syncCompleted', handleSyncCompleted as EventListener);
    };
  }, [job?.id]);

  const fetchJobPhotos = async () => {
    if (!job?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('job_photos')
        .select('*')
        .eq('job_id', job.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const photosWithUrls = await Promise.all(
        (data || []).map(async (p: any) => {
          if (p?.storage_path) {
            const { data: signed } = await supabase.storage
              .from('job-photos')
              .createSignedUrl(p.storage_path, 60 * 60);
            return { ...p, photo_url: signed?.signedUrl || p.photo_url };
          }
          return p;
        })
      );

      setPhotos(photosWithUrls);
    } catch (error) {
      console.error('Error fetching photos:', error);
    }
  };

  const fetchJobParts = async () => {
    if (!job?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('job_parts')
        .select(`
          *,
          parts_inventory(name, part_number)
        `)
        .eq('job_id', job.id);

      if (error) throw error;
      setParts(data || []);
    } catch (error) {
      console.error('Error fetching job parts:', error);
    }
  };
  // Calculate actual duration in minutes
  const calculateDuration = (startedAt: string, completedAt: string) => {
    if (!startedAt || !completedAt) return null;
    
    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const diffMs = end.getTime() - start.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    return diffMinutes;
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          title: editedJob.title,
          description: editedJob.description,
          priority: editedJob.priority,
          scheduled_date: editedJob.scheduled_date,
        })
        .eq('id', job.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Job updated successfully"
      });
      
      setIsEditing(false);
      if (onJobUpdate) onJobUpdate();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update job",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    // Intercept completion requests and show CompleteJobDialog
    if (newStatus === 'completed' && job.status === 'in_progress') {
      setShowCompleteJobDialog(true);
      return;
    }

    setLoading(true);
    try {
      const updateData: any = { status: newStatus };
      const timestamp = new Date().toISOString();

      if (newStatus === 'in_progress' && job.status === 'scheduled') {
        updateData.started_at = timestamp;
      }

      // Try online first, fallback to queue
      if (online) {
        const { error } = await supabase
          .from('jobs')
          .update(updateData)
          .eq('id', job.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: `Job ${newStatus.replace('_', ' ')} successfully`
        });
      } else {
        // Queue the action for offline sync
        const event = newStatus === 'in_progress' ? 'check_in' : 'check_out';

        await queueAction('CHECK', {
          jobId: job.id,
          event,
          timestamp,
          latitude: undefined, // GPS would be added here if available
          longitude: undefined
        });

        toast({
          title: "Queued",
          description: `Job ${newStatus.replace('_', ' ')} will sync when online`
        });
      }

      if (onJobUpdate) onJobUpdate();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: online ? `Failed to update job status` : `Failed to queue action`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${job.id}_${Date.now()}.${fileExt}`;

      if (online) {
        // Online: upload directly
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('job-photos')
          .upload(filePath, file, { upsert: false });

        if (uploadError) throw uploadError;

        // Get public URL for the uploaded file
        const { data: urlData } = supabase.storage
          .from('job-photos')
          .getPublicUrl(filePath);

        if (!urlData.publicUrl) {
          throw new Error('Failed to get public URL for uploaded photo');
        }

        // Ensure photo_type is valid
        const validPhotoTypes = ['before', 'during', 'after'];
        const photoType = validPhotoTypes.includes(selectedPhotoType) ? selectedPhotoType : 'during';

        const { error: dbError } = await supabase
          .from('job_photos')
          .insert([
            {
              job_id: job.id,
              path: urlData.publicUrl, // Public URL for display
              description: workNotes || 'Job photo',
              photo_type: photoType, // Ensure valid photo_type
              created_by: user?.id,
              storage_path: filePath, // Storage path for internal reference
            }
          ]);

        if (dbError) throw dbError;

        toast({
          title: "Success",
          description: "Photo uploaded successfully"
        });

        fetchJobPhotos();
      } else {
        // Offline: queue the action with all necessary data
        // Ensure photo_type is valid
        const validPhotoTypes = ['before', 'during', 'after'];
        const photoType = validPhotoTypes.includes(selectedPhotoType) ? selectedPhotoType : 'during';

        await queueAction('PHOTO', {
          jobId: job.id,
          file: file,
          fileName: fileName,
          path: `/offline-photos/${fileName}`, // Placeholder path for offline display
          photo_type: photoType, // Include validated photo type for proper categorization
          description: workNotes || 'Job photo', // Include description
          createdAt: new Date().toISOString()
        });

        toast({
          title: "Queued",
          description: "Photo will be uploaded when online"
        });
      }

      setWorkNotes('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: online ? "Failed to upload photo" : "Failed to queue photo upload",
        variant: "destructive"
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAddNote = async (noteText: string) => {
    if (!noteText.trim()) return;

    try {
      if (online) {
        // Online: save directly to database
        const { error } = await supabase
          .from('job_notes')
          .insert({
            job_id: job.id,
            text: noteText.trim(),
            created_at: new Date().toISOString()
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Note added successfully"
        });
      } else {
        // Offline: queue the action
        await queueAction('NOTE', {
          jobId: job.id,
          text: noteText.trim(),
          createdAt: new Date().toISOString()
        });

        toast({
          title: "Queued",
          description: "Note will be saved when online"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: online ? "Failed to add note" : "Failed to queue note",
        variant: "destructive"
      });
    }
  };

  const handleGenerateReport = async () => {
    try {
      // Calculate duration if job is completed
      const actualDuration = job.started_at && job.completed_at
        ? calculateDuration(job.started_at, job.completed_at)
        : null;

      console.log('Duration calculation:', {
        started_at: job.started_at,
        completed_at: job.completed_at,
        actualDuration
      });

      // Ensure we have the most up-to-date job data with calculated duration
      const updatedJobData = {
        ...job,
        work_summary: customerFeedback,
        customer_feedback: customerFeedback,
        actual_duration: actualDuration
      };

      const reportData = {
        job: updatedJobData,
        photos: photos,
        partsUsed: [],
        workNotes: customerFeedback
      };

      console.log('Generating report with data:', reportData);

      const { generateMinimalistJobReport } = await import('../utils/modernPdfGenerator');
      await generateMinimalistJobReport(reportData);

      toast({
        title: "Success",
        description: "Job report generated and downloaded successfully"
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive"
      });
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const handleCustomerClick = () => {
    if (job?.customers?.id) {
      if (isMobile) {
        // Mobile: navigate to full page
        navigate(`/customers/${job.customers.id}?from=job`);
      } else {
        // Desktop: show in sheet/modal
        setShowCustomerProfile(true);
      }
    }
  };

  const handleJobCompleted = () => {
    setShowCompleteJobDialog(false);
    if (onJobUpdate) onJobUpdate();
    onClose();

    toast({
      title: "Job Completed",
      description: "Job has been successfully completed with completion PDF generated.",
    });
  };

  const content = (
    <div className="space-y-4 max-h-[80vh] overflow-y-auto">
      {/* Job Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-4 border-b">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${getPriorityColor(job.priority)}`}></div>
            <Badge className={getStatusColor(job.status)} variant="outline">
              {job.status?.replace('_', ' ')}
            </Badge>
            {job.priority === 'urgent' && (
              <Badge variant="destructive" className="text-xs">URGENT</Badge>
            )}
          </div>
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="title">Job Title</Label>
                <Input
                  id="title"
                  value={editedJob.title}
                  onChange={(e) => setEditedJob({...editedJob, title: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editedJob.description}
                  onChange={(e) => setEditedJob({...editedJob, description: e.target.value})}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 break-words">{job.title}</h3>
              <p className="text-sm text-gray-600 mt-1 break-words">{job.description}</p>
              <p className="text-xs text-gray-500 mt-2">Job #{job.job_number}</p>
            </div>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {isEditing ? (
            <>
              <Button size="sm" onClick={handleSave} disabled={loading}>
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Customer & Schedule Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Customer Information</h4>
            {job.customers?.id && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCustomerClick}
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 h-auto"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
              <button
                className="text-blue-600 hover:underline break-words text-left"
                onClick={handleCustomerClick}
              >
                <span className="font-medium">{job.customers?.name}</span>
                {job.customers?.address && (
                  <span className="font-normal"> - {job.customers.address}, {job.customers.city}, {job.customers.state}</span>
                )}
              </button>
            </div>
            {job.customers?.phone_mobile || job.customers?.phone_work ? (() => {
              const preferredPhone = job.customers?.preferred_contact === 'mobile' ? job.customers.phone_mobile :
                                    job.customers?.preferred_contact === 'work' ? job.customers.phone_work :
                                    job.customers.phone_mobile || job.customers.phone_work;
              const phoneLabel = job.customers?.preferred_contact === 'mobile' ? 'Mobile' :
                                job.customers?.preferred_contact === 'work' ? 'Work' : 'Phone';

              return (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-600">{phoneLabel}:</span>
                  <a href={`tel:${preferredPhone}`} className="text-blue-600 hover:underline">
                    {preferredPhone}
                  </a>
                  {job.customers?.phone_mobile && job.customers?.phone_work &&
                   job.customers.phone_mobile !== job.customers.phone_work && (
                    <span className="text-xs text-gray-500">
                      ({job.customers.preferred_contact === 'mobile' ? job.customers.phone_work :
                        job.customers.phone_mobile})
                    </span>
                  )}
                </div>
              );
            })() : null}
            {job.customers?.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <a href={`mailto:${job.customers.email}`} className="text-blue-600 hover:underline break-all">
                  {job.customers.email}
                </a>
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Schedule</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <span>{job.scheduled_date ? new Date(job.scheduled_date).toLocaleString() : 'Not scheduled'}</span>
            </div>
            {job.started_at && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                <span>Started: {new Date(job.started_at).toLocaleString()}</span>
              </div>
            )}
            {job.completed_at && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                <span>Completed: {new Date(job.completed_at).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Workflow and Documentation */}
      <Tabs defaultValue="workflow" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="workflow" className="text-xs sm:text-sm h-full">
            <Workflow className="w-5 h-5 sm:mr-2" />
            <span className="hidden sm:inline">Workflow</span>
          </TabsTrigger>
          <TabsTrigger value="documentation" className="text-xs sm:text-sm h-full">
            <Wrench className="w-5 h-5 sm:mr-2" />
            <span className="hidden sm:inline">Documentation</span>
          </TabsTrigger>
          <TabsTrigger value="parts" className="text-xs sm:text-sm h-full">
            <Wrench className="w-5 h-5 sm:mr-2" />
            <span className="hidden sm:inline">Parts</span>
          </TabsTrigger>
          <TabsTrigger value="checklist" className="text-xs sm:text-sm h-full">
            <Shield className="w-5 h-5 sm:mr-2" />
            <span className="hidden sm:inline">Checklist</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="workflow" className="mt-4">
           <JobWorkflowStepper
             currentStatus={job.status}
             onStatusChange={handleStatusChange}
             loading={loading}
             online={online}
           />
         </TabsContent>
        
        <TabsContent value="documentation" className="mt-4">
          <JobDocumentationPanel
            photos={photos}
            workNotes={workNotes}
            setWorkNotes={setWorkNotes}
            customerFeedback={customerFeedback}
            setCustomerFeedback={setCustomerFeedback}
            onPhotoUpload={handlePhotoUpload}
            onGenerateReport={handleGenerateReport}
            uploadingPhoto={uploadingPhoto}
            jobStatus={job.status}
            selectedPhotoType={selectedPhotoType}
            setSelectedPhotoType={setSelectedPhotoType}
          />
        </TabsContent>

        <TabsContent value="parts" className="mt-4">
          <div className="space-y-4">
            <div className="flex justify-end">
              <AddPartToJobDialog jobId={job.id} onPartAdded={fetchJobParts} />
            </div>
            <div className="space-y-2">
              {parts.map((part) => (
                <div key={part.id} className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <p className="font-medium">{part.parts_inventory.name}</p>
                    <p className="text-sm text-muted-foreground">Qty: {part.quantity_used}</p>
                  </div>
                  <p className="text-sm">${(part.unit_price * part.quantity_used).toFixed(2)}</p>
                </div>
              ))}
              {parts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center">No parts added to this job yet.</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="checklist" className="mt-4">
          <JobChecklist jobId={job.id} onChecklistUpdate={onJobUpdate} />
        </TabsContent>
      </Tabs>
    </div>
  );

  if (isMobile) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-full h-full max-h-screen overflow-y-auto p-0 [&>button]:hidden">
          <DialogHeader className="p-4 border-b flex flex-row items-center justify-between">
            <div>
              <DialogTitle>Job Details</DialogTitle>
              <DialogDescription>
                View and manage job information and documentation
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
              <X className="w-6 h-6" />
            </Button>
          </DialogHeader>
          <div className="p-4">
            {content}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Job Details</DialogTitle>
            <DialogDescription>
              View and manage job information and documentation
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>

      {/* Customer Profile Sheet for Desktop */}
      <Sheet open={showCustomerProfile} onOpenChange={setShowCustomerProfile}>
        <SheetContent className="w-full max-w-2xl">
          <SheetHeader>
            <SheetTitle>Customer Profile</SheetTitle>
            <SheetDescription>
              View customer information and job history
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>}>
              {job?.customers?.id && (
                <CustomerProfile id={job.customers.id} />
              )}
            </Suspense>
          </div>
        </SheetContent>
      </Sheet>

      {/* Complete Job Dialog */}
      <CompleteJobDialog
        job={job}
        isOpen={showCompleteJobDialog}
        onClose={() => setShowCompleteJobDialog(false)}
        onJobUpdate={onJobUpdate}
      />
    </>
  );
};

export default JobDetailsDialog;
