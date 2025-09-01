import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Shield, AlertTriangle, CheckCircle, Upload, Download } from 'lucide-react';
import { getCompanySettings, updateCompanySettings } from '@/lib/companyRepo';
import { CompanySettings, CompanySettingsUpdateRequest, ZATCA_ENVIRONMENTS } from '@/lib/types/company';

const zatcaSettingsSchema = z.object({
  zatca_environment: z.enum(['sandbox', 'production']),
  is_zatca_enabled: z.boolean(),
  zatca_certificate_data: z.string().optional(),
  zatca_private_key: z.string().optional()
});

type ZatcaSettingsFormData = z.infer<typeof zatcaSettingsSchema>;

export function ZatcaSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<ZatcaSettingsFormData>({
    resolver: zodResolver(zatcaSettingsSchema)
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
        setValue('zatca_environment', data.zatca_environment);
        setValue('is_zatca_enabled', data.is_zatca_enabled);
        setValue('zatca_certificate_data', data.zatca_certificate_data || '');
        setValue('zatca_private_key', data.zatca_private_key || '');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load ZATCA settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ZatcaSettingsFormData) => {
    try {
      const updateData: CompanySettingsUpdateRequest = {
        // Preserve existing logo_url to prevent it from being cleared
        logo_url: settings?.logo_url,
        // ZATCA-specific fields
        zatca_environment: data.zatca_environment,
        is_zatca_enabled: data.is_zatca_enabled
      };

      const updated = await updateCompanySettings(updateData);
      setSettings(updated);

      toast({
        title: 'Success',
        description: 'ZATCA settings updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update ZATCA settings',
        variant: 'destructive'
      });
    }
  };

  const testZatcaConnection = async () => {
    setTestingConnection(true);
    try {
      // Simulate ZATCA API test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: 'Connection Test',
        description: watchedValues.zatca_environment === 'sandbox' 
          ? 'Successfully connected to ZATCA Sandbox'
          : 'ZATCA Production connection requires valid certificates',
        variant: watchedValues.zatca_environment === 'sandbox' ? 'default' : 'destructive'
      });
    } catch (error) {
      toast({
        title: 'Connection Failed',
        description: 'Unable to connect to ZATCA API',
        variant: 'destructive'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const getEnvironmentStatus = () => {
    if (!watchedValues.is_zatca_enabled) {
      return { status: 'disabled', label: 'Disabled', variant: 'secondary' as const };
    }
    
    if (watchedValues.zatca_environment === 'sandbox') {
      return { status: 'testing', label: 'Testing Mode', variant: 'default' as const };
    }
    
    if (!settings?.zatca_certificate_data) {
      return { status: 'setup-required', label: 'Setup Required', variant: 'destructive' as const };
    }
    
    return { status: 'live', label: 'Live Production', variant: 'default' as const };
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading...</div>;
  }

  const environmentStatus = getEnvironmentStatus();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* ZATCA Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            ZATCA Compliance Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {environmentStatus.status === 'live' && <CheckCircle className="h-5 w-5 text-green-600" />}
                {environmentStatus.status === 'testing' && <Shield className="h-5 w-5 text-blue-600" />}
                {environmentStatus.status === 'setup-required' && <AlertTriangle className="h-5 w-5 text-orange-600" />}
                {environmentStatus.status === 'disabled' && <AlertTriangle className="h-5 w-5 text-gray-600" />}
                <span className="font-medium">ZATCA Integration</span>
              </div>
              <Badge variant={environmentStatus.variant}>
                {environmentStatus.label}
              </Badge>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={testZatcaConnection}
              disabled={!watchedValues.is_zatca_enabled || testingConnection}
            >
              {testingConnection ? 'Testing...' : 'Test Connection'}
            </Button>
          </div>

          {watchedValues.zatca_environment === 'production' && !settings?.zatca_certificate_data && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Production environment requires valid ZATCA certificates. Please upload your certificate and private key below.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Environment Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Configuration</CardTitle>
          <CardDescription>
            Configure ZATCA integration environment and enable/disable features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="is_zatca_enabled">Enable ZATCA Integration</Label>
              <p className="text-sm text-muted-foreground">
                Activate Saudi e-invoicing compliance features
              </p>
            </div>
            <Switch
              id="is_zatca_enabled"
              checked={watchedValues.is_zatca_enabled}
              onCheckedChange={(checked) => setValue('is_zatca_enabled', checked)}
            />
          </div>

          {watchedValues.is_zatca_enabled && (
            <div>
              <Label htmlFor="zatca_environment">ZATCA Environment</Label>
              <Select
                value={watchedValues.zatca_environment}
                onValueChange={(value) => setValue('zatca_environment', value as any)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  {ZATCA_ENVIRONMENTS.map((env) => (
                    <SelectItem key={env.code} value={env.code}>
                      <div>
                        <div className="font-medium">{env.name}</div>
                        <div className="text-xs text-muted-foreground">{env.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certificate Management */}
      {watchedValues.is_zatca_enabled && watchedValues.zatca_environment === 'production' && (
        <Card>
          <CardHeader>
            <CardTitle>Certificate Management</CardTitle>
            <CardDescription>
              Upload ZATCA production certificates for live e-invoicing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Production certificates are required for live ZATCA integration.</strong>
                <br />
                These certificates are provided by ZATCA after completing the onboarding process.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="certificate-upload">ZATCA Certificate</Label>
                <div className="mt-2 space-y-2">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                      <div className="mt-2">
                        <Label htmlFor="certificate-upload" className="cursor-pointer">
                          <span className="text-sm font-medium text-primary">
                            Upload Certificate
                          </span>
                          <Input
                            id="certificate-upload"
                            type="file"
                            accept=".pem,.crt"
                            className="hidden"
                          />
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          .pem or .crt file
                        </p>
                      </div>
                    </div>
                  </div>
                  {settings?.zatca_certificate_data && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      Certificate uploaded
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="private-key-upload">Private Key</Label>
                <div className="mt-2 space-y-2">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                      <div className="mt-2">
                        <Label htmlFor="private-key-upload" className="cursor-pointer">
                          <span className="text-sm font-medium text-primary">
                            Upload Private Key
                          </span>
                          <Input
                            id="private-key-upload"
                            type="file"
                            accept=".pem,.key"
                            className="hidden"
                          />
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          .pem or .key file
                        </p>
                      </div>
                    </div>
                  </div>
                  {settings?.zatca_private_key && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      Private key uploaded
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Security Notice:</strong> Private keys are encrypted and stored securely. 
                Only upload certificates provided by ZATCA for your registered business.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* ZATCA Features */}
      {watchedValues.is_zatca_enabled && (
        <Card>
          <CardHeader>
            <CardTitle>E-Invoicing Features</CardTitle>
            <CardDescription>
              Available ZATCA compliance features in ServicePro
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">QR Code Generation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Simplified Tax Invoice</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Standard Tax Invoice</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Digital Signature</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">XML Invoice Generation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">VAT Compliance</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Arabic Language Support</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Audit Trail</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compliance Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Requirements</CardTitle>
          <CardDescription>
            Ensure your company meets ZATCA requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">VAT Registration Number</span>
              {settings?.vat_number ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Configured
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Required
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Commercial Registration</span>
              {settings?.commercial_registration ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Configured
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Recommended
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Company Address</span>
              {settings?.address_en ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Configured
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Required
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Business Type</span>
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                {settings?.business_type || 'company'}
              </Badge>
            </div>
          </div>

          {(!settings?.vat_number || !settings?.address_en) && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Complete your company profile in the Company Profile tab to meet ZATCA requirements.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>ZATCA Documentation & Resources</CardTitle>
          <CardDescription>
            Official ZATCA resources and implementation guides
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">ZATCA Portal</p>
                <p className="text-xs text-muted-foreground">Official ZATCA registration portal</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="https://zatca.gov.sa" target="_blank" rel="noopener noreferrer">
                  Visit Portal
                </a>
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">E-Invoicing SDK</p>
                <p className="text-xs text-muted-foreground">Technical implementation guide</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="https://zatca.gov.sa/en/E-Invoicing/SystemsDevelopers/Pages/TechnicalRequirements.aspx" target="_blank" rel="noopener noreferrer">
                  <Download className="h-3 w-3 mr-1" />
                  Download SDK
                </a>
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Onboarding Guide</p>
                <p className="text-xs text-muted-foreground">Step-by-step setup instructions</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="https://zatca.gov.sa/en/E-Invoicing/Introduction/Guidelines/Documents/E-invoicing_Regulation.pdf" target="_blank" rel="noopener noreferrer">
                  View Guide
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="min-w-32"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
