
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AvailabilityChecker from './AvailabilityChecker';
import { EventsProvider } from '@/context/EventsContext';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { format } from "date-fns";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useJobCreation } from "@/context/JobCreationContext";
import { useCalendarDialog } from "@/context/CalendarDialogContext";
import { fetchChecklistTemplates } from '@/lib/checklistsRepo';

interface JobCreationDialogProps {
  onJobCreated: () => void;
}

const JobCreationDialog = ({ onJobCreated }: JobCreationDialogProps) => {
  console.log('🆕 JobCreationDialog: Component initialized with onJobCreated:', !!onJobCreated);

  const { toast } = useToast();
  const { setCustomerId, setServiceType, sessionLength } = useJobCreation();
  const { isOpen, setIsOpen, scheduledDate, setScheduledDate } = useCalendarDialog();
  const [showScheduler, setShowScheduler] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [checklistTemplates, setChecklistTemplates] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    customer_id: '',
    technician_id: '',
    title: '',
    description: '',
    service_type: '',
    priority: 'medium',
    checklist_template_id: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchCustomersAndTechnicians();
    }
  }, [isOpen]);

  const fetchCustomersAndTechnicians = async () => {
    console.log('🔄 JobCreationDialog: Starting data fetch...');

    try {
      console.log('🔧 About to fetch checklist templates...');
      const startTime = Date.now();

      // Diagnostic: Check Supabase client status
      console.log('🔍 Checking templates table directly...');
      try {
        const testQuery = await supabase.from('job_checklist_templates').select('id, name').limit(1);
        console.log('🔍 Direct table query result:', {
          success: !testQuery.error,
          error: testQuery.error,
          data: testQuery.data
        });
      } catch (directError) {
        console.log('🔍 Direct query failed:', directError);
      }

      const [customersResponse, techniciansResponse, templatesResponse] = await Promise.all([
        supabase.from('customers').select('id, name, email').eq('is_active', true).order('name'),
        supabase.from('profiles').select('id, full_name, email').eq('role', 'worker').eq('is_active', true).order('full_name'),
        fetchChecklistTemplates()
      ]);

      const fetchTime = Date.now() - startTime;
      console.log(`⏱️ Fetch completed in ${fetchTime}ms`);

      console.log('✅ Customers response:', {
        count: customersResponse.data?.length || 0,
        error: customersResponse.error,
        status: customersResponse.status
      });
      console.log('✅ Technicians response:', {
        count: techniciansResponse.data?.length || 0,
        error: techniciansResponse.error,
        status: techniciansResponse.status
      });

      // Enhanced diagnostic logging for templates
      console.log('✅ Templates response:', {
        templatesCount: templatesResponse.templates?.length || 0,
        fromCache: templatesResponse.fromCache,
        hasTemplates: Array.isArray(templatesResponse.templates),
        templatesData: templatesResponse.templates
      });

      if (customersResponse.error) {
        console.log('❌ Customers error:', customersResponse.error);
        throw customersResponse.error;
      }
      if (techniciansResponse.error) {
        console.log('❌ Technicians error:', techniciansResponse.error);
        throw techniciansResponse.error;
      }

      setCustomers(customersResponse.data || []);
      setTechnicians(techniciansResponse.data || []);

      const templates = templatesResponse.templates || [];
      console.log('🗂️ Final templates to set:', templates.length);
      console.log('📋 Template list:', templates.map(t => ({ id: t.id, name: t.name, itemsCount: t.items?.length || 'N/A' })));
      console.log('📊 React state will be updated with templates:', templates.length);

      // Set the templates in state immediately
      setChecklistTemplates(templates);

      // Force a re-render to ensure selects update
      setTimeout(() => {
        console.log('🔄 Post-render check - current checklistTemplates state:', checklistTemplates.length);
        console.log('🔄 Actual DOM templates available:', templates.length);
      }, 100);

      // Make templates globally available for console debugging
      if (typeof window !== 'undefined') {
        (window as any).debugTemplates = templates;
        console.log('🔧 Debug: Templates available at window.debugTemplates');
      }

      console.log('🎉 All data set successfully');

      // Add debugging functions after data is set
      if (typeof window !== 'undefined') {
        // Add comprehensive debugging functions to window
        (window as any).debugChecklistIssue = async () => {
          console.group('🔍 Checklist Dropdown Debug');

          // 1. Check current state
          console.log('📊 Current component state:', {
            checklistTemplatesLength: templates.length,
            isOpen,
            currentTemplates: (window as any).debugTemplates
          });

          // 2. Test direct database query
          try {
            console.log('🔍 Testing direct database queries...');

            // Test job_checklist_templates table
            const templateQuery = await supabase
              .from('job_checklist_templates')
              .select('*')
              .eq('is_active', true)
              .limit(10);

            console.log('📋 Templates query result:', {
              success: !templateQuery.error,
              error: templateQuery.error,
              count: templateQuery.data?.length || 0,
              data: templateQuery.data
            });

          } catch (directError) {
            console.error('❌ Direct debug query failed:', directError);
          }

          console.groupEnd();
          console.log('🔧 Debug complete. Suggested fixes:');
          console.log('1. If no templates found: Check if migration 20250828160000_job_checklists.sql was applied');
          console.log('2. If RLS error: User may not have permission to view templates');
          console.log('3. Test manually: (await supabase.from("job_checklist_templates").select("*").eq("is_active", true))');
        };

        console.log('🔧 Debug function available: window.debugChecklistIssue()');
      }

      // Force a re-render to ensure selects update
      setTimeout(() => {
        console.log('🔄 Forced re-render check - checklist templates:', templates.length);
      }, 100);

    } catch (error: any) {
      console.log('❌ JobCreationDialog fetch error:', error);
      console.error('🔍 Detailed error object:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        statusCode: error?.statusCode
      });

      // Show user-friendly error
      toast({
        title: "Error Loading Data",
        description: `Failed to load data: ${error?.message || 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setShowScheduler(true);
      fetchCustomersAndTechnicians();
    } else {
      resetForm();
      setShowScheduler(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      technician_id: '',
      title: '',
      description: '',
      service_type: '',
      priority: 'medium',
      checklist_template_id: ''
    });
    setScheduledDate(undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endDate = new Date(scheduledDate!);
      endDate.setMinutes(endDate.getMinutes() + sessionLength);

      // Remove checklist_template_id from job data since it's not a job field
      const { checklist_template_id, ...jobDataWithoutTemplate } = formData;

      const jobData = {
        ...jobDataWithoutTemplate,
        scheduled_date: scheduledDate?.toISOString(),
        end_date: endDate.toISOString(),
        status: 'scheduled'
      };

      const { data: createdJob, error: jobError } = await supabase
        .from('jobs')
        .insert([jobData])
        .select()
        .single();

      if (jobError) throw jobError;

      // If a checklist template was selected, create a checklist from it
      if (checklist_template_id && createdJob) {
        const { createChecklistFromTemplate } = await import('@/lib/checklistsRepo');

        try {
          await createChecklistFromTemplate(createdJob.id, checklist_template_id);
          console.log('Checklist created from template:', checklist_template_id);
        } catch (checklistError) {
          console.error('Failed to create checklist from template:', checklistError);
          // Don't fail the entire job creation if checklist creation fails
        }
      }

      toast({
        title: "Success",
        description: `Job created successfully${checklist_template_id ? ' with checklist' : ''}`
      });

      setIsOpen(false);
      onJobCreated();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowScheduler(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Job
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {showScheduler ? (
          <EventsProvider>
            <DialogHeader>
              <DialogTitle>Scheduling Assistant</DialogTitle>
              <DialogDescription>
                Select a date and time for the new job.
              </DialogDescription>
            </DialogHeader>
            <AvailabilityChecker onSlotClick={(date) => {
              setScheduledDate(date);
              setShowScheduler(false);
            }} />
          </EventsProvider>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create New Job</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new job assignment
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer_id">Customer *</Label>
              <Select value={formData.customer_id} onValueChange={(value) => {
                setFormData({ ...formData, customer_id: value });
                setCustomerId(value);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="technician_id">Assign Technician</Label>
              <Select value={formData.technician_id} onValueChange={(value) => setFormData({ ...formData, technician_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select technician" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.full_name || tech.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="title">Job Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter job title"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter job description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="service_type">Service Type *</Label>
              <Select value={formData.service_type} onValueChange={(value) => {
                setFormData({ ...formData, service_type: value });
                setServiceType(value);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ac_repair">AC Repair</SelectItem>
                  <SelectItem value="ac_maintenance">AC Maintenance</SelectItem>
                  <SelectItem value="plumbing">Plumbing</SelectItem>
                  <SelectItem value="electrical">Electrical</SelectItem>
                  <SelectItem value="hvac">HVAC</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Checklist Template Selection */}
          <div>
            <Label htmlFor="checklist_template">Checklist Template (Optional)</Label>
            <Select
              value={formData.checklist_template_id}
              onValueChange={(value) => setFormData({ ...formData, checklist_template_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a checklist template" />
              </SelectTrigger>
              <SelectContent>
                {checklistTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} ({Array.isArray(template.items) ? template.items.length : 0} items)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              Choose a checklist template to automatically create a checklist for this job
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowScheduler(true)}>
              Back
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Job"}
            </Button>
          </div>
        </form>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default JobCreationDialog;
