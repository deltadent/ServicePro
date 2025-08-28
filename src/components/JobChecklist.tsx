import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  Circle,
  Plus,
  AlertCircle,
  Clock,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { useNetwork } from '@/hooks/useNetwork';
import {
  fetchJobChecklist,
  updateChecklistItem,
  createChecklistFromTemplate,
  fetchChecklistTemplates,
  type ChecklistItem,
  type JobChecklist
} from '@/lib/checklistsRepo';
import { useAuth } from '@/hooks/useAuth';

interface JobChecklistProps {
  jobId: string;
  onChecklistUpdate?: () => void;
}

const JobChecklist = ({ jobId, onChecklistUpdate }: JobChecklistProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const online = useNetwork();

  const [checklist, setChecklist] = useState<JobChecklist | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    loadChecklist();
  }, [jobId]);

  const loadChecklist = async () => {
    try {
      setLoading(true);
      console.log('🔍 JobChecklist: Loading checklist for jobId:', jobId);

      // Fetch existing checklist
      const startTime = Date.now();
      const { checklist: existingChecklist, fromCache } = await fetchJobChecklist(jobId);
      const fetchTime = Date.now() - startTime;

      console.log('📋 JobChecklist fetch result:', {
        jobId,
        success: !!existingChecklist,
        fromCache,
        fetchTime,
        checklistData: existingChecklist,
        itemsCount: existingChecklist?.items?.length || 0,
        completedCount: existingChecklist?.completed_count || 0,
        totalCount: existingChecklist?.total_count || 0
      });

      setChecklist(existingChecklist);

      console.log('📊 JobChecklist: React state updated with checklist:', !!existingChecklist);

      // If no checklist exists, also fetch templates
      if (!existingChecklist) {
        const { templates: availableTemplates, fromCache } = await fetchChecklistTemplates();
        console.log('📋 Available templates:', availableTemplates.length, 'from', fromCache ? 'cache' : 'network');

        // Validate template data
        const validTemplates = availableTemplates.filter(template => {
          if (!template.name) {
            console.warn('Template missing name:', template);
            return false;
          }
          if (!Array.isArray(template.items)) {
            console.warn('Template items not array:', template);
            return false;
          }
          return true;
        });

        setTemplates(validTemplates);

        if (availableTemplates.length !== validTemplates.length) {
          toast({
            title: "Warning",
            description: `${availableTemplates.length - validTemplates.length} templates had invalid data`,
            variant: "default"
          });
        }
      }
    } catch (error) {
      console.error('❌ Error loading checklist:', error);
      toast({
        title: "Error",
        description: "Failed to load checklist. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleItemToggle = async (itemId: string, completed: boolean) => {
    if (!checklist || updating) return;

    setUpdating(itemId);

    try {
      const result = await updateChecklistItem(checklist.id, itemId, completed);

      if (result.success && result.checklist) {
        setChecklist(result.checklist);

        toast({
          title: completed ? "Item Completed" : "Item Uncompleted",
          description: completed
            ? "Checklist item marked as completed"
            : "Checklist item marked as pending",
        });
      } else {
        toast({
          title: "Error",
          description: online ? "Failed to update item" : "Queued for sync",
          variant: "destructive"
        });
      }

      if (onChecklistUpdate) {
        onChecklistUpdate();
      }
    } catch (error) {
      console.error('Error updating checklist item:', error);
      toast({
        title: "Error",
        description: "Failed to update checklist item",
        variant: "destructive"
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleCreateFromTemplate = async (templateId: string) => {
    console.log('🔧 JobChecklist: Creating checklist from template:', {
      templateId,
      jobId,
      timestamp: new Date().toISOString()
    });

    try {
      const startTime = Date.now();
      const newChecklist = await createChecklistFromTemplate(jobId, templateId);
      const creationTime = Date.now() - startTime;

      console.log('✅ JobChecklist: Template creation result:', {
        success: !!newChecklist,
        creationTime,
        checklistData: newChecklist,
        checklistId: newChecklist?.id,
        itemsCount: newChecklist?.items?.length || 0
      });

      if (newChecklist) {
        console.log('📊 JobChecklist: Setting React state and closing template picker');
        setChecklist(newChecklist);
        setShowTemplates(false);

        toast({
          title: "Checklist Created",
          description: `Checklist created with ${newChecklist.items?.length || 0} items from template`,
        });

        if (onChecklistUpdate) {
          console.log('🔄 JobChecklist: Triggering parent update callback');
          onChecklistUpdate();
        }
      } else {
        console.warn('⚠️ JobChecklist: createChecklistFromTemplate returned null');
        toast({
          title: "Warning",
          description: "Checklist template processing failed - items may be invalid",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ JobChecklist: Error creating checklist from template:', {
        error,
        templateId,
        jobId,
        errorMessage: error?.message,
        errorDetails: error?.details,
        errorCode: error?.statusCode
      });

      toast({
        title: "Error",
        description: `Failed to create checklist: ${error?.message || 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const progress = checklist ? (checklist.completed_count / checklist.total_count) * 100 : 0;
  const requiredItems = checklist?.items.filter(item => item.required) || [];
  const completedRequiredItems = requiredItems.filter(item => item.completed);
  const allRequiredCompleted = requiredItems.length === completedRequiredItems.length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!checklist) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Job Checklist
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            No checklist assigned to this job yet
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showTemplates ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-muted-foreground mb-4">
                Create a checklist from a template to ensure consistent job completion
              </p>
              <Button onClick={() => setShowTemplates(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Checklist
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Choose a Template</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowTemplates(false)}>
                  Cancel
                </Button>
              </div>

              {templates.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No templates available</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Contact an administrator to create checklist templates
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {templates.map((template) => (
                    <Card
                      key={template.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleCreateFromTemplate(template.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{template.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {Array.isArray(template.items) ? template.items.length : 0} items • {Array.isArray(template.items) ? template.items.filter((i: any) => i.required).length : 0} required
                            </p>
                          </div>
                          <Badge variant="outline">
                            {template.items?.length || 0} items
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Job Checklist</CardTitle>
            {checklist.template_name && (
              <Badge variant="outline" className="text-xs">
                {checklist.template_name}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!online && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                Offline
              </Badge>
            )}
            <Badge variant={allRequiredCompleted ? "default" : "destructive"}>
              {checklist.completed_count}/{checklist.total_count}
            </Badge>
          </div>
        </div>
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {checklist.completed_count} of {checklist.total_count} items completed
            {checklist.completed_count === checklist.total_count && (
              <span className="text-green-600 font-medium"> • All Done!</span>
            )}
          </p>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Required Items Section */}
          {requiredItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <h4 className="font-medium text-sm">Required Items</h4>
                <Badge variant="outline" className="text-xs">
                  {completedRequiredItems.length}/{requiredItems.length}
                </Badge>
              </div>
              {!allRequiredCompleted && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    All required items must be completed before the job can be marked as finished.
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-1">
                {requiredItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      item.completed
                        ? 'bg-green-50 border-green-200'
                        : updating === item.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Checkbox
                      checked={item.completed || false}
                      disabled={updating === item.id}
                      onCheckedChange={(checked) => handleItemToggle(item.id, !!checked)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {item.text}
                      </p>
                      {item.completed && item.completed_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Completed {new Date(item.completed_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <Badge variant="destructive" className="text-xs shrink-0">
                      Required
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional Items Section */}
          {checklist.items.some(item => !item.required) && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Optional Items
              </h4>
              <div className="space-y-1">
                {checklist.items.filter(item => !item.required).map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      item.completed
                        ? 'bg-green-50 border-green-200'
                        : updating === item.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Checkbox
                      checked={item.completed || false}
                      disabled={updating === item.id}
                      onCheckedChange={(checked) => handleItemToggle(item.id, !!checked)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {item.text}
                      </p>
                      {item.completed && item.completed_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Completed {new Date(item.completed_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default JobChecklist;