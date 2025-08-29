import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, FileText, CheckCircle, AlertCircle, Signature, Undo, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from "@/hooks/use-toast";
import { useNetwork } from '@/hooks/useNetwork';
import { fetchJobChecklist } from '@/lib/checklistsRepo';
import { createSignatureCapture } from '@/lib/signature';
import { completeJobWithPdf } from '@/lib/jobDocumentsRepo';

interface CompleteJobDialogProps {
  job: any;
  isOpen: boolean;
  onClose: () => void;
  onJobUpdate?: () => void;
}

const CompleteJobDialog = ({ job, isOpen, onClose, onJobUpdate }: CompleteJobDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const online = useNetwork();

  const [checklist, setChecklist] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [completionNote, setCompletionNote] = useState('');
  const [signatureCanvas, setSignatureCanvas] = useState<any>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && job?.id) {
      loadChecklist();
      initializeSignaturePad();
    }
  }, [isOpen, job?.id]);

  // Re-initialize signature pad when canvas state changes
  useEffect(() => {
    if (!signatureCanvas && isOpen && canvasRef.current) {
      initializeSignaturePad();
    }
  }, [signatureCanvas, isOpen]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      if (signatureCanvas) {
        clearSignature();
      }
      setSignatureCanvas(null);
      setHasSignature(false);
      setCompletionNote('');
      setChecklist(null);
    }
  }, [isOpen]);

  const loadChecklist = async () => {
    if (!job?.id) return;

    try {
      const { checklist: jobChecklist } = await fetchJobChecklist(job.id);
      setChecklist(jobChecklist);
    } catch (error) {
      console.error('Error loading checklist:', error);
      toast({
        title: "Error",
        description: "Failed to load checklist data",
        variant: "destructive"
      });
    }
  };

  const initializeSignaturePad = () => {
    if (!canvasRef.current) return;

    try {
      // Clear any existing canvas
      canvasRef.current.innerHTML = '';

      // Create new signature capture
      const capture = createSignatureCapture({
        width: 400,
        height: 200,
        lineWidth: 2,
        strokeStyle: '#000000'
      });

      canvasRef.current.appendChild(capture.canvas);
      setSignatureCanvas(capture);

      // Set up signature change detection
      const canvas = capture.canvas;
      const detectSignature = () => {
        const isEmpty = capture.isEmpty();
        setHasSignature(!isEmpty);
      };

      // Add event listeners with better error handling
      canvas.addEventListener('mouseup', detectSignature);
      canvas.addEventListener('touchend', detectSignature);
      canvas.addEventListener('touchmove', (e) => e.preventDefault());

      // Force initial check
      setTimeout(() => setHasSignature(!capture.isEmpty()), 100);

      console.log('Signature pad initialized successfully');
    } catch (error) {
      console.error('Failed to initialize signature pad:', error);
      setSignatureCanvas(null);
    }
  };

  const clearSignature = () => {
    if (signatureCanvas) {
      signatureCanvas.clear();
      setHasSignature(false);
    }
  };

  const undoSignature = () => {
    if (signatureCanvas && signatureCanvas.undo && signatureCanvas.canUndo && signatureCanvas.canUndo()) {
      signatureCanvas.undo();
      setHasSignature(!signatureCanvas.isEmpty());
    }
  };

  const getRequiredItemsStatus = () => {
    if (!checklist) return { completed: 0, total: 0, missing: [] };

    const requiredItems = checklist.items.filter((item: any) => item.required);
    const completedRequired = requiredItems.filter((item: any) => item.completed);
    const missingRequirements: string[] = [];

    requiredItems.forEach((item: any) => {
      if (!item.completed) {
        if (item.noteRequired && !item.note?.trim()) {
          missingRequirements.push(`Note for "${item.text}"`);
        }
        if (item.photoRequired && (!item.photos || item.photos.length === 0)) {
          missingRequirements.push(`Photo for "${item.text}"`);
        }
        if (!item.noteRequired && !item.photoRequired) {
          missingRequirements.push(`"${item.text}" not completed`);
        }
      }
    });

    return {
      completed: completedRequired.length,
      total: requiredItems.length,
      missing: missingRequirements
    };
  };

  const canCompleteJob = () => {
    if (!online) return false;

    const requirements = getRequiredItemsStatus();
    const hasAllRequirements = requirements.missing.length === 0;
    const hasValidSignature = signatureCanvas && (hasSignature || signatureCanvas.isEmpty());

    return hasAllRequirements && hasValidSignature;
  };

  const handleCompleteJob = async () => {
    if (!canCompleteJob()) return;

    setLoading(true);

    try {
      // Get signature blob if present
      let signatureBlob = null;
      if (signatureCanvas && !signatureCanvas.isEmpty()) {
        signatureBlob = await signatureCanvas.getBlob('image/png', 0.9);
      }

      // Complete job with PDF generation
      const result = await completeJobWithPdf({
        jobId: job.id,
        checklistId: checklist.id,
        technicianName: user?.user_metadata?.name || 'Technician',
        technicianId: user?.id || '',
        workSummary: completionNote.trim() || undefined,
        signatureBlob,
        companyInfo: { name: 'ServicePro' } // Could be made configurable
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to complete job');
      }

      if (onJobUpdate) onJobUpdate();
      onClose();

    } catch (error: any) {
      console.error('Error completing job:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete job",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Function for parent component to call when job completion is successful
  const handleJobCompletionSuccess = () => {
    if (onJobUpdate) onJobUpdate();
    onClose();

    toast({
      title: "Job Completed",
      description: "Job has been successfully completed with completion PDF generated.",
    });
  };

  const requirements = getRequiredItemsStatus();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Complete Job: {job?.title || 'Unknown Job'}
          </DialogTitle>
          <DialogDescription>
            Review checklist completion and finalize the job with customer signature.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Checklist Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Checklist Completion Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Required Items:</span>
                <Badge variant={requirements.missing.length === 0 ? "default" : "destructive"}>
                  {requirements.completed}/{requirements.total} Complete
                </Badge>
              </div>

              {requirements.missing.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">Missing Requirements:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {requirements.missing.map((requirement, index) => (
                        <li key={index} className="text-sm">{requirement}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {requirements.missing.length === 0 && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">All requirements met!</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {job?.customers ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Name</Label>
                      <p className="text-sm">{job.customers.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Phone</Label>
                      <p className="text-sm">
                        {job.customers.phone_mobile || job.customers.phone_work || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Address</Label>
                    <p className="text-sm">
                      {job.customers.address && `${job.customers.address}, `}
                      {job.customers.city && `${job.customers.city}, `}
                      {job.customers.state}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No customer information available</p>
              )}
            </CardContent>
          </Card>

          {/* Completion Note */}
          <div className="space-y-2">
            <Label htmlFor="completion-note">Completion Note (Optional)</Label>
            <Textarea
              id="completion-note"
              placeholder="Add any additional notes about the completed work..."
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              rows={3}
            />
          </div>

          {/* Signature Capture */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Signature className="w-5 h-5" />
                Customer Signature
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSignature}
                  disabled={!signatureCanvas}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Clear
                </Button>
                {signatureCanvas?.undo && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={undoSignature}
                    disabled={!signatureCanvas.canUndo || !signatureCanvas.canUndo()}
                  >
                    <Undo className="w-4 h-4 mr-2" />
                    Undo
                  </Button>
                )}
              </div>

              <div
                ref={canvasRef}
                className="border-2 border-dashed border-gray-300 rounded-lg bg-white h-[200px] relative overflow-hidden"
                style={{ backgroundColor: 'white' }}
              >
                {!signatureCanvas && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mx-auto mb-2"></div>
                      <p className="text-muted-foreground text-sm">Loading signature pad...</p>
                    </div>
                  </div>
                )}
              </div>

              {hasSignature && (
                <p className="text-sm text-green-600 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Signature captured
                </p>
              )}
            </CardContent>
          </Card>

          {/* Network Status Warning */}
          {!online && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You must be online to complete the job and generate the completion PDF.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleCompleteJob}
              disabled={!canCompleteJob() || loading}
              className="min-w-[120px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  Complete Job
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompleteJobDialog;