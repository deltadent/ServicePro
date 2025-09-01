import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  MoreVertical,
  CheckCircle,
  XCircle,
  Settings
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

interface ChecklistTemplate {
  id: string;
  name: string;
  description?: string;
  items: ChecklistItem[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  required: boolean;
}

const AdminChecklists = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    items: [] as ChecklistItem[]
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('job_checklist_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTemplates(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load checklist templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateTemplate = () => {
    setDialogMode('create');
    setFormData({
      name: '',
      description: '',
      items: [{ id: 'item_1', text: '', required: true }]
    });
    setSelectedTemplate(null);
    setIsDialogOpen(true);
  };

  const handleEditTemplate = (template: ChecklistTemplate) => {
    setDialogMode('edit');
    setFormData({
      name: template.name,
      description: template.description || '',
      items: [...template.items]
    });
    setSelectedTemplate(template);
    setIsDialogOpen(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('job_checklist_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template deleted successfully"
      });

      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive"
      });
    }
  };

  const handleToggleStatus = async (template: ChecklistTemplate) => {
    try {
      const { error } = await supabase
        .from('job_checklist_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Template ${!template.is_active ? 'activated' : 'deactivated'} successfully`
      });

      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update template status",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Template name is required",
        variant: "destructive"
      });
      return;
    }

    if (formData.items.length === 0 || formData.items.every(item => !item.text.trim())) {
      toast({
        title: "Validation Error",
        description: "At least one checklist item is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const templateData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        items: formData.items.filter(item => item.text.trim())
      };

      if (dialogMode === 'create') {
        const { error } = await supabase
          .from('job_checklist_templates')
          .insert([templateData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Template created successfully"
        });
      } else {
        const { error } = await supabase
          .from('job_checklist_templates')
          .update(templateData)
          .eq('id', selectedTemplate?.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Template updated successfully"
        });
      }

      setIsDialogOpen(false);
      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to ${dialogMode} template`,
        variant: "destructive"
      });
    }
  };

  const addChecklistItem = () => {
    const newId = `item_${Date.now()}`;
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { id: newId, text: '', required: false }]
    }));
  };

  const updateChecklistItem = (id: string, field: 'text' | 'required', value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeChecklistItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Checklist Templates</h1>
          <p className="text-muted-foreground">Manage predefined checklists for different job types</p>
        </div>
        <Button onClick={handleCreateTemplate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {template.description || 'No description'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={template.is_active ? "default" : "secondary"}>
                    {template.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleStatus(template)}>
                        {template.is_active ? (
                          <>
                            <XCircle className="w-4 h-4 mr-2" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{template.items.length} items</span>
                  <span>{template.items.filter(item => item.required).length} required</span>
                </div>
                <div className="space-y-2">
                  {template.items.slice(0, 3).map((item, index) => (
                    <div key={item.id} className="flex items-start gap-2 text-sm">
                      <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                      <span className="truncate">{item.text}</span>
                      {item.required && (
                        <Badge variant="outline" className="text-xs px-1 py-0 ml-auto">
                          Req
                        </Badge>
                      )}
                    </div>
                  ))}
                  {template.items.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{template.items.length - 3} more items
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <Settings className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No templates found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 'No templates match your search' : 'Create your first checklist template'}
          </p>
          <Button onClick={handleCreateTemplate}>
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto md:max-w-2xl md:max-h-[90vh] w-full md:w-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? 'Create Checklist Template' : 'Edit Checklist Template'}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'create' ? 'Create a new checklist template' : 'Update the checklist template'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., AC Maintenance Standard"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of when to use this checklist"
                rows={3}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Checklist Items *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addChecklistItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="flex-1 space-y-3">
                      <Input
                        value={item.text}
                        onChange={(e) => updateChecklistItem(item.id, 'text', e.target.value)}
                        placeholder={`Checklist item ${index + 1}`}
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`required-${item.id}`}
                          checked={item.required}
                          onChange={(e) => updateChecklistItem(item.id, 'required', e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor={`required-${item.id}`} className="text-sm">Required</Label>
                      </div>
                    </div>
                    {formData.items.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeChecklistItem(item.id)}
                        className="shrink-0"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {dialogMode === 'create' ? 'Create Template' : 'Update Template'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminChecklists;
