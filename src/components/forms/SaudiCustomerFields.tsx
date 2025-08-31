/**
 * Saudi Customer Fields Component
 * Form fields for Saudi Arabia specific customer data
 */

import React, { useEffect, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { 
  validateSaudiVatNumber, 
  validateCommercialRegistration, 
  validateSaudiId,
  getBusinessValidationRequirements,
  validateCreditLimit,
  formatSaudiCurrency,
  requiresVatRegistration
} from '@/lib/utils/saudi';
import { SAUDI_REGIONS, BUSINESS_TYPES, CUSTOMER_CATEGORIES, DEFAULT_PAYMENT_TERMS_DAYS } from '@/lib/types/saudi';
import { getSaudiRegions, getBusinessTypes } from '@/lib/saudiRepo';
import type { Customer } from '@/components/CustomerColumns';

interface SaudiCustomerFieldsProps {
  form: UseFormReturn<Customer>;
  customerType: 'residential' | 'commercial';
  onFieldChange?: (field: string, value: any) => void;
}

export function SaudiCustomerFields({ form, customerType }: SaudiCustomerFieldsProps) {
  const [regions, setRegions] = useState(SAUDI_REGIONS);
  const [businessTypes, setBusinessTypes] = useState(BUSINESS_TYPES);
  const [vatValidation, setVatValidation] = useState<{ isValid: boolean; message: string } | null>(null);
  const [crValidation, setCrValidation] = useState<{ isValid: boolean; message: string } | null>(null);
  const [idValidation, setIdValidation] = useState<{ isValid: boolean; message: string; type?: string } | null>(null);

  const watchedBusinessType = form.watch('business_type');
  const watchedCreditLimit = form.watch('credit_limit');
  const watchedCustomerType = form.watch('customer_type');

  // Load dynamic data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [regionsData, businessTypesData] = await Promise.all([
          getSaudiRegions(),
          getBusinessTypes()
        ]);
        
        if (regionsData.length > 0) {
          setRegions(regionsData.map(r => ({ code: r.code, name_en: r.name_en, name_ar: r.name_ar })));
        }
        
        if (businessTypesData.length > 0) {
          setBusinessTypes(businessTypesData.map(bt => ({ 
            code: bt.type_code, 
            name_en: bt.name_en, 
            name_ar: bt.name_ar, 
            requires_vat: bt.requires_vat_registration 
          })));
        }
      } catch (error) {
        console.error('Error loading Saudi data:', error);
      }
    };

    loadData();
  }, []);

  // Validate fields in real-time
  useEffect(() => {
    const vatNumber = form.getValues('vat_number');
    if (vatNumber) {
      const validation = validateSaudiVatNumber(vatNumber);
      setVatValidation(validation);
    } else {
      setVatValidation(null);
    }
  }, [form.watch('vat_number')]);

  useEffect(() => {
    const crNumber = form.getValues('commercial_registration');
    if (crNumber) {
      const validation = validateCommercialRegistration(crNumber);
      setCrValidation(validation);
    } else {
      setCrValidation(null);
    }
  }, [form.watch('commercial_registration')]);

  useEffect(() => {
    const saudiId = form.getValues('saudi_id');
    if (saudiId) {
      const validation = validateSaudiId(saudiId);
      setIdValidation(validation);
    } else {
      setIdValidation(null);
    }
  }, [form.watch('saudi_id')]);

  // Get business requirements
  const businessRequirements = getBusinessValidationRequirements(watchedBusinessType);
  const needsVatRegistration = requiresVatRegistration(watchedBusinessType);
  const creditLimitValidation = validateCreditLimit(watchedCreditLimit || 0, watchedBusinessType);

  // Only show Saudi fields for commercial customers or if specifically requested
  if (customerType === 'residential' && watchedCustomerType === 'residential') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Saudi Arabia Information
            <Badge variant="secondary">Optional</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="saudi_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Saudi ID / Iqama Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., 1234567890" 
                      {...field} 
                      value={field.value || ''}
                    />
                  </FormControl>
                  {idValidation && (
                    <div className={`flex items-center gap-2 text-sm ${idValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {idValidation.isValid ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      {idValidation.message}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {regions.map((region) => (
                        <SelectItem key={region.code} value={region.name_en}>
                          {region.name_en} ({region.name_ar})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="arabic_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name in Arabic (Optional)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="الاسم باللغة العربية" 
                    {...field} 
                    value={field.value || ''}
                    dir="rtl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="preferred_language"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Language</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || 'en'}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">Arabic (العربية)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Saudi Arabia Business Information
          {customerType === 'commercial' && <Badge variant="default">Required</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Business Type and Requirements Alert */}
        {watchedBusinessType && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>Requirements for {businessRequirements.business_type}:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  {businessRequirements.requires_vat && (
                    <li>VAT Registration Number required</li>
                  )}
                  {businessRequirements.requires_commercial_registration && (
                    <li>Commercial Registration Number required</li>
                  )}
                  {businessRequirements.requires_saudi_id && (
                    <li>Saudi ID or Iqama Number required</li>
                  )}
                  <li>Maximum credit limit: {formatSaudiCurrency(businessRequirements.max_credit_limit)}</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Business Type */}
        <FormField
          control={form.control}
          name="business_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Type *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {businessTypes.map((type) => (
                    <SelectItem key={type.code} value={type.code}>
                      <div className="flex items-center gap-2">
                        {type.name_en} ({type.name_ar})
                        {type.requires_vat && <Badge variant="secondary" className="text-xs">VAT Required</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Registration Numbers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {needsVatRegistration && (
            <FormField
              control={form.control}
              name="vat_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>VAT Registration Number *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="3XXXXXXXXXXXXX03" 
                      {...field} 
                      value={field.value || ''}
                      maxLength={15}
                    />
                  </FormControl>
                  {vatValidation && (
                    <div className={`flex items-center gap-2 text-sm ${vatValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {vatValidation.isValid ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      {vatValidation.message}
                    </div>
                  )}
                  <FormDescription>15 digits, starts with 3, ends with 03</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {businessRequirements.requires_commercial_registration && (
            <FormField
              control={form.control}
              name="commercial_registration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Commercial Registration *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="1234567890" 
                      {...field} 
                      value={field.value || ''}
                      maxLength={10}
                    />
                  </FormControl>
                  {crValidation && (
                    <div className={`flex items-center gap-2 text-sm ${crValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {crValidation.isValid ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      {crValidation.message}
                    </div>
                  )}
                  <FormDescription>10 digits</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Saudi ID */}
        {businessRequirements.requires_saudi_id && (
          <FormField
            control={form.control}
            name="saudi_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Saudi ID / Iqama Number *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="1234567890 or 2234567890" 
                    {...field} 
                    value={field.value || ''}
                    maxLength={10}
                  />
                </FormControl>
                {idValidation && (
                  <div className={`flex items-center gap-2 text-sm ${idValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                    {idValidation.isValid ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    {idValidation.message}
                    {idValidation.type && (
                      <Badge variant="outline" className="text-xs">
                        {idValidation.type === 'citizen' ? 'Saudi Citizen' : 'Resident'}
                      </Badge>
                    )}
                  </div>
                )}
                <FormDescription>10 digits: 1XXXXXXXXX for citizens, 2XXXXXXXXX for residents</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Arabic Names and Address */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="arabic_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business Name in Arabic</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="اسم الشركة باللغة العربية" 
                    {...field} 
                    value={field.value || ''}
                    dir="rtl"
                  />
                </FormControl>
                <FormDescription>Required for official invoices and documents</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="arabic_address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address in Arabic</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="العنوان باللغة العربية" 
                    {...field} 
                    value={field.value || ''}
                    dir="rtl"
                  />
                </FormControl>
                <FormDescription>Arabic address for ZATCA-compliant invoices</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Business Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="customer_category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CUSTOMER_CATEGORIES.map((category) => (
                      <SelectItem key={category.code} value={category.code}>
                        {category.name_en} ({category.name_ar})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="region"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Region *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {regions.map((region) => (
                      <SelectItem key={region.code} value={region.name_en}>
                        {region.name_en} ({region.name_ar})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Financial Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="payment_terms_days"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Terms (Days)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder={DEFAULT_PAYMENT_TERMS_DAYS.toString()}
                    {...field} 
                    value={field.value || DEFAULT_PAYMENT_TERMS_DAYS}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || DEFAULT_PAYMENT_TERMS_DAYS)}
                    min={0}
                    max={365}
                  />
                </FormControl>
                <FormDescription>Number of days for invoice payment</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="credit_limit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Credit Limit (SAR)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="0.00"
                    {...field} 
                    value={field.value || 0}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    min={0}
                    step={0.01}
                  />
                </FormControl>
                {!creditLimitValidation.isValid && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertTriangle className="w-4 h-4" />
                    {creditLimitValidation.message}
                  </div>
                )}
                <FormDescription>
                  Maximum: {formatSaudiCurrency(businessRequirements.max_credit_limit)}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Tax and Language Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tax_exempt"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Tax Exempt</FormLabel>
                  <FormDescription>
                    Customer is exempt from VAT (requires documentation)
                  </FormDescription>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="preferred_language"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Language</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || 'en'}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">Arabic (العربية)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>Language for documents and communications</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}