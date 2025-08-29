import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CheckCircle,
  Circle,
  Plus,
  AlertTriangle,
  Trash2,
  Edit,
  Shield,
  Clock
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

interface JobChecklistNewProps {
  jobId: string;
  onChecklistUpdate?: () => void;
}

const JobChecklistNew = ({ jobId, onChecklistUpdate }: JobChecklistNewProps) => {
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

      const { checklist: existingChecklist, fromCache } = await fetchJobChecklist(jobId);

      console.log('📋 JobChecklist fetch result:', {
        jobId,
        success: !!existingChecklist,
        fromCache,
        checklistData: existingChecklist,
        itemsCount: existingChecklist?.items?.length || 0,
        completedCount: existingChecklist?.completed_count || 0,
        totalCount: existingChecklist?.total_count || 0
      });

      setChecklist(existingChecklist);

      if (!existingChecklist) {
        const { templates: availableTemplates } = await fetchChecklistTemplates();

        const validTemplates = availableTemplates.filter(template => {
          if (!template.name) return false;
          if (!Array.isArray(template.items)) return false;
          return true;
        });

        setTemplates(validTemplates);
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

        if (onChecklistUpdate) {
          onChecklistUpdate();
        }
      } else {
        toast({
          title: "Error",
          description: online ? "Failed to update item" : "Queued for sync",
          variant: "destructive"
        });
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
      const newChecklist = await createChecklistFromTemplate(jobId, templateId);

      console.log('✅ JobChecklist: Template creation result:', {
        success: !!newChecklist,
        checklistData: newChecklist,
        checklistId: newChecklist?.id,
        itemsCount: newChecklist?.items?.length || 0
      });

      if (newChecklist) {
        setChecklist(newChecklist);
        setShowTemplates(false);

        toast({
          title: "Checklist Created",
          description: `Checklist created with ${newChecklist.items?.length || 0} items from template`,
        });

        if (onChecklistUpdate) {
          onChecklistUpdate();
        }
      } else {
        toast({
          title: "Warning",
          description: "Checklist template processing failed",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ JobChecklist: Error creating checklist from template:', {
        error,
        templateId,
        jobId,
        errorMessage: error?.message
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
      <div className="space-y-4">
        {!showTemplates ? (
          <Card className="border-dashed border-2 border-gray-200">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Create Job Checklist
              </h3>

              <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                Ensure consistent job completion by using a checklist template
              </p>

              <Button onClick={() => setShowTemplates(true)} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Choose Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Choose a Template</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowTemplates(false)}>
                Cancel
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:shadow-md transition-all border-gray-200"
                  onClick={() => handleCreateFromTemplate(template.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{template.name}</h4>
                      <Badge variant="outline">
                        {template.items?.length || 0} items
                      </Badge>
                    </div>

                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>{template.items?.filter((i: any) => i.required).length || 0} required</span>
                      <span>{template.items?.filter((i: any) => !i.required).length || 0} optional</span>
                    </div>

                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 text-blue-800">
                        <Shield className="w-4 h-4" />
                        <span className="text-sm">Standard quality checklist</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {templates.length === 0 && (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No templates available</p>
                <p className="text-sm text-gray-500 mt-1">
                  Contact an administrator to create checklist templates
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-4 h-4 text-green-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Job Checklist</h3>
          {checklist.template_name && (
            <p className="text-sm text-gray-600">Template: {checklist.template_name}</p>
          )}
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <Badge variant={progress === 100 ? "default" : "secondary"}>
                {checklist.completed_count}/{checklist.total_count}
              </Badge>
            </div>

            {!online && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>

          <Progress value={progress} className="h-2 mb-2" />

          <p className="text-xs text-gray-600">
            {progress === 100 ? "✅ All items completed!" : `${Math.round(progress)}% complete`}
          </p>
        </CardContent>
      </Card>

      {/* Required Items Warning */}
      {requiredItems.length > 0 && completedRequiredItems.length < requiredItems.length && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800">Required Items</AlertTitle>
          <AlertDescription className="text-orange-700">
            {requiredItems.length - completedRequiredItems.length} required item(s) must be completed before the job can be finished.
          </AlertDescription>
        </Alert>
      )}

      {/* Required Items */}
      {requiredItems.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            Required Items
            <Badge variant="destructive" className="text-xs">
              {completedRequiredItems.length}/{requiredItems.length}
            </Badge>
          </h4>

          <div className="space-y-2">
            {requiredItems.map((item) => (
              <Card
                key={item.id}
                className={`transition-all duration-200 ${
                  item.completed ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleItemToggle(item.id, !item.completed)}
                      disabled={updating === item.id || !online}
                      className="flex-shrink-0 mt-1"
                    >
                      {item.completed ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Circle className={`w-5 h-5 ${updating === item.id ? 'text-blue-400' : 'text-gray-400'}`} />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${item.completed ? 'line-through text-gray-600' : 'text-gray-900'}`}>
                        {item.text}
                      </p>

                      {item.completed && item.completed_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          Completed {new Date(item.completed_at).toLocaleString()}
                        </p>
                      )}
                    </div>

                    <Badge variant="destructive" className="text-xs flex-shrink-0">
                      Required
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Optional Items */}
      {checklist.items.some(item => !item.required) && (
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            Optional Items
            <Badge variant="outline" className="text-xs">
              {checklist.items.filter(item => !item.required && item.completed).length}/{checklist.items.filter(item => !item.required).length}
            </Badge>
          </h4>

          <div className="space-y-2">
            {checklist.items.filter(item => !item.required).map((item) => (
              <Card
                key={item.id}
                className={`transition-all duration-200 ${
                  item.completed ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleItemToggle(item.id, !item.completed)}
                      disabled={updating === item.id || !online}
                      className="flex-shrink-0 mt-1"
                    >
                      {item.completed ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Circle className={`w-5 h-5 ${updating === item.id ? 'text-blue-400' : 'text-gray-400'}`} />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${item.completed ? 'line-through text-gray-600' : 'text-gray-900'}`}>
                        {item.text}
                      </p>

                      {item.completed && item.completed_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          Completed {new Date(item.completed_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Completion Summary */}
      {progress === 100 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-medium text-green-800">All checklist items completed!</p>
                <p className="text-sm text-green-700">You're ready to finish this job.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default JobChecklistNew;