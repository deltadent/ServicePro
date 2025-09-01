import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Globe, Calendar, Clock, Banknote } from 'lucide-react';
import { getCompanySettings, updateCompanySettings } from '@/lib/companyRepo';
import { 
  CompanySettings, 
  CompanySettingsUpdateRequest, 
  CURRENCY_OPTIONS, 
  DATE_FORMATS, 
  TIME_FORMATS, 
  SUPPORTED_LANGUAGES 
} from '@/lib/types/company';

const regionalSettingsSchema = z.object({
  default_currency: z.string(),
  date_format: z.string(),
  time_format: z.string(),
  timezone: z.string(),
  primary_language: z.enum(['en', 'ar'])
});

type RegionalSettingsFormData = z.infer<typeof regionalSettingsSchema>;

const TIMEZONE_OPTIONS = [
  { code: 'Asia/Riyadh', name: 'Riyadh (UTC+3)', country: 'Saudi Arabia' },
  { code: 'Asia/Dubai', name: 'Dubai (UTC+4)', country: 'UAE' },
  { code: 'Asia/Kuwait', name: 'Kuwait (UTC+3)', country: 'Kuwait' },
  { code: 'Asia/Bahrain', name: 'Bahrain (UTC+3)', country: 'Bahrain' },
  { code: 'Asia/Qatar', name: 'Doha (UTC+3)', country: 'Qatar' },
  { code: 'Europe/London', name: 'London (UTC+0)', country: 'UK' },
  { code: 'America/New_York', name: 'New York (UTC-5)', country: 'USA' }
];

export function RegionalSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting }
  } = useForm<RegionalSettingsFormData>({
    resolver: zodResolver(regionalSettingsSchema),
    defaultValues: {
      default_currency: 'SAR',
      date_format: 'DD/MM/YYYY',
      time_format: '24h',
      timezone: 'Asia/Riyadh',
      primary_language: 'en'
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
        setValue('default_currency', data.default_currency);
        setValue('date_format', data.date_format);
        setValue('time_format', data.time_format);
        setValue('timezone', data.timezone);
        setValue('primary_language', data.primary_language);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load regional settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: RegionalSettingsFormData) => {
    try {
      const updateData: CompanySettingsUpdateRequest = {
        // Preserve existing logo_url to prevent it from being cleared
        logo_url: settings?.logo_url,
        // Regional-specific fields
        default_currency: data.default_currency,
        date_format: data.date_format,
        time_format: data.time_format,
        timezone: data.timezone,
        primary_language: data.primary_language
      };

      const updated = await updateCompanySettings(updateData);
      setSettings(updated);

      toast({
        title: 'Success',
        description: 'Regional settings updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update regional settings',
        variant: 'destructive'
      });
    }
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    const selectedDateFormat = DATE_FORMATS.find(f => f.code === watchedValues.date_format);
    const selectedTimeFormat = TIME_FORMATS.find(f => f.code === watchedValues.time_format);
    
    return {
      date: selectedDateFormat?.example || now.toLocaleDateString(),
      time: selectedTimeFormat?.example || now.toLocaleTimeString()
    };
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading...</div>;
  }

  const currentDateTime = getCurrentDateTime();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Language and Currency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Language and Currency
          </CardTitle>
          <CardDescription>
            Primary language and default currency settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primary_language">Primary Language</Label>
              <Select
                value={watchedValues.primary_language}
                onValueChange={(value) => setValue('primary_language', value as 'en' | 'ar')}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select primary language" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <div className="flex items-center justify-between w-full">
                        <span>{lang.name}</span>
                        <span className="text-sm text-muted-foreground ml-2">{lang.native}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Default language for the interface and documents
              </p>
            </div>

            <div>
              <Label htmlFor="default_currency">Default Currency</Label>
              <Select
                value={watchedValues.default_currency}
                onValueChange={(value) => setValue('default_currency', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select default currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{currency.symbol}</span>
                        <span>{currency.name} ({currency.code})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Default currency for quotes and invoices
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date and Time Formats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Date and Time Formats
          </CardTitle>
          <CardDescription>
            Choose how dates and times are displayed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date_format">Date Format</Label>
              <Select
                value={watchedValues.date_format}
                onValueChange={(value) => setValue('date_format', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select date format" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((format) => (
                    <SelectItem key={format.code} value={format.code}>
                      <div className="flex items-center justify-between w-full">
                        <span>{format.code}</span>
                        <span className="text-sm text-muted-foreground ml-2">{format.example}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="time_format">Time Format</Label>
              <Select
                value={watchedValues.time_format}
                onValueChange={(value) => setValue('time_format', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select time format" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_FORMATS.map((format) => (
                    <SelectItem key={format.code} value={format.code}>
                      <div className="flex items-center justify-between w-full">
                        <span>{format.name}</span>
                        <span className="text-sm text-muted-foreground ml-2">{format.example}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={watchedValues.timezone}
              onValueChange={(value) => setValue('timezone', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz.code} value={tz.code}>
                    <div>
                      <div className="font-medium">{tz.name}</div>
                      <div className="text-xs text-muted-foreground">{tz.country}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Format Preview */}
          <div className="mt-4 p-4 border rounded-lg bg-muted/50">
            <p className="text-sm font-medium mb-2">Format Preview</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span>Date: {currentDateTime.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>Time: {currentDateTime.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <Banknote className="h-3 w-3 text-muted-foreground" />
                <span>
                  Currency: {CURRENCY_OPTIONS.find(c => c.code === watchedValues.default_currency)?.symbol || 'ر.س'} 
                  {watchedValues.default_currency}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-3 w-3 text-muted-foreground" />
                <span>
                  Language: {SUPPORTED_LANGUAGES.find(l => l.code === watchedValues.primary_language)?.native || 'English'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Saudi-Specific Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Saudi Arabia Localization</CardTitle>
          <CardDescription>
            Settings specific to Saudi Arabian business requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Hijri Calendar Support</span>
              <Badge variant="default" className="bg-green-100 text-green-800">
                Enabled
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Arabic Number Formatting</span>
              <Badge variant="default" className="bg-green-100 text-green-800">
                Enabled
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Saudi Business Validation</span>
              <Badge variant="default" className="bg-green-100 text-green-800">
                Enabled
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">ZATCA QR Code Generation</span>
              <Badge variant={settings?.is_zatca_enabled ? 'default' : 'secondary'}>
                {settings?.is_zatca_enabled ? 'Enabled' : 'Disabled'}
              </Badge>
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
