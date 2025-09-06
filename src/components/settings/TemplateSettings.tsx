import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ModernButton } from '@/components/ui/modern-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { FileText, Settings, Eye, Plus, Edit, Trash2 } from 'lucide-react';
import { getCompanySettings, updateCompanySettings, getCompanyTemplates } from '@/lib/companyRepo';
import { CompanySettings, CompanySettingsUpdateRequest, CompanyTemplate } from '@/lib/types/company';
import { TemplatePreviewModal } from '@/components/templates/TemplatePreviewModal';
import { CreateTemplateDialog } from '@/components/templates/CreateTemplateDialog';
import { TemplateManagementDialog } from '@/components/templates/TemplateManagementDialog';

const templateSettingsSchema = z.object({
  quote_validity_days: z.number().min(1).max(365, 'Quote validity must be between 1 and 365 days'),
  quote_number_prefix: z.string().min(1, 'Quote prefix is required'),
  invoice_number_prefix: z.string().min(1, 'Invoice prefix is required'),
  default_quote_template: z.string(),
  default_invoice_template: z.string(),
  include_logo_in_pdf: z.boolean(),
  pdf_footer_text: z.string().optional()
});

type TemplateSettingsFormData = z.infer<typeof templateSettingsSchema>;

const TEMPLATE_OPTIONS = [
  { id: 'standard', name: 'Standard Template', description: 'Clean, professional layout' },
  { id: 'modern', name: 'Modern Template', description: 'Contemporary design with accent colors' },
  { id: 'minimal', name: 'Minimal Template', description: 'Simple, text-focused layout' },
  { id: 'detailed', name: 'Detailed Template', description: 'Comprehensive information display' }
];

export function TemplateSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [templates, setTemplates] = useState<CompanyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    templateId: string;
    templateType: 'quote' | 'invoice';
  }>({ isOpen: false, templateId: '', templateType: 'quote' });
  const [createTemplateDialog, setCreateTemplateDialog] = useState(false);
  const [managementDialog, setManagementDialog] = useState<{
    isOpen: boolean;
    template: CompanyTemplate | null;
  }>({ isOpen: false, template: null });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<TemplateSettingsFormData>({
    resolver: zodResolver(templateSettingsSchema),
    defaultValues: {
      quote_validity_days: 30,
      quote_number_prefix: 'QUO-',
      invoice_number_prefix: 'INV-',
      default_quote_template: 'standard',
      default_invoice_template: 'standard',
      include_logo_in_pdf: true,
      pdf_footer_text: ''
    }
  });

  const watchedValues = watch();

  useEffect(() => {
    loadSettings();
    loadTemplates();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await getCompanySettings();
      setSettings(data);
      
      if (data) {
        setValue('quote_validity_days', data.quote_validity_days);
        setValue('quote_number_prefix', data.quote_number_prefix);
        setValue('invoice_number_prefix', data.invoice_number_prefix);
        setValue('default_quote_template', data.default_quote_template);
        setValue('default_invoice_template', data.default_invoice_template);
        setValue('include_logo_in_pdf', data.include_logo_in_pdf);
        setValue('pdf_footer_text', data.pdf_footer_text || '');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load template settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await getCompanyTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const onSubmit = async (data: TemplateSettingsFormData) => {
    try {
      const updateData: CompanySettingsUpdateRequest = {
        // Preserve existing logo_url to prevent it from being cleared
        logo_url: settings?.logo_url,
        // Template-specific fields
        quote_validity_days: data.quote_validity_days,
        quote_number_prefix: data.quote_number_prefix,
        invoice_number_prefix: data.invoice_number_prefix,
        default_quote_template: data.default_quote_template,
        default_invoice_template: data.default_invoice_template,
        include_logo_in_pdf: data.include_logo_in_pdf,
        pdf_footer_text: data.pdf_footer_text || null
      };

      const updated = await updateCompanySettings(updateData);
      setSettings(updated);

      toast({
        title: 'Success',
        description: 'Template settings updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update template settings',
        variant: 'destructive'
      });
    }
  };

  const previewTemplate = (templateId: string, type: 'quote' | 'invoice') => {
    setPreviewModal({
      isOpen: true,
      templateId,
      templateType: type
    });
  };
  
  const handleTemplateCreated = (template: CompanyTemplate) => {
    setTemplates(prev => [...prev, template]);
    loadSettings(); // Reload to update counters
  };
  
  const handleTemplateUpdated = (template: CompanyTemplate) => {
    setTemplates(prev => prev.map(t => t.id === template.id ? template : t));
    loadSettings(); // Reload to update settings if default changed
  };
  
  const handleTemplateDeleted = (templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId));
  };
  
  const openTemplateManagement = (template: CompanyTemplate) => {
    setManagementDialog({
      isOpen: true,
      template
    });
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Document Numbering */}
      <Card>
        <CardHeader>
          <CardTitle>Document Numbering</CardTitle>
          <CardDescription>
            Configure automatic numbering for quotes and invoices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quote_number_prefix">Quote Number Prefix</Label>
              <Input
                id="quote_number_prefix"
                {...register('quote_number_prefix')}
                placeholder="QUO-"
              />
              {errors.quote_number_prefix && (
                <p className="text-sm text-red-600 mt-1">{errors.quote_number_prefix.message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Next quote: {watchedValues.quote_number_prefix}{String(settings?.next_quote_number || 1000).padStart(4, '0')}
              </p>
            </div>

            <div>
              <Label htmlFor="invoice_number_prefix">Invoice Number Prefix</Label>
              <Input
                id="invoice_number_prefix"
                {...register('invoice_number_prefix')}
                placeholder="INV-"
              />
              {errors.invoice_number_prefix && (
                <p className="text-sm text-red-600 mt-1">{errors.invoice_number_prefix.message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Next invoice: {watchedValues.invoice_number_prefix}{String(settings?.next_invoice_number || 1000).padStart(4, '0')}
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="quote_validity_days">Quote Validity (Days)</Label>
            <Input
              id="quote_validity_days"
              type="number"
              min="1"
              max="365"
              {...register('quote_validity_days', { valueAsNumber: true })}
              placeholder="30"
            />
            {errors.quote_validity_days && (
              <p className="text-sm text-red-600 mt-1">{errors.quote_validity_days.message}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              How long quotes remain valid for acceptance
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Template Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Default Templates</CardTitle>
          <CardDescription>
            Choose default templates for quotes and invoices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="default_quote_template">Default Quote Template</Label>
              <Select
                value={watchedValues.default_quote_template}
                onValueChange={(value) => setValue('default_quote_template', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select quote template" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_OPTIONS.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-muted-foreground">{template.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => previewTemplate(watchedValues.default_quote_template, 'quote')}
              >
                <Eye className="h-3 w-3 mr-1" />
                Preview Quote Template
              </ModernButton>
            </div>

            <div>
              <Label htmlFor="default_invoice_template">Default Invoice Template</Label>
              <Select
                value={watchedValues.default_invoice_template}
                onValueChange={(value) => setValue('default_invoice_template', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select invoice template" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_OPTIONS.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-muted-foreground">{template.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => previewTemplate(watchedValues.default_invoice_template, 'invoice')}
              >
                <Eye className="h-3 w-3 mr-1" />
                Preview Invoice Template
              </ModernButton>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PDF Settings */}
      <Card>
        <CardHeader>
          <CardTitle>PDF Document Settings</CardTitle>
          <CardDescription>
            Configure PDF generation options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="include_logo_in_pdf">Include Logo in PDF</Label>
              <p className="text-sm text-muted-foreground">
                Add company logo to generated PDF documents
              </p>
            </div>
            <Switch
              id="include_logo_in_pdf"
              checked={watchedValues.include_logo_in_pdf}
              onCheckedChange={(checked) => setValue('include_logo_in_pdf', checked)}
            />
          </div>

          <Separator />

          <div>
            <Label htmlFor="pdf_footer_text">PDF Footer Text</Label>
            <Textarea
              id="pdf_footer_text"
              {...register('pdf_footer_text')}
              placeholder="Thank you for your business! | Website: company.sa | Email: info@company.sa"
              rows={2}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Optional text to appear at the bottom of PDF documents
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Custom Templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Custom Templates</CardTitle>
              <CardDescription>
                Manage custom quote and invoice templates
              </CardDescription>
            </div>
            <ModernButton 
              variant="outline" 
              size="sm"
              onClick={() => setCreateTemplateDialog(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Create Template
            </ModernButton>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length > 0 ? (
            <div className="space-y-3">
              {templates.map((template) => (
                <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{template.template_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {template.template_type}
                        </Badge>
                        {template.is_default && (
                          <Badge variant="default" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ModernButton 
                      variant="ghost" 
                      size="sm"
                      onClick={() => previewTemplate(
                        (template.template_data as any)?.header_style || 'standard',
                        template.template_type as 'quote' | 'invoice'
                      )}
                      title="Preview template"
                    >
                      <Eye className="h-3 w-3" />
                    </ModernButton>
                    <ModernButton 
                      variant="ghost" 
                      size="sm"
                      onClick={() => openTemplateManagement(template)}
                      title="Manage template"
                    >
                      <Settings className="h-3 w-3" />
                    </ModernButton>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-4" />
              <p className="text-sm font-medium mb-2">No custom templates created yet</p>
              <p className="text-xs mb-4">Create custom templates to personalize your documents</p>
              <ModernButton 
                variant="outline" 
                size="sm"
                onClick={() => setCreateTemplateDialog(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Create Your First Template
              </ModernButton>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <ModernButton 
          type="submit" 
          disabled={isSubmitting}
          className="min-w-32"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </ModernButton>
      </div>
      
      {/* Template Preview Modal */}
      <TemplatePreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal(prev => ({ ...prev, isOpen: false }))}
        templateId={previewModal.templateId}
        templateType={previewModal.templateType}
      />
      
      {/* Create Template Dialog */}
      <CreateTemplateDialog
        isOpen={createTemplateDialog}
        onClose={() => setCreateTemplateDialog(false)}
        onTemplateCreated={handleTemplateCreated}
        companySettingsId={settings?.id || ''}
      />
      
      {/* Template Management Dialog */}
      <TemplateManagementDialog
        isOpen={managementDialog.isOpen}
        onClose={() => setManagementDialog({ isOpen: false, template: null })}
        template={managementDialog.template}
        onTemplateUpdated={handleTemplateUpdated}
        onTemplateDeleted={handleTemplateDeleted}
      />
    </form>
  );
}
