import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  Eye, 
  Download, 
  Copy, 
  Trash2, 
  Save,
  Edit3,
  FileText,
  Palette,
  Layout
} from 'lucide-react';
import { updateCompanyTemplate, deleteCompanyTemplate } from '@/lib/companyRepo';
import { CompanyTemplate } from '@/lib/types/company';
import { TemplatePreviewModal } from './TemplatePreviewModal';

interface TemplateManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  template: CompanyTemplate | null;
  onTemplateUpdated: (template: CompanyTemplate) => void;
  onTemplateDeleted: (templateId: string) => void;
}

export function TemplateManagementDialog({ 
  isOpen, 
  onClose, 
  template,
  onTemplateUpdated,
  onTemplateDeleted 
}: TemplateManagementDialogProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [isDeleting, setDeleting] = useState(false);
  
  // Form state for editing
  const [editForm, setEditForm] = useState({
    template_name: '',
    is_default: false,
    is_active: true,
    description: '',
    custom_footer: '',
    watermark_text: '',
    colors: {
      primary: '#000000',
      secondary: '#666666'
    },
    layout: {
      include_logo: true,
      include_company_details: true,
      include_customer_details: true,
      include_terms: false,
      include_signature: false
    }
  });

  useEffect(() => {
    if (template && isOpen) {
      // Initialize form with template data
      const templateData = template.template_data as any;
      setEditForm({
        template_name: template.template_name,
        is_default: template.is_default,
        is_active: template.is_active,
        description: templateData?.description || '',
        custom_footer: templateData?.content?.custom_footer || '',
        watermark_text: templateData?.content?.watermark_text || '',
        colors: {
          primary: templateData?.colors?.primary || '#000000',
          secondary: templateData?.colors?.secondary || '#666666'
        },
        layout: {
          include_logo: templateData?.layout?.include_logo ?? true,
          include_company_details: templateData?.layout?.include_company_details ?? true,
          include_customer_details: templateData?.layout?.include_customer_details ?? true,
          include_terms: templateData?.layout?.include_terms ?? false,
          include_signature: templateData?.layout?.include_signature ?? false
        }
      });
    }
  }, [template, isOpen]);

  if (!template) return null;

  const templateData = template.template_data as any;

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update the template data structure
      const updatedTemplateData = {
        ...templateData,
        description: editForm.description,
        colors: editForm.colors,
        layout: editForm.layout,
        content: {
          ...templateData?.content,
          custom_footer: editForm.custom_footer || null,
          watermark_text: editForm.watermark_text || null
        },
        updated_at: new Date().toISOString()
      };

      const updatedTemplate = await updateCompanyTemplate(template.id, {
        template_name: editForm.template_name,
        is_default: editForm.is_default,
        is_active: editForm.is_active,
        template_data: updatedTemplateData
      });

      onTemplateUpdated(updatedTemplate);
      setIsEditing(false);
      
      toast({
        title: 'Success',
        description: 'Template updated successfully'
      });
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: 'Error',
        description: 'Failed to update template',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      await deleteCompanyTemplate(template.id);
      onTemplateDeleted(template.id);
      onClose();
      
      toast({
        title: 'Success',
        description: 'Template deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive'
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = () => {
    toast({
      title: 'Duplicate Template',
      description: 'Template duplication feature coming soon'
    });
  };

  const handleExport = () => {
    // Create a downloadable JSON file of the template
    const dataStr = JSON.stringify(template, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `template-${template.template_name.toLowerCase().replace(/\s+/g, '-')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {isEditing ? 'Edit Template' : 'Template Settings'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Template Info Header */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div>
                      {isEditing ? (
                        <Input
                          value={editForm.template_name}
                          onChange={(e) => setEditForm(prev => ({ 
                            ...prev, 
                            template_name: e.target.value 
                          }))}
                          className="text-lg font-semibold"
                        />
                      ) : (
                        <h3 className="text-lg font-semibold">{template.template_name}</h3>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant={template.template_type === 'quote' ? 'secondary' : 'default'}
                          className="text-xs"
                        >
                          {template.template_type.toUpperCase()}
                        </Badge>
                        {template.is_default && (
                          <Badge variant="default" className="text-xs">
                            Default
                          </Badge>
                        )}
                        {!template.is_active && (
                          <Badge variant="destructive" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsPreviewOpen(true)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      <Edit3 className="h-3 w-3 mr-1" />
                      {isEditing ? 'Cancel' : 'Edit'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Basic Settings */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label>Description</Label>
                  {isEditing ? (
                    <Textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm(prev => ({ 
                        ...prev, 
                        description: e.target.value 
                      }))}
                      rows={2}
                      placeholder="Template description..."
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">
                      {templateData?.description || 'No description provided'}
                    </p>
                  )}
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label>Default Template</Label>
                    {isEditing ? (
                      <Switch
                        checked={editForm.is_default}
                        onCheckedChange={(checked) => setEditForm(prev => ({ 
                          ...prev, 
                          is_default: checked 
                        }))}
                      />
                    ) : (
                      <Badge variant={template.is_default ? 'default' : 'outline'}>
                        {template.is_default ? 'Yes' : 'No'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Active Status</Label>
                    {isEditing ? (
                      <Switch
                        checked={editForm.is_active}
                        onCheckedChange={(checked) => setEditForm(prev => ({ 
                          ...prev, 
                          is_active: checked 
                        }))}
                      />
                    ) : (
                      <Badge variant={template.is_active ? 'default' : 'destructive'}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Created: {formatDate(template.created_at)}</p>
                  <p>Last Updated: {formatDate(template.updated_at)}</p>
                  <p>Version: {templateData?.version || '1.0'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Design Settings */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="h-4 w-4" />
                  <Label className="text-base font-medium">Design Settings</Label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Primary Color</Label>
                    {isEditing ? (
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="color"
                          value={editForm.colors.primary}
                          onChange={(e) => setEditForm(prev => ({
                            ...prev,
                            colors: { ...prev.colors, primary: e.target.value }
                          }))}
                          className="w-12 h-8 p-0"
                        />
                        <Input
                          value={editForm.colors.primary}
                          onChange={(e) => setEditForm(prev => ({
                            ...prev,
                            colors: { ...prev.colors, primary: e.target.value }
                          }))}
                          className="flex-1"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <div 
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: templateData?.colors?.primary || '#000000' }}
                        />
                        <span className="text-sm font-mono">
                          {templateData?.colors?.primary || '#000000'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Secondary Color</Label>
                    {isEditing ? (
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="color"
                          value={editForm.colors.secondary}
                          onChange={(e) => setEditForm(prev => ({
                            ...prev,
                            colors: { ...prev.colors, secondary: e.target.value }
                          }))}
                          className="w-12 h-8 p-0"
                        />
                        <Input
                          value={editForm.colors.secondary}
                          onChange={(e) => setEditForm(prev => ({
                            ...prev,
                            colors: { ...prev.colors, secondary: e.target.value }
                          }))}
                          className="flex-1"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <div 
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: templateData?.colors?.secondary || '#666666' }}
                        />
                        <span className="text-sm font-mono">
                          {templateData?.colors?.secondary || '#666666'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Layout className="h-4 w-4" />
                    <Label className="text-sm font-medium">Layout Elements</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(editForm.layout).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label className="text-sm capitalize">
                          {key.replace('include_', '').replace('_', ' ')}
                        </Label>
                        {isEditing ? (
                          <Switch
                            checked={value}
                            onCheckedChange={(checked) => setEditForm(prev => ({
                              ...prev,
                              layout: { ...prev.layout, [key]: checked }
                            }))}
                          />
                        ) : (
                          <Badge variant={value ? 'default' : 'outline'} className="text-xs">
                            {value ? 'Yes' : 'No'}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Custom Content */}
            {isEditing && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <Label className="text-base font-medium">Custom Content</Label>
                  
                  <div>
                    <Label>Custom Footer</Label>
                    <Textarea
                      value={editForm.custom_footer}
                      onChange={(e) => setEditForm(prev => ({ 
                        ...prev, 
                        custom_footer: e.target.value 
                      }))}
                      rows={2}
                      placeholder="Custom footer text..."
                    />
                  </div>

                  <div>
                    <Label>Watermark Text</Label>
                    <Input
                      value={editForm.watermark_text}
                      onChange={(e) => setEditForm(prev => ({ 
                        ...prev, 
                        watermark_text: e.target.value 
                      }))}
                      placeholder="DRAFT, CONFIDENTIAL, etc."
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter className="flex justify-between">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDuplicate}>
                <Copy className="h-3 w-3 mr-1" />
                Duplicate
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {isEditing && (
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="h-3 w-3 mr-1" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Preview Modal */}
      <TemplatePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        templateId={templateData?.header_style || 'standard'}
        templateType={template.template_type as 'quote' | 'invoice'}
      />
    </>
  );
}