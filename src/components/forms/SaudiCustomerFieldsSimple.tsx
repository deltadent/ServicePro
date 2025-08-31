/**
 * Saudi Customer Fields Component - Simple Version
 * Form fields for Saudi Arabia specific customer data without react-hook-form
 */

import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
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

interface SaudiCustomerFieldsSimpleProps {
  formData: any;
  setFormData: (data: any) => void;
  customerType: 'residential' | 'commercial';
}

export function SaudiCustomerFieldsSimple({ formData, setFormData, customerType }: SaudiCustomerFieldsSimpleProps) {
  const [vatValidation, setVatValidation] = useState<{ isValid: boolean; message: string } | null>(null);
  const [crValidation, setCrValidation] = useState<{ isValid: boolean; message: string } | null>(null);
  const [idValidation, setIdValidation] = useState<{ isValid: boolean; message: string; type?: string } | null>(null);

  // Validate fields in real-time
  useEffect(() => {
    if (formData.vat_number) {
      const validation = validateSaudiVatNumber(formData.vat_number);
      setVatValidation(validation);
    } else {
      setVatValidation(null);
    }
  }, [formData.vat_number]);

  useEffect(() => {
    if (formData.commercial_registration) {
      const validation = validateCommercialRegistration(formData.commercial_registration);
      setCrValidation(validation);
    } else {
      setCrValidation(null);
    }
  }, [formData.commercial_registration]);

  useEffect(() => {
    if (formData.saudi_id) {
      const validation = validateSaudiId(formData.saudi_id);
      setIdValidation(validation);
    } else {
      setIdValidation(null);
    }
  }, [formData.saudi_id]);

  // Get business requirements
  const businessRequirements = getBusinessValidationRequirements(formData.business_type);
  const needsVatRegistration = requiresVatRegistration(formData.business_type);
  const creditLimitValidation = validateCreditLimit(formData.credit_limit || 0, formData.business_type);

  // Helper function to update form data
  const updateField = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  // Only show Saudi fields for commercial customers or if specifically requested
  if (customerType === 'residential' && formData.customer_type === 'residential') {
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
            <div>
              <Label htmlFor="saudi_id">Saudi ID / Iqama Number</Label>
              <Input 
                id="saudi_id"
                placeholder="e.g., 1234567890" 
                value={formData.saudi_id || ''}
                onChange={(e) => updateField('saudi_id', e.target.value)}
              />
              {idValidation && (
                <div className={`flex items-center gap-2 text-sm mt-1 ${idValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                  {idValidation.isValid ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  {idValidation.message}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="region">Region</Label>
              <Select value={formData.region || ''} onValueChange={(value) => updateField('region', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {SAUDI_REGIONS.map((region) => (
                    <SelectItem key={region.code} value={region.name_en}>
                      {region.name_en} ({region.name_ar})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="arabic_name">Name in Arabic (Optional)</Label>
            <Input 
              id="arabic_name"
              placeholder="الاسم باللغة العربية" 
              value={formData.arabic_name || ''}
              onChange={(e) => updateField('arabic_name', e.target.value)}
              dir="rtl"
            />
          </div>

          <div>
            <Label htmlFor="preferred_language">Preferred Language</Label>
            <Select value={formData.preferred_language || 'en'} onValueChange={(value) => updateField('preferred_language', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">Arabic (العربية)</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
        {formData.business_type && (
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
        <div>
          <Label htmlFor="business_type">Business Type *</Label>
          <Select value={formData.business_type || ''} onValueChange={(value) => updateField('business_type', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select business type" />
            </SelectTrigger>
            <SelectContent>
              {BUSINESS_TYPES.map((type) => (
                <SelectItem key={type.code} value={type.code}>
                  <div className="flex items-center gap-2">
                    {type.name_en} ({type.name_ar})
                    {type.requires_vat && <Badge variant="secondary" className="text-xs">VAT Required</Badge>}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Registration Numbers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {needsVatRegistration && (
            <div>
              <Label htmlFor="vat_number">VAT Registration Number *</Label>
              <Input 
                id="vat_number"
                placeholder="3XXXXXXXXXXXXX03" 
                value={formData.vat_number || ''}
                onChange={(e) => updateField('vat_number', e.target.value)}
                maxLength={15}
              />
              {vatValidation && (
                <div className={`flex items-center gap-2 text-sm mt-1 ${vatValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                  {vatValidation.isValid ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  {vatValidation.message}
                </div>
              )}
              <p className="text-sm text-muted-foreground">15 digits, starts with 3, ends with 03</p>
            </div>
          )}

          {businessRequirements.requires_commercial_registration && (
            <div>
              <Label htmlFor="commercial_registration">Commercial Registration *</Label>
              <Input 
                id="commercial_registration"
                placeholder="1234567890" 
                value={formData.commercial_registration || ''}
                onChange={(e) => updateField('commercial_registration', e.target.value)}
                maxLength={10}
              />
              {crValidation && (
                <div className={`flex items-center gap-2 text-sm mt-1 ${crValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                  {crValidation.isValid ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  {crValidation.message}
                </div>
              )}
              <p className="text-sm text-muted-foreground">10 digits</p>
            </div>
          )}
        </div>

        {/* Saudi ID */}
        {businessRequirements.requires_saudi_id && (
          <div>
            <Label htmlFor="saudi_id">Saudi ID / Iqama Number *</Label>
            <Input 
              id="saudi_id"
              placeholder="1234567890 or 2234567890" 
              value={formData.saudi_id || ''}
              onChange={(e) => updateField('saudi_id', e.target.value)}
              maxLength={10}
            />
            {idValidation && (
              <div className={`flex items-center gap-2 text-sm mt-1 ${idValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                {idValidation.isValid ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {idValidation.message}
                {idValidation.type && (
                  <Badge variant="outline" className="text-xs">
                    {idValidation.type === 'citizen' ? 'Saudi Citizen' : 'Resident'}
                  </Badge>
                )}
              </div>
            )}
            <p className="text-sm text-muted-foreground">10 digits: 1XXXXXXXXX for citizens, 2XXXXXXXXX for residents</p>
          </div>
        )}

        {/* Arabic Names and Address */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="arabic_name">Business Name in Arabic</Label>
            <Input 
              id="arabic_name"
              placeholder="اسم الشركة باللغة العربية" 
              value={formData.arabic_name || ''}
              onChange={(e) => updateField('arabic_name', e.target.value)}
              dir="rtl"
            />
            <p className="text-sm text-muted-foreground">Required for official invoices and documents</p>
          </div>

          <div>
            <Label htmlFor="arabic_address">Address in Arabic</Label>
            <Textarea 
              id="arabic_address"
              placeholder="العنوان باللغة العربية" 
              value={formData.arabic_address || ''}
              onChange={(e) => updateField('arabic_address', e.target.value)}
              dir="rtl"
            />
            <p className="text-sm text-muted-foreground">Arabic address for ZATCA-compliant invoices</p>
          </div>
        </div>

        {/* Business Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="customer_category">Customer Category</Label>
            <Select value={formData.customer_category || ''} onValueChange={(value) => updateField('customer_category', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CUSTOMER_CATEGORIES.map((category) => (
                  <SelectItem key={category.code} value={category.code}>
                    {category.name_en} ({category.name_ar})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="region">Region *</Label>
            <Select value={formData.region || ''} onValueChange={(value) => updateField('region', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                {SAUDI_REGIONS.map((region) => (
                  <SelectItem key={region.code} value={region.name_en}>
                    {region.name_en} ({region.name_ar})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Financial Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="payment_terms_days">Payment Terms (Days)</Label>
            <Input 
              id="payment_terms_days"
              type="number" 
              placeholder={DEFAULT_PAYMENT_TERMS_DAYS.toString()}
              value={formData.payment_terms_days || DEFAULT_PAYMENT_TERMS_DAYS}
              onChange={(e) => updateField('payment_terms_days', parseInt(e.target.value) || DEFAULT_PAYMENT_TERMS_DAYS)}
              min={0}
              max={365}
            />
            <p className="text-sm text-muted-foreground">Number of days for invoice payment</p>
          </div>

          <div>
            <Label htmlFor="credit_limit">Credit Limit (SAR)</Label>
            <Input 
              id="credit_limit"
              type="number" 
              placeholder="0.00"
              value={formData.credit_limit || 0}
              onChange={(e) => updateField('credit_limit', parseFloat(e.target.value) || 0)}
              min={0}
              step={0.01}
            />
            {!creditLimitValidation.isValid && (
              <div className="flex items-center gap-2 text-sm text-red-600 mt-1">
                <AlertTriangle className="w-4 h-4" />
                {creditLimitValidation.message}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Maximum: {formatSaudiCurrency(businessRequirements.max_credit_limit)}
            </p>
          </div>
        </div>

        {/* Tax and Language Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-row items-start space-x-3 space-y-0">
            <Checkbox
              id="tax_exempt"
              checked={formData.tax_exempt || false}
              onCheckedChange={(checked) => updateField('tax_exempt', checked)}
            />
            <div className="space-y-1 leading-none">
              <Label htmlFor="tax_exempt">Tax Exempt</Label>
              <p className="text-sm text-muted-foreground">
                Customer is exempt from VAT (requires documentation)
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="preferred_language">Preferred Language</Label>
            <Select value={formData.preferred_language || 'en'} onValueChange={(value) => updateField('preferred_language', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">Arabic (العربية)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">Language for documents and communications</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}