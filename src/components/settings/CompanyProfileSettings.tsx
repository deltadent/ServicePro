import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Building2, Mail, Phone, Globe } from 'lucide-react';
import { getCompanySettings, updateCompanySettings, uploadCompanyLogo, deleteCompanyLogo } from '@/lib/companyRepo';
import { CompanySettings, CompanySettingsUpdateRequest, BUSINESS_ENTITY_TYPES } from '@/lib/types/company';
import { SAUDI_REGIONS } from '@/lib/types/saudi';
import { validateSaudiVatNumber, validateCommercialRegistration } from '@/lib/utils/saudi';

const companyProfileSchema = z.object({
  company_name_en: z.string().min(1, 'Company name in English is required'),
  company_name_ar: z.string().optional(),
  vat_number: z.string().optional(),
  commercial_registration: z.string().optional(),
  business_type: z.enum(['individual', 'establishment', 'company', 'non_profit', 'government']),
  address_en: z.string().optional(),
  address_ar: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  postal_code: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  primary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  secondary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format')
});

type CompanyProfileFormData = z.infer<typeof companyProfileSchema>;

export function CompanyProfileSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<CompanyProfileFormData>({
    resolver: zodResolver(companyProfileSchema)
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
        setValue('company_name_en', data.company_name_en);
        setValue('company_name_ar', data.company_name_ar || '');
        setValue('vat_number', data.vat_number || '');
        setValue('commercial_registration', data.commercial_registration || '');
        setValue('business_type', data.business_type);
        setValue('address_en', data.address_en || '');
        setValue('address_ar', data.address_ar || '');
        setValue('city', data.city || '');
        setValue('region', data.region || '');
        setValue('postal_code', data.postal_code || '');
        setValue('phone', data.phone || '');
        setValue('email', data.email || '');
        setValue('website', data.website || '');
        setValue('primary_color', data.primary_color);
        setValue('secondary_color', data.secondary_color);
      } else {
        console.log('No company settings found in database');
      }
    } catch (error) {
      console.error('Error loading company settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load company settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CompanyProfileFormData) => {
    try {
      // Validate Saudi-specific fields
      if (data.vat_number && data.vat_number.trim()) {
        const vatValidation = validateSaudiVatNumber(data.vat_number);
        if (!vatValidation.isValid) {
          toast({
            title: 'Validation Error',
            description: vatValidation.message,
            variant: 'destructive'
          });
          return;
        }
      }

      if (data.commercial_registration && data.commercial_registration.trim()) {
        const crValidation = validateCommercialRegistration(data.commercial_registration);
        if (!crValidation.isValid) {
          toast({
            title: 'Validation Error',
            description: crValidation.message,
            variant: 'destructive'
          });
          return;
        }
      }

      let logoUrl = settings?.logo_url;

      // Upload new logo if provided
      if (logoFile) {
        setUploading(true);
        try {
          // Delete old logo if exists
          if (settings?.logo_url) {
            await deleteCompanyLogo(settings.logo_url);
          }
          logoUrl = await uploadCompanyLogo(logoFile);
        } catch (error) {
          toast({
            title: 'Error',
            description: 'Failed to upload logo',
            variant: 'destructive'
          });
          return;
        } finally {
          setUploading(false);
        }
      }

      const updateData: CompanySettingsUpdateRequest = {
        ...data,
        logo_url: logoUrl,
        // Clean empty strings
        company_name_ar: data.company_name_ar || null,
        vat_number: data.vat_number || null,
        commercial_registration: data.commercial_registration || null,
        address_en: data.address_en || null,
        address_ar: data.address_ar || null,
        city: data.city || null,
        region: data.region || null,
        postal_code: data.postal_code || null,
        phone: data.phone || null,
        email: data.email || null,
        website: data.website || null
      };

      const updated = await updateCompanySettings(updateData);
      setSettings(updated);
      setLogoFile(null);

      toast({
        title: 'Success',
        description: 'Company profile updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update company profile',
        variant: 'destructive'
      });
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: 'Error',
          description: 'Logo file must be less than 5MB',
          variant: 'destructive'
        });
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Error',
          description: 'Please select an image file',
          variant: 'destructive'
        });
        return;
      }
      
      setLogoFile(file);
    }
  };

  const removeLogo = async () => {
    if (settings?.logo_url) {
      try {
        await deleteCompanyLogo(settings.logo_url);
        const updated = await updateCompanySettings({ logo_url: null });
        setSettings(updated);
        toast({
          title: 'Success',
          description: 'Logo removed successfully'
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to remove logo',
          variant: 'destructive'
        });
      }
    }
    setLogoFile(null);
  };


  if (loading) {
    return <div className="flex justify-center py-8">Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Information
          </CardTitle>
          <CardDescription>
            Basic company details and business registration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company_name_en">Company Name (English) *</Label>
              <Input
                id="company_name_en"
                {...register('company_name_en')}
                placeholder="ServicePro"
              />
              {errors.company_name_en && (
                <p className="text-sm text-red-600 mt-1">{errors.company_name_en.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="company_name_ar">Company Name (Arabic)</Label>
              <Input
                id="company_name_ar"
                {...register('company_name_ar')}
                placeholder="سيرفيس برو"
                dir="rtl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="business_type">Business Type</Label>
              <Select
                value={watchedValues.business_type}
                onValueChange={(value) => setValue('business_type', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_ENTITY_TYPES.map((type) => (
                    <SelectItem key={type.code} value={type.code}>
                      <div className="flex items-center justify-between w-full">
                        <span>{type.name_en}</span>
                        <span className="text-sm text-muted-foreground ml-2">{type.name_ar}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="vat_number">VAT Number</Label>
              <Input
                id="vat_number"
                {...register('vat_number')}
                placeholder="300000000000003"
              />
              {errors.vat_number && (
                <p className="text-sm text-red-600 mt-1">{errors.vat_number.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="commercial_registration">Commercial Registration</Label>
              <Input
                id="commercial_registration"
                {...register('commercial_registration')}
                placeholder="1010000000"
              />
              {errors.commercial_registration && (
                <p className="text-sm text-red-600 mt-1">{errors.commercial_registration.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>
            Company contact details and location
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="address_en">Address (English)</Label>
              <Textarea
                id="address_en"
                {...register('address_en')}
                placeholder="123 Business Street, Business District"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="address_ar">Address (Arabic)</Label>
              <Textarea
                id="address_ar"
                {...register('address_ar')}
                placeholder="123 شارع الأعمال، الحي التجاري"
                dir="rtl"
                rows={3}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                {...register('city')}
                placeholder="Riyadh"
              />
            </div>

            <div>
              <Label htmlFor="region">Region</Label>
              <Select
                value={watchedValues.region}
                onValueChange={(value) => setValue('region', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {SAUDI_REGIONS.map((region) => (
                    <SelectItem key={region.code} value={region.code}>
                      <div className="flex items-center justify-between w-full">
                        <span>{region.name_en}</span>
                        <span className="text-sm text-muted-foreground ml-2">{region.name_ar}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="postal_code">Postal Code</Label>
              <Input
                id="postal_code"
                {...register('postal_code')}
                placeholder="11564"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="+966501234567"
                  className="pl-10"
                />
              </div>
              {errors.phone && (
                <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  {...register('email')}
                  placeholder="info@company.sa"
                  className="pl-10"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="website"
                  {...register('website')}
                  placeholder="https://company.sa"
                  className="pl-10"
                />
              </div>
              {errors.website && (
                <p className="text-sm text-red-600 mt-1">{errors.website.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle>Company Branding</CardTitle>
          <CardDescription>
            Logo and brand colors for documents and interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo Upload */}
          <div>
            <Label>Company Logo</Label>
            <div className="mt-2">
              {(settings?.logo_url || logoFile) ? (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={logoFile ? URL.createObjectURL(logoFile) : settings?.logo_url || ''}
                      alt="Company Logo"
                      className="h-16 w-16 object-contain border rounded"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCAyNEg0MFY0MEgyNFYyNFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
                      }}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 p-0"
                      onClick={removeLogo}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {logoFile ? logoFile.name : 'Current logo'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div className="mt-4">
                      <Label htmlFor="logo-upload" className="cursor-pointer">
                        <span className="text-sm font-medium text-primary">Upload a logo</span>
                        <Input
                          id="logo-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG up to 5MB
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Brand Colors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primary_color">Primary Color</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="color"
                  className="w-16 h-10 p-1 border"
                  value={watchedValues.primary_color || '#3B82F6'}
                  onChange={(e) => setValue('primary_color', e.target.value)}
                />
                <Input
                  {...register('primary_color')}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
              </div>
              {errors.primary_color && (
                <p className="text-sm text-red-600 mt-1">{errors.primary_color.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="secondary_color">Secondary Color</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="color"
                  className="w-16 h-10 p-1 border"
                  value={watchedValues.secondary_color || '#64748B'}
                  onChange={(e) => setValue('secondary_color', e.target.value)}
                />
                <Input
                  {...register('secondary_color')}
                  placeholder="#64748B"
                  className="flex-1"
                />
              </div>
              {errors.secondary_color && (
                <p className="text-sm text-red-600 mt-1">{errors.secondary_color.message}</p>
              )}
            </div>
          </div>

          {/* Color Preview */}
          <div className="mt-4 p-4 border rounded-lg">
            <p className="text-sm font-medium mb-2">Brand Preview</p>
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded border"
                style={{ backgroundColor: watchedValues.primary_color }}
              />
              <div 
                className="w-8 h-8 rounded border"
                style={{ backgroundColor: watchedValues.secondary_color }}
              />
              <span className="text-sm text-muted-foreground">
                Your brand colors
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting || uploading}
          className="min-w-32"
        >
          {isSubmitting || uploading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
