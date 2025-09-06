import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ModernButton } from '@/components/ui/modern-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Calculator, Info, Percent } from 'lucide-react';
import { getCompanySettings, updateCompanySettings } from '@/lib/companyRepo';
import { CompanySettings, CompanySettingsUpdateRequest } from '@/lib/types/company';

const taxSettingsSchema = z.object({
  default_vat_rate: z.number().min(0).max(1, 'VAT rate must be between 0 and 100%'),
  tax_registration_name: z.string().optional(),
  tax_registration_address: z.string().optional()
});

type TaxSettingsFormData = z.infer<typeof taxSettingsSchema>;

export function TaxSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<TaxSettingsFormData>({
    resolver: zodResolver(taxSettingsSchema),
    defaultValues: {
      default_vat_rate: 0.15,
      tax_registration_name: '',
      tax_registration_address: ''
    }
  });

  const watchedValues = watch();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await getCompanySettings();
      setSettings(data);
      
      if (data) {
        setValue('default_vat_rate', data.default_vat_rate);
        setValue('tax_registration_name', data.tax_registration_name || '');
        setValue('tax_registration_address', data.tax_registration_address || '');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load tax settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: TaxSettingsFormData) => {
    try {
      const updateData: CompanySettingsUpdateRequest = {
        // Preserve existing logo_url to prevent it from being cleared
        logo_url: settings?.logo_url,
        // Tax-specific fields
        default_vat_rate: data.default_vat_rate,
        // Clean empty strings
        tax_registration_name: data.tax_registration_name || null,
        tax_registration_address: data.tax_registration_address || null
      };

      const updated = await updateCompanySettings(updateData);
      setSettings(updated);

      toast({
        title: 'Success',
        description: 'Tax settings updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update tax settings',
        variant: 'destructive'
      });
    }
  };

  const formatVATPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* VAT Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            VAT Configuration
          </CardTitle>
          <CardDescription>
            Configure Value Added Tax rates and settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Saudi Arabia Standard VAT Rate:</strong> 15% (0.15)
              <br />
              This rate applies to most goods and services in Saudi Arabia.
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="default_vat_rate">Default VAT Rate</Label>
            <div className="flex items-center gap-2 mt-1">
              <div className="relative flex-1">
                <Input
                  id="default_vat_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  {...register('default_vat_rate', { valueAsNumber: true })}
                  placeholder="0.15"
                />
                <Percent className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
              <Badge variant="outline" className="min-w-16">
                {watchedValues.default_vat_rate ? formatVATPercentage(watchedValues.default_vat_rate) : '0%'}
              </Badge>
            </div>
            {errors.default_vat_rate && (
              <p className="text-sm text-red-600 mt-1">{errors.default_vat_rate.message}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Enter as decimal (0.15 for 15%, 0.05 for 5%)
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setValue('default_vat_rate', 0.15)}
            >
              Saudi Standard (15%)
            </ModernButton>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setValue('default_vat_rate', 0.05)}
            >
              Reduced Rate (5%)
            </ModernButton>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setValue('default_vat_rate', 0)}
            >
              Zero Rate (0%)
            </ModernButton>
          </div>
        </CardContent>
      </Card>

      {/* Tax Registration Details */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Registration Details</CardTitle>
          <CardDescription>
            Optional tax registration information for invoices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="tax_registration_name">Tax Registration Name</Label>
            <Input
              id="tax_registration_name"
              {...register('tax_registration_name')}
              placeholder="Company Name for Tax Documents"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Name as it appears on tax registration (if different from company name)
            </p>
          </div>

          <div>
            <Label htmlFor="tax_registration_address">Tax Registration Address</Label>
            <Input
              id="tax_registration_address"
              {...register('tax_registration_address')}
              placeholder="Registered address for tax purposes"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Address as it appears on tax registration (if different from company address)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Current Tax Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Current Tax Configuration</CardTitle>
          <CardDescription>
            Summary of your current tax settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Default VAT Rate:</span>
                <Badge variant="outline">
                  {settings?.default_vat_rate ? formatVATPercentage(settings.default_vat_rate) : '0%'}
                </Badge>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm font-medium">VAT Number:</span>
                <span className="text-sm text-muted-foreground">
                  {settings?.vat_number || 'Not set'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm font-medium">ZATCA Enabled:</span>
                <Badge variant={settings?.is_zatca_enabled ? 'default' : 'secondary'}>
                  {settings?.is_zatca_enabled ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Environment:</span>
                <Badge variant={settings?.zatca_environment === 'production' ? 'default' : 'secondary'}>
                  {settings?.zatca_environment === 'production' ? 'Production' : 'Sandbox'}
                </Badge>
              </div>

              <div className="flex justify-between">
                <span className="text-sm font-medium">Tax Reg. Name:</span>
                <span className="text-sm text-muted-foreground">
                  {settings?.tax_registration_name || 'Same as company'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm font-medium">Tax Reg. Address:</span>
                <span className="text-sm text-muted-foreground">
                  {settings?.tax_registration_address || 'Same as company'}
                </span>
              </div>
            </div>
          </div>
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
    </form>
  );
}
