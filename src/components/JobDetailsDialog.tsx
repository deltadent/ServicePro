import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
const CustomerProfile = React.lazy(() => import("@/pages/CustomerProfile"));
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Phone,
  Mail,
  Calendar,
  Clock,
  Wrench,
  Camera,
  FileText,
  User,
  Edit,
  Save,
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Circle,
  Play,
  Square
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from "@/hooks/use-toast";
import { useDevice } from "@/hooks/use-device";
import { useNetwork } from '@/hooks/useNetwork';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { queueAction } from '@/lib/queue';
import JobWorkflowStepper from './JobWorkflowStepper';
import JobChecklist from './JobChecklist';
import JobDocumentationPanel from './JobDocumentationPanel';
import InvoiceGenerationDialog from './InvoiceGenerationDialog';
import { fetchJobChecklist } from '@/lib/checklistsRepo';
import { InvoiceGenerationResult } from '@/lib/invoiceRepo';

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
  const { branding, settings } = useCompanySettings();

  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [workNotes, setWorkNotes] = useState('');
  const [customerFeedback, setCustomerFeedback] = useState(job?.work_summary || '');
  const [photos, setPhotos] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [selectedPhotoType, setSelectedPhotoType] = useState<'before' | 'during' | 'after'>('during');
  const [expandedSection, setExpandedSection] = useState<string>('workflow');
  const [showCustomerProfile, setShowCustomerProfile] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);

  useEffect(() => {
    if (job) {
      setCustomerFeedback(job.work_summary || '');
      fetchJobPhotos();
      fetchJobParts();
    }
  }, [job]);

  const fetchJobPhotos = async () => {
    console.log('fetchJobPhotos called, job ID:', job?.id);
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

      console.log('Photos fetched successfully:', photosWithUrls.length, 'photos');
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

  const handleStatusChange = async (newStatus: string) => {
    // Check for required checklist items before allowing completion
    if (newStatus === 'completed' && job.status === 'in_progress') {
      try {
        const { checklist } = await fetchJobChecklist(job.id);

        if (checklist) {
          const requiredItems = checklist.items.filter(item => item.required);
          const completedRequiredItems = requiredItems.filter(item => item.completed);

          if (requiredItems.length > 0 && completedRequiredItems.length < requiredItems.length) {
            const uncompletedCount = requiredItems.length - completedRequiredItems.length;

            toast({
              title: "Cannot Complete Job",
              description: `${uncompletedCount} required checklist item${uncompletedCount > 1 ? 's' : ''} must be completed first.`,
              variant: "destructive"
            });

            return;
          }
        }
      } catch (error) {
        console.error('Error checking checklist:', error);
      }
    }

    console.log('=== STATUS CHANGE STARTED ===');
    console.log('Current job status:', job.status);
    console.log('Requested new status:', newStatus);
    console.log('Online status:', online);

    setLoading(true);
    try {
      const updateData: any = { status: newStatus };
      const timestamp = new Date().toISOString();

      console.log('Timestamp generated:', timestamp);

      if (newStatus === 'in_progress' && job.status === 'scheduled') {
        updateData.started_at = timestamp;
        console.log('Setting started_at timestamp');
      } else if (newStatus === 'completed' && job.status === 'in_progress') {
        updateData.completed_at = timestamp;
        updateData.work_summary = customerFeedback;
        console.log('Setting completed_at timestamp and work_summary');
      } else {
        console.log('No timestamp field added - condition not met');
      }

      console.log('Update data object:', updateData);

      if (online) {
        console.log('Updating job in database...');
        const { error } = await supabase
          .from('jobs')
          .update(updateData)
          .eq('id', job.id);

        console.log('Database update result:', { success: !error, error });

        if (error) {
          console.error('Database update failed:', error);
          throw error;
        }

        console.log('Job status updated successfully!');

        // If completing a job, also create a check_out timesheet entry
        if (newStatus === 'completed' && job.status === 'in_progress') {
          console.log('Creating check_out timesheet entry...');
          try {
            const { error: timesheetError } = await supabase
              .from('timesheets')
              .insert({
                job_visit_id: job.id,
                event: 'check_out',
                ts: timestamp,
                lat: null, // TODO: Add GPS location if available
                lng: null, // TODO: Add GPS location if available
                created_by: user?.id
              });

            if (timesheetError) {
              console.error('Failed to create check_out timesheet:', timesheetError);
            } else {
              console.log('Check_out timesheet entry created successfully!');
            }
          } catch (timesheetCreationError) {
            console.error('Error creating timesheet entry:', timesheetCreationError);
          }
        }

        toast({
          title: "Success",
          description: `Job ${newStatus.replace('_', ' ')} successfully`
        });
      } else {
        console.log('Queueing action for offline sync...');
        const event = newStatus === 'in_progress' ? 'check_in' : 'check_out';

        await queueAction('CHECK', {
          jobId: job.id,
          event,
          timestamp,
          latitude: undefined,
          longitude: undefined
        });

        console.log('Offline action queued successfully');
        toast({
          title: "Queued",
          description: `Job ${newStatus.replace('_', ' ')} will sync when online`
        });
      }

      console.log('Calling job update callback...');
      if (onJobUpdate) onJobUpdate();

      console.log('Closing dialog...');
      onClose();

      console.log('=== STATUS CHANGE COMPLETED ===');
    } catch (error: any) {
      console.error('Status change failed:', error);
      toast({
        title: "Error",
        description: online ? `Failed to update job status` : `Failed to queue action`,
        variant: "destructive"
      });
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('=== PHOTO UPLOAD STARTED ===');

    const file = event.target.files?.[0];
    console.log('Selected file:', file);

    if (!file) {
      console.log('No file selected - early return');
      return;
    }

    console.log('Setting uploading photo state to true');
    setUploadingPhoto(true);

    console.log('Photo upload context:', {
      selectedPhotoType,
      online,
      jobId: job?.id,
      userId: user?.id
    });
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${job.id}_${Date.now()}.${fileExt}`;

      if (online) {
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('job-photos')
          .upload(filePath, file, { upsert: false });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from('job-photos')
          .getPublicUrl(filePath);

        if (!urlData.publicUrl) {
          throw new Error('Failed to get public URL for uploaded photo');
        }

        const photoData = {
          job_id: job.id,
          path: urlData.publicUrl,
          description: workNotes || 'Job photo',
          photo_type: selectedPhotoType,
          created_by: user?.id,
          storage_path: filePath,
        };

        console.log('Saving photo with data:', photoData);

        const { error: dbError } = await supabase
          .from('job_photos')
          .insert([photoData]);

        console.log('Database insert result:', { success: !dbError, error: dbError });

        if (dbError) {
          console.error('Database insert error:', dbError);
          throw dbError;
        }

        console.log('Photo uploaded successfully!');

        toast({
          title: "Success",
          description: "Photo uploaded successfully"
        });

        console.log('Calling fetchJobPhotos to refresh the photo list...');
        fetchJobPhotos();
      } else {
        console.log('Offline mode - queuing photo for later upload');
        // TODO: Implement offline queue if needed
      }
    } catch (error: any) {
      console.error('Photo upload failed:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload photo. Please try again.",
        variant: "destructive"
      });
    } finally {
      console.log('Photo upload process ending, setting uploadingPhoto to false');
      setUploadingPhoto(false);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCustomerClick = () => {
    if (job?.customers?.id) {
      try {
        if (isMobile) {
          // Mobile: navigate to full page
          navigate(`/customers/${job.customers.id}?from=job`);
        } else {
          // Desktop: show in sheet/modal
          setShowCustomerProfile(true);
        }
      } catch (error) {
        console.error('Error navigating to customer:', error);
        // Fallback: try opening in new window/tab
        window.open(`/customers/${job.customers.id}?from=job`, '_blank');
      }
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? '' : sectionId);
  };

  const handleInvoiceGenerated = async (result: InvoiceGenerationResult) => {
    console.log('Invoice generated:', result);
    toast({
      title: "Invoice Created Successfully",
      description: `Invoice ${result.invoice.invoice_number} is ready for processing`,
    });
    
    // Optionally refresh job data or navigate to invoice
    if (onJobUpdate) onJobUpdate();
  };

  const handleGenerateReport = async () => {
    try {
      const { generateMinimalistJobReport } = await import('../utils/modernPdfGenerator');

      // Calculate actual duration if job is completed
      const actualDuration = job.status === 'completed' && job.started_at && job.completed_at
        ? Math.floor((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / (1000 * 60))
        : null;

      const reportData = {
        job: {
          ...job,
          work_summary: customerFeedback,
          customer_feedback: customerFeedback,
          actual_duration: actualDuration
        },
        photos: photos,
        partsUsed: [], // We'll populate this if needed later
        workNotes: customerFeedback
      };

      console.log('Generating PDF report with data:', reportData);

      await generateMinimalistJobReport(reportData);

      toast({
        title: "Report Generated",
        description: "PDF report has been downloaded successfully"
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive"
      });
    }
  };

  const sections = [
    {
      id: 'workflow',
      title: 'Job Workflow',
      icon: Wrench,
      component: (
        <JobWorkflowStepper
          currentStatus={job.status}
          onStatusChange={handleStatusChange}
          loading={loading}
          online={online}
        />
      )
    },
    {
      id: 'checklist',
      title: 'Checklist',
      icon: CheckCircle,
      component: <JobChecklist jobId={job.id} onChecklistUpdate={onJobUpdate} />
    },
    {
      id: 'photos',
      title: `Photos (${photos.length})`,
      icon: Camera,
      component: (
        <JobDocumentationPanel
          photos={photos}
          workNotes={workNotes}
          setWorkNotes={setWorkNotes}
          customerFeedback={customerFeedback}
          setCustomerFeedback={setCustomerFeedback}
          onPhotoUpload={handlePhotoUpload}
          uploadingPhoto={uploadingPhoto}
          jobStatus={job.status}
          job={job}
          onGenerateReport={handleGenerateReport}
          onGenerateInvoice={() => setShowInvoiceDialog(true)}
          selectedPhotoType={selectedPhotoType}
          setSelectedPhotoType={setSelectedPhotoType}
        />
      )
    },
    {
      id: 'parts',
      title: `Parts (${parts.length})`,
      icon: Wrench,
      component: (
        <div className="space-y-3">
          {parts.map((part) => (
            <Card key={part.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{part.parts_inventory.name}</p>
                    <p className="text-sm text-gray-600">Qty: {part.quantity_used}</p>
                  </div>
                  <p className="text-sm font-medium">${(part.unit_price * part.quantity_used).toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {parts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg">No parts added yet</p>
            </div>
          )}
        </div>
      )
    }
  ];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0 flex flex-col">
          {/* Clean Header */}
          <div className="p-6 border-b">
            <div className="flex items-start mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${getPriorityColor(job.priority)}`}></div>
                  <Badge className={getStatusBadge(job.status)} variant="outline">
                    {job.status?.replace('_', ' ')}
                  </Badge>
                  {job.priority === 'urgent' && (
                    <Badge variant="destructive" className="text-xs">URGENT</Badge>
                  )}
                </div>

                <h1 className="text-xl font-bold text-gray-900 break-words">
                  {job.title}
                </h1>

                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span>Job #{job.job_number}</span>
                  {job.scheduled_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(job.scheduled_date).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Customer Quick Info */}
            {job.customers && (
              <Card className="border-gray-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ 
                          backgroundColor: `${branding?.primary_color || '#3B82F6'}20`,
                        }}
                      >
                        <User 
                          className="w-4 h-4" 
                          style={{ color: branding?.primary_color || '#3B82F6' }}
                        />
                      </div>
                      <h3 className="font-semibold text-gray-900">
                        {job.customers.name}
                      </h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCustomerClick}
                      style={{ color: branding?.primary_color || '#3B82F6' }}
                      className="hover:opacity-80"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-4 text-sm flex-wrap">
                    {/* Location Navigation Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 hover:opacity-80"
                      style={{
                        color: branding?.secondary_color || '#64748B',
                        borderColor: branding?.secondary_color || '#64748B'
                      }}
                      onClick={() => {
                        const address = `${job.customers.address || ''}, ${job.customers.city || ''}, ${job.customers.state || ''}`.trim();
                        const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(address)}`;

                        try {
                          // Try to open in a new window/tab
                          const opened = window.open(mapsUrl, '_blank', 'noopener,noreferrer');
                          if (!opened) {
                            // Fallback: open in same window if popup blocked
                            window.location.href = mapsUrl;
                          }
                        } catch (error) {
                          console.error('Error opening maps:', error);
                          // Final fallback: copy address or alert user
                          alert(`Copy this address to navigate: ${address}`);
                        }
                      }}
                    >
                      <MapPin className="w-4 h-4" />
                      Navigate
                    </Button>

                    {job.customers.phone_mobile && (
                      <a
                        href={`tel:${job.customers.phone_mobile}`}
                        className="flex items-center gap-1 hover:underline"
                        style={{ color: branding?.primary_color || '#3B82F6' }}
                      >
                        <Phone className="w-4 h-4" />
                        {job.customers.phone_mobile}
                      </a>
                    )}
                    {job.customers.email && (
                      <a
                        href={`mailto:${job.customers.email}`}
                        className="flex items-center gap-1 hover:underline"
                        style={{ color: branding?.primary_color || '#3B82F6' }}
                      >
                        <Mail className="w-4 h-4" />
                        {job.customers.email}
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Expandable Sections */}
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-2 p-6">
              {sections.map((section) => (
                <Card key={section.id} className="border-gray-100 overflow-hidden">
                  <CardContent className="p-0">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <section.icon className="w-5 h-5 text-gray-600" />
                        <span className="font-medium text-gray-900">{section.title}</span>
                      </div>
                      {expandedSection === section.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    {expandedSection === section.id && (
                      <div className="px-4 pb-4 border-t border-gray-100">
                        <div className="pt-4">
                          <Suspense fallback={<div className="flex items-center justify-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          </div>}>
                            {section.component}
                          </Suspense>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Profile Sheet */}
      <Sheet open={showCustomerProfile} onOpenChange={setShowCustomerProfile}>
        <SheetContent className="w-full max-w-2xl">
          <SheetHeader>
            <SheetTitle>Customer Profile</SheetTitle>
            <SheetDescription>View customer information and job history</SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <Suspense fallback={<div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>}>
              {job?.customers?.id && (
                <CustomerProfile id={job.customers.id} />
              )}
            </Suspense>
          </div>
        </SheetContent>
      </Sheet>

      {/* Invoice Generation Dialog */}
      <InvoiceGenerationDialog
        job={job}
        isOpen={showInvoiceDialog}
        onClose={() => setShowInvoiceDialog(false)}
        onInvoiceGenerated={handleInvoiceGenerated}
      />
    </>
  );
};

export default JobDetailsDialog;
