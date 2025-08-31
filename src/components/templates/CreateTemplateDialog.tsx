import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FileText, Plus, Settings, Palette } from 'lucide-react';
import { createCompanyTemplate } from '@/lib/companyRepo';
import { CompanyTemplate } from '@/lib/types/company';

const createTemplateSchema = z.object({
  template_name: z.string().min(1, 'Template name is required'),
  template_type: z.enum(['quote', 'invoice', 'email'], { required_error: 'Template type is required' }),
  description: z.string().optional(),
  is_default: z.boolean().default(false),
  
  // Template styling options
  header_style: z.enum(['standard', 'modern', 'minimal']).default('standard'),
  color_scheme: z.enum(['default', 'blue', 'green', 'purple', 'custom']).default('default'),
  custom_primary_color: z.string().optional(),
  custom_secondary_color: z.string().optional(),
  
  // Layout options
  include_logo: z.boolean().default(true),
  include_company_details: z.boolean().default(true),
  include_customer_details: z.boolean().default(true),
  include_terms: z.boolean().default(false),
  include_signature: z.boolean().default(false),
  
  // Content options
  custom_footer: z.string().optional(),
  custom_css: z.string().optional(),
  watermark_text: z.string().optional(),
});

type CreateTemplateFormData = z.infer<typeof createTemplateSchema>;

interface CreateTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateCreated: (template: CompanyTemplate) => void;
  companySettingsId: string;
}

const COLOR_SCHEMES = {
  default: { primary: '#000000', secondary: '#666666', name: 'Classic Black' },
  blue: { primary: '#2563EB', secondary: '#64748B', name: 'Professional Blue' },
  green: { primary: '#059669', secondary: '#6B7280', name: 'Success Green' },
  purple: { primary: '#7C3AED', secondary: '#6B7280', name: 'Royal Purple' },
  custom: { primary: '#000000', secondary: '#666666', name: 'Custom Colors' }
};

const HEADER_STYLES = {
  standard: 'Traditional business header with logo and company info',
  modern: 'Contemporary design with gradient background',
  minimal: 'Clean, text-only header design'
};

export function CreateTemplateDialog({ 
  isOpen, 
  onClose, 
  onTemplateCreated,
  companySettingsId 
}: CreateTemplateDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<CreateTemplateFormData>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: {
      template_type: 'quote',
      header_style: 'standard',
      color_scheme: 'default',
      include_logo: true,
      include_company_details: true,
      include_customer_details: true,
      include_terms: false,
      include_signature: false,
      is_default: false
    }
  });

  const watchedValues = watch();

  const onSubmit = async (data: CreateTemplateFormData) => {
    setIsSubmitting(true);
    try {
      // Build template data object
      const colorScheme = COLOR_SCHEMES[data.color_scheme];
      const templateData = {
        // Basic settings
        name: data.template_name,
        type: data.template_type,
        description: data.description,
        
        // Styling
        header_style: data.header_style,
        colors: {
          primary: data.color_scheme === 'custom' ? data.custom_primary_color : colorScheme.primary,
          secondary: data.color_scheme === 'custom' ? data.custom_secondary_color : colorScheme.secondary,
          scheme: data.color_scheme
        },
        
        // Layout options
        layout: {
          include_logo: data.include_logo,
          include_company_details: data.include_company_details,
          include_customer_details: data.include_customer_details,
          include_terms: data.include_terms,
          include_signature: data.include_signature
        },
        
        // Content
        content: {
          custom_footer: data.custom_footer || null,
          watermark_text: data.watermark_text || null,
          custom_css: data.custom_css || null
        },
        
        // Metadata
        created_at: new Date().toISOString(),
        version: '1.0'
      };

      const newTemplate: Omit<CompanyTemplate, 'id' | 'created_at' | 'updated_at'> = {
        company_settings_id: companySettingsId,
        template_type: data.template_type,
        template_name: data.template_name,
        template_data: templateData,
        is_default: data.is_default,
        is_active: true
      };

      const createdTemplate = await createCompanyTemplate(newTemplate);
      
      toast({
        title: 'Success',
        description: `Template "${data.template_name}" created successfully`,
      });

      onTemplateCreated(createdTemplate);
      reset();
      onClose();
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: 'Error',
        description: 'Failed to create template. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Custom Template
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
              <CardDescription>Template name and type</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="template_name">Template Name *</Label>
                <Input
                  id="template_name"
                  {...register('template_name')}
                  placeholder="My Custom Template"
                />
                {errors.template_name && (
                  <p className="text-sm text-red-600 mt-1">{errors.template_name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="template_type">Template Type *</Label>
                <Select
                  value={watchedValues.template_type}
                  onValueChange={(value) => setValue('template_type', value as 'quote' | 'invoice' | 'email')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quote">Quote Template</SelectItem>
                    <SelectItem value="invoice">Invoice Template</SelectItem>
                    <SelectItem value="email">Email Template</SelectItem>
                  </SelectContent>
                </Select>
                {errors.template_type && (
                  <p className="text-sm text-red-600 mt-1">{errors.template_type.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Brief description of this template..."
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is_default">Set as Default Template</Label>
                  <p className="text-sm text-muted-foreground">
                    Use this template as default for new {watchedValues.template_type}s
                  </p>
                </div>
                <Switch
                  id="is_default"
                  checked={watchedValues.is_default}
                  onCheckedChange={(checked) => setValue('is_default', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Design & Layout */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Design & Layout
              </CardTitle>
              <CardDescription>Visual styling and layout options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="header_style">Header Style</Label>
                <Select
                  value={watchedValues.header_style}
                  onValueChange={(value) => setValue('header_style', value as 'standard' | 'modern' | 'minimal')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(HEADER_STYLES).map(([key, description]) => (
                      <SelectItem key={key} value={key}>
                        <div>
                          <div className="font-medium capitalize">{key}</div>
                          <div className="text-xs text-muted-foreground">{description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="color_scheme">Color Scheme</Label>
                <Select
                  value={watchedValues.color_scheme}
                  onValueChange={(value) => setValue('color_scheme', value as keyof typeof COLOR_SCHEMES)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(COLOR_SCHEMES).map(([key, scheme]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <div 
                              className="w-3 h-3 rounded"
                              style={{ backgroundColor: scheme.primary }}
                            />
                            <div 
                              className="w-3 h-3 rounded"
                              style={{ backgroundColor: scheme.secondary }}
                            />
                          </div>
                          <span>{scheme.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {watchedValues.color_scheme === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="custom_primary_color">Primary Color</Label>
                    <Input
                      id="custom_primary_color"
                      type="color"
                      {...register('custom_primary_color')}
                      className="h-10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="custom_secondary_color">Secondary Color</Label>
                    <Input
                      id="custom_secondary_color"
                      type="color"
                      {...register('custom_secondary_color')}
                      className="h-10"
                    />
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <Label>Layout Elements</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="include_logo" className="text-sm">Include Logo</Label>
                    <Switch
                      id="include_logo"
                      checked={watchedValues.include_logo}
                      onCheckedChange={(checked) => setValue('include_logo', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="include_company_details" className="text-sm">Company Details</Label>
                    <Switch
                      id="include_company_details"
                      checked={watchedValues.include_company_details}
                      onCheckedChange={(checked) => setValue('include_company_details', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="include_customer_details" className="text-sm">Customer Details</Label>
                    <Switch
                      id="include_customer_details"
                      checked={watchedValues.include_customer_details}
                      onCheckedChange={(checked) => setValue('include_customer_details', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="include_terms" className="text-sm">Terms & Conditions</Label>
                    <Switch
                      id="include_terms"
                      checked={watchedValues.include_terms}
                      onCheckedChange={(checked) => setValue('include_terms', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="include_signature" className="text-sm">Signature Section</Label>
                    <Switch
                      id="include_signature"
                      checked={watchedValues.include_signature}
                      onCheckedChange={(checked) => setValue('include_signature', checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Custom Content */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Custom Content
              </CardTitle>
              <CardDescription>Additional customization options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="custom_footer">Custom Footer Text</Label>
                <Textarea
                  id="custom_footer"
                  {...register('custom_footer')}
                  placeholder="Thank you for your business! | Contact: info@company.com"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="watermark_text">Watermark Text</Label>
                <Input
                  id="watermark_text"
                  {...register('watermark_text')}
                  placeholder="DRAFT, CONFIDENTIAL, etc."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional watermark text to display on the document
                </p>
              </div>

              <div>
                <Label htmlFor="custom_css">Custom CSS (Advanced)</Label>
                <Textarea
                  id="custom_css"
                  {...register('custom_css')}
                  placeholder="/* Custom styles */&#10;.header { font-size: 18px; }"
                  rows={3}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Advanced: Add custom CSS styles for this template
                </p>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="min-w-32"
            >
              {isSubmitting ? 'Creating...' : 'Create Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}