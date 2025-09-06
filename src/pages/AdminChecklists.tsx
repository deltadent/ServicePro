import { useState, useEffect } from 'react';
import { ModernButton } from "@/components/ui/modern-button";
import { StatsCard } from "@/components/ui/modern-card";
import { ModernDataTable, ActionsCell } from "@/components/ui/modern-data-table";
import { MotionDiv, MotionContainer, AnimatedPage } from "@/components/ui/motion";
import { PageHeader, ContentArea } from "@/components/layout/AppShell";
import { SkeletonCard } from "@/components/ui/modern-skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  CheckCircle,
  XCircle,
  Settings,
  FileCheck,
  Eye,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import type { ColumnDef } from "@tanstack/react-table";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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

  // Statistics
  const stats = {
    total: templates.length,
    active: templates.filter(t => t.is_active).length,
    inactive: templates.filter(t => !t.is_active).length,
    avgItems: templates.length > 0 ? Math.round(templates.reduce((acc, t) => acc + t.items.length, 0) / templates.length) : 0
  };

  // Table columns
  const columns: ColumnDef<ChecklistTemplate>[] = [
    {
      header: 'Template Name',
      accessorKey: 'name',
      cell: ({ row }: { row: any }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          {row.original.description && (
            <div className="text-sm text-muted-foreground mt-1">
              {row.original.description}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Items',
      accessorKey: 'items',
      cell: ({ row }: { row: any }) => (
        <div className="text-center">
          <div className="font-medium">{row.original.items.length}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.items.filter((item: ChecklistItem) => item.required).length} required
          </div>
        </div>
      )
    },
    {
      header: 'Status',
      accessorKey: 'is_active',
      cell: ({ row }: { row: any }) => (
        <Badge variant={row.original.is_active ? "default" : "secondary"}>
          {row.original.is_active ? "Active" : "Inactive"}
        </Badge>
      )
    },
    {
      header: 'Created',
      accessorKey: 'created_at',
      cell: ({ row }: { row: any }) => (
        <div className="text-sm">
          {format(new Date(row.original.created_at), 'MMM d, yyyy')}
        </div>
      )
    },
    {
      header: 'Preview',
      id: 'preview',
      cell: ({ row }: { row: any }) => {
        const template = row.original;
        return (
          <div className="space-y-1">
            {template.items.slice(0, 2).map((item: ChecklistItem, index: number) => (
              <div key={index} className="text-xs text-muted-foreground flex items-start gap-1">
                <div className="w-1 h-1 bg-muted-foreground rounded-full mt-1.5 flex-shrink-0" />
                <span className="truncate max-w-32">{item.text}</span>
                {item.required && <span className="text-orange-500">*</span>}
              </div>
            ))}
            {template.items.length > 2 && (
              <div className="text-xs text-muted-foreground">+{template.items.length - 2} more</div>
            )}
          </div>
        );
      }
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }: { row: any }) => {
        const template: ChecklistTemplate = row.original;
        
        const actions = [
          {
            label: 'Edit',
            icon: Edit,
            onClick: () => handleEditTemplate(template)
          },
          {
            label: template.is_active ? 'Deactivate' : 'Activate',
            icon: template.is_active ? ToggleLeft : ToggleRight,
            onClick: () => handleToggleStatus(template)
          },
          {
            label: 'Delete',
            icon: Trash2,
            onClick: () => handleDeleteTemplate(template.id),
            variant: 'destructive' as const
          }
        ];

        return <ActionsCell actions={actions} />;
      }
    }
  ];

  return (
    <AnimatedPage>
      <PageHeader 
        title="Checklist Templates" 
        description="Manage predefined checklists for different job types"
        actions={
          <ModernButton onClick={handleCreateTemplate}>
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </ModernButton>
        }
      />
      
      <ContentArea>
        {/* Statistics Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <MotionContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MotionDiv variant="scaleIn">
              <StatsCard
                title="Total Templates"
                value={stats.total}
                description="checklist templates"
                icon={<FileCheck className="w-5 h-5" />}
              />
            </MotionDiv>
            
            <MotionDiv variant="scaleIn" delay={0.1}>
              <StatsCard
                title="Active Templates"
                value={stats.active}
                description={`${stats.inactive} inactive`}
                trend={{
                  value: stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0,
                  isPositive: stats.active > stats.inactive
                }}
                icon={<CheckCircle className="w-5 h-5" />}
              />
            </MotionDiv>
            
            <MotionDiv variant="scaleIn" delay={0.2}>
              <StatsCard
                title="Inactive Templates"
                value={stats.inactive}
                description="need activation"
                icon={<XCircle className="w-5 h-5" />}
              />
            </MotionDiv>
            
            <MotionDiv variant="scaleIn" delay={0.3}>
              <StatsCard
                title="Avg Items"
                value={stats.avgItems}
                description="items per template"
                icon={<Settings className="w-5 h-5" />}
              />
            </MotionDiv>
          </MotionContainer>
        )}

        {/* Data Table */}
        <MotionDiv variant="fadeInUp">
          <ModernDataTable
            columns={columns}
            data={filteredTemplates}
            loading={loading}
            searchable={true}
            searchPlaceholder="Search templates by name or description..."
            exportable={true}
            filterColumns={['name', 'description']}
          />
        </MotionDiv>
      </ContentArea>

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
                <ModernButton type="button" variant="outline" size="sm" onClick={addChecklistItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </ModernButton>
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
                      <ModernButton
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeChecklistItem(item.id)}
                        className="shrink-0"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </ModernButton>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <ModernButton type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </ModernButton>
              <ModernButton type="submit">
                {dialogMode === 'create' ? 'Create Template' : 'Update Template'}
              </ModernButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AnimatedPage>
  );
};

export default AdminChecklists;
