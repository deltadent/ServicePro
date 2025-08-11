
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

interface JobCreationDialogProps {
  onJobCreated: () => void;
}

const JobCreationDialog = ({ onJobCreated }: JobCreationDialogProps) => {
  const { toast } = useToast();
  const { setCustomerId, setServiceType, sessionLength } = useJobCreation();
  const { isOpen, setIsOpen, scheduledDate, setScheduledDate } = useCalendarDialog();
  const [showScheduler, setShowScheduler] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    customer_id: '',
    technician_id: '',
    title: '',
    description: '',
    service_type: '',
    priority: 'medium'
  });

  useEffect(() => {
    if (isOpen) {
      fetchCustomersAndTechnicians();
    }
  }, [isOpen]);

  const fetchCustomersAndTechnicians = async () => {
    try {
      const [customersResponse, techniciansResponse] = await Promise.all([
        supabase.from('customers').select('id, name, email').order('name'),
        supabase.from('profiles').select('id, full_name, email').eq('role', 'worker').order('full_name')
      ]);

      if (customersResponse.error) throw customersResponse.error;
      if (techniciansResponse.error) throw techniciansResponse.error;

      setCustomers(customersResponse.data || []);
      setTechnicians(techniciansResponse.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load customers and technicians",
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
      priority: 'medium'
    });
    setScheduledDate(undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endDate = new Date(scheduledDate!);
      endDate.setMinutes(endDate.getMinutes() + sessionLength);

      const jobData = {
        ...formData,
        scheduled_date: scheduledDate?.toISOString(),
        end_date: endDate.toISOString(),
        status: 'scheduled'
      };

      const { error } = await supabase
        .from('jobs')
        .insert([jobData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Job created successfully"
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
