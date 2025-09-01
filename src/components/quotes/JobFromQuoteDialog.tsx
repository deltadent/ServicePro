import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import {
  Briefcase,
  User,
  Clock,
  DollarSign,
  FileText,
  Calendar,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { Quote } from "@/lib/types/quotes";
import { format } from "date-fns";
import { useCompanySettings } from '@/hooks/useCompanySettings';

interface JobFromQuoteDialogProps {
  quote: Quote;
  isOpen: boolean;
  onClose: () => void;
  onJobCreated?: (jobId: string) => void;
}

const JobFromQuoteDialog = ({ quote, isOpen, onClose, onJobCreated }: JobFromQuoteDialogProps) => {
  const { toast } = useToast();
  const { branding, settings } = useCompanySettings();
  const [loading, setLoading] = useState(false);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date());
  
  const [formData, setFormData] = useState({
    technician_id: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    notes: '',
    estimated_duration: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchTechnicians();
      // Pre-fill form with quote data
      setFormData(prev => ({
        ...prev,
        notes: `Job created from Quote #${quote.quote_number}\n\nService: ${quote.title}\n\nOriginal Description:\n${quote.description || 'No description provided'}`
      }));
    }
  }, [isOpen, quote]);

  const fetchTechnicians = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'worker')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setTechnicians(data || []);
    } catch (error) {
      console.error('Error fetching technicians:', error);
      toast({
        title: "Error",
        description: "Failed to fetch technicians",
        variant: "destructive"
      });
    }
  };

  const handleCreateJob = async () => {
    if (!formData.technician_id) {
      toast({
        title: "Validation Error",
        description: "Please select a technician",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      // Generate job number with prefix from settings
      const nextJobNumber = (settings as any)?.next_job_number || 1001;
      const jobNumber = `${settings?.invoice_number_prefix || 'JOB-'}${String(nextJobNumber).padStart(4, '0')}`;

      // Create job from quote
      const jobData = {
        job_number: jobNumber,
        title: quote.title,
        description: quote.description,
        customer_id: quote.customer_id,
        technician_id: formData.technician_id,
        quote_id: quote.id, // Link to original quote
        estimated_cost: quote.total_amount,
        priority: formData.priority,
        status: 'scheduled',
        service_type: 'general',
        scheduled_date: scheduledDate.toISOString(),
        quote_converted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        notes: formData.notes
      };

      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert([jobData])
        .select()
        .single();

      if (jobError) throw jobError;

      // Increment the job number in company settings
      await supabase
        .from('company_settings')
        .update({ next_job_number: nextJobNumber + 1 })
        .eq('id', settings.id);

      // Create job checklist from quote items
      if (quote.quote_items && quote.quote_items.length > 0) {
        const checklistItems = quote.quote_items.map((item, index) => ({
          id: `item-${index + 1}`,
          text: `${item.description || item.name} - ${item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1)}`,
          required: item.item_type === 'service', // Services are required
          completed: false
        }));

        const checklistData = {
          job_id: job.id,
          template_name: `Quote #${quote.quote_number} Checklist`,
          items: checklistItems,
          completed_count: 0,
          total_count: checklistItems.length,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: checklistError } = await supabase
          .from('job_checklists')
          .insert([checklistData]);

        if (checklistError) {
          console.warn('Failed to create checklist from quote items:', checklistError);
        }
      }

      // Update quote status to converted
      await supabase
        .from('quotes')
        .update({ 
          status: 'converted',
          converted_to_job_at: new Date().toISOString(),
          converted_job_id: job.id
        })
        .eq('id', quote.id);

      toast({
        title: "Job Created Successfully",
        description: `Job ${jobNumber} has been created from Quote #${quote.quote_number}`,
      });

      onJobCreated?.(job.id);
      onClose();

    } catch (error: any) {
      console.error('Error creating job from quote:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create job from quote",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Convert Quote to Job
          </DialogTitle>
          <DialogDescription>
            Create a new job from Quote #{quote.quote_number} for {quote.customer?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quote Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quote Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Quote #:</span>
                  <p>{quote.quote_number}</p>
                </div>
                <div>
                  <span className="font-medium">Service:</span>
                  <p>{quote.title}</p>
                </div>
                <div>
                  <span className="font-medium">Customer:</span>
                  <p>{quote.customer?.name}</p>
                </div>
                <div>
                  <span className="font-medium">Total Amount:</span>
                  <p className="font-bold text-green-600">${quote.total_amount.toFixed(2)} SAR</p>
                </div>
              </div>
              
              {quote.quote_items && quote.quote_items.length > 0 && (
                <div>
                  <span className="font-medium text-sm">Quote Items ({quote.quote_items.length}):</span>
                  <div className="mt-2 space-y-1">
                    {quote.quote_items.slice(0, 3).map((item, index) => (
                      <div key={index} className="flex justify-between text-xs bg-gray-50 p-2 rounded">
                        <span>{item.description || item.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {item.item_type}
                        </Badge>
                      </div>
                    ))}
                    {quote.quote_items.length > 3 && (
                      <p className="text-xs text-gray-500">
                        +{quote.quote_items.length - 3} more items will be added to job checklist
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Job Creation Form */}
          <div className="space-y-4">
            {/* Technician Selection */}
            <div className="space-y-2">
              <Label htmlFor="technician" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Assign Technician *
              </Label>
              <Select onValueChange={(value) => setFormData(prev => ({ ...prev, technician_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a technician" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.full_name} ({tech.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Scheduled Date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Scheduled Date & Time *
              </Label>
              <DateTimePicker
                date={scheduledDate}
                setDate={setScheduledDate}
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Priority
              </Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value: 'low' | 'medium' | 'high') => 
                  setFormData(prev => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Estimated Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Estimated Duration (hours)
              </Label>
              <Input
                id="duration"
                type="number"
                step="0.5"
                placeholder="e.g., 2.5"
                value={formData.estimated_duration}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration: e.target.value }))}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Job Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Additional notes for the technician..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
              />
            </div>
          </div>

          {/* Conversion Info */}
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              This will create a new job linked to Quote #{quote.quote_number}. 
              Quote line items will be converted to checklist items. 
              The quote status will be updated to "Converted".
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateJob} 
              disabled={loading}
              style={{ backgroundColor: branding?.primary_color || '#3B82F6' }}
              className="hover:opacity-90"
            >
              {loading ? "Creating Job..." : "Create Job"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JobFromQuoteDialog;
