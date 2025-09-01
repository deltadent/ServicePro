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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Receipt,
  User,
  Calendar,
  DollarSign,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { generateInvoiceFromJob, InvoiceGenerationResult } from '@/lib/invoiceRepo';
import { formatCurrency } from '@/lib/utils/jobCalculations';
import { format } from "date-fns";

interface InvoiceGenerationDialogProps {
  job: any;
  isOpen: boolean;
  onClose: () => void;
  onInvoiceGenerated?: (result: InvoiceGenerationResult) => void;
}

const InvoiceGenerationDialog = ({ 
  job, 
  isOpen, 
  onClose, 
  onInvoiceGenerated 
}: InvoiceGenerationDialogProps) => {
  const { toast } = useToast();
  const { settings, branding } = useCompanySettings();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    due_days: 30,
    additional_charges: 0,
    discount_amount: 0,
    payment_terms: 'Net 30 days',
    notes: ''
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        due_days: settings?.quote_validity_days || 30,
        additional_charges: 0,
        discount_amount: 0,
        payment_terms: `Net ${settings?.quote_validity_days || 30} days`,
        notes: ''
      });
    }
  }, [isOpen, settings]);

  const handleGenerate = async () => {
    if (!job) return;

    setLoading(true);
    try {
      const result = await generateInvoiceFromJob({
        job_id: job.id,
        due_days: formData.due_days,
        additional_charges: formData.additional_charges,
        discount_amount: formData.discount_amount,
        payment_terms: formData.payment_terms,
        notes: formData.notes
      });

      toast({
        title: "Invoice Generated Successfully",
        description: `Invoice ${result.invoice.invoice_number} has been created for job ${job.job_number}`,
      });

      onInvoiceGenerated?.(result);
      onClose();
    } catch (error) {
      console.error('Failed to generate invoice:', error);
      toast({
        title: "Invoice Generation Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!job) return null;

  // Calculate estimated totals for preview
  const estimatedSubtotal = (job.estimated_cost || 0) + formData.additional_charges;
  const discountedSubtotal = estimatedSubtotal - formData.discount_amount;
  const vatRate = settings?.default_vat_rate || 0.15;
  const estimatedVat = discountedSubtotal * vatRate;
  const estimatedTotal = discountedSubtotal + estimatedVat;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Generate Invoice
          </DialogTitle>
          <DialogDescription>
            Create an invoice for the completed job. Review costs and terms before generating.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Job Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Job Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Job Number:</span>
                  <p className="text-muted-foreground">{job.job_number}</p>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <Badge 
                    className="ml-2"
                    variant={job.status === 'completed' ? 'default' : 'secondary'}
                  >
                    {job.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Customer:</span>
                  <p className="text-muted-foreground">{job.customers?.name}</p>
                </div>
                <div>
                  <span className="font-medium">Service Date:</span>
                  <p className="text-muted-foreground">
                    {job.scheduled_date ? format(new Date(job.scheduled_date), 'MMM dd, yyyy') : 'N/A'}
                  </p>
                </div>
              </div>
              <div>
                <span className="font-medium text-sm">Description:</span>
                <p className="text-muted-foreground text-sm mt-1">{job.description || 'No description provided'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Configuration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="due_days">Payment Due (Days)</Label>
                  <Input
                    id="due_days"
                    type="number"
                    min="1"
                    max="365"
                    value={formData.due_days}
                    onChange={(e) => setFormData({ ...formData, due_days: parseInt(e.target.value) || 30 })}
                  />
                </div>
                <div>
                  <Label htmlFor="payment_terms">Payment Terms</Label>
                  <Input
                    id="payment_terms"
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    placeholder="e.g., Net 30 days"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="additional_charges">Additional Charges</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="additional_charges"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.additional_charges}
                      onChange={(e) => setFormData({ ...formData, additional_charges: parseFloat(e.target.value) || 0 })}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="discount_amount">Discount Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="discount_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.discount_amount}
                      onChange={(e) => setFormData({ ...formData, discount_amount: parseFloat(e.target.value) || 0 })}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any additional notes for the invoice..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Cost Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cost Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Estimated Base Cost:</span>
                  <span>{formatCurrency(job.estimated_cost || 0, settings)}</span>
                </div>
                {formData.additional_charges > 0 && (
                  <div className="flex justify-between">
                    <span>Additional Charges:</span>
                    <span>{formatCurrency(formData.additional_charges, settings)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(estimatedSubtotal, settings)}</span>
                </div>
                {formData.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(formData.discount_amount, settings)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>VAT ({(vatRate * 100).toFixed(1)}%):</span>
                  <span>{formatCurrency(estimatedVat, settings)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>{formatCurrency(estimatedTotal, settings)}</span>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Final amounts may vary based on actual labor time and parts used during the job.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* ZATCA Compliance Info */}
          {settings?.is_zatca_enabled && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>ZATCA Compliant:</strong> This invoice will include a QR code and comply with Saudi tax regulations.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={loading || job.status !== 'completed'}
              style={{ backgroundColor: branding?.primary_color || '#3B82F6' }}
              className="hover:opacity-90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Receipt className="w-4 h-4 mr-2" />
                  Generate Invoice
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceGenerationDialog;