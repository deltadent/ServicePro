/**
 * Saudi Customer Display Component
 * Display Saudi Arabia specific customer information
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Building, 
  MapPin, 
  CreditCard, 
  Calendar, 
  Shield, 
  Globe,
  Receipt,
  IdCard,
  FileText
} from 'lucide-react';
import { 
  getCustomerDisplayNameArabic, 
  formatSaudiCurrency,
  formatBilingualText,
  validateSaudiVatNumber,
  validateCommercialRegistration,
  validateSaudiId
} from '@/lib/utils/saudi';
import { BUSINESS_TYPES, CUSTOMER_CATEGORIES } from '@/lib/types/saudi';
import type { Customer } from '@/components/CustomerColumns';

interface SaudiCustomerDisplayProps {
  customer: Customer;
  showSensitiveData?: boolean;
}

export function SaudiCustomerDisplay({ customer, showSensitiveData = false }: SaudiCustomerDisplayProps) {
  // Get business type info
  const businessType = BUSINESS_TYPES.find(bt => bt.code === customer.business_type);
  const customerCategory = CUSTOMER_CATEGORIES.find(cc => cc.code === customer.customer_category);

  // Validation status
  const vatValidation = customer.vat_number ? validateSaudiVatNumber(customer.vat_number) : null;
  const crValidation = customer.commercial_registration ? validateCommercialRegistration(customer.commercial_registration) : null;
  const idValidation = customer.saudi_id ? validateSaudiId(customer.saudi_id) : null;

  // Format sensitive data
  const formatSensitiveData = (data: string | undefined | null, visibleChars: number = 4): string => {
    if (!data) return 'Not provided';
    if (showSensitiveData) return data;
    if (data.length <= visibleChars) return data;
    return `${data.substring(0, visibleChars)}${'*'.repeat(data.length - visibleChars)}`;
  };

  // Only show if customer has Saudi data
  const hasSaudiData = customer.vat_number || customer.commercial_registration || 
                      customer.saudi_id || customer.arabic_name || customer.region ||
                      customer.business_type || customer.customer_category;

  if (!hasSaudiData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Saudi Arabia Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No Saudi market information available</p>
            <p className="text-sm">Add Saudi business details to enable ZATCA compliance</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Saudi Arabia Information
          {customer.preferred_language === 'ar' && (
            <Badge variant="secondary">العربية</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Arabic Name & Language */}
        {customer.arabic_name && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Arabic Name</span>
            </div>
            <p className="text-right text-lg" dir="rtl">{customer.arabic_name}</p>
            <p className="text-sm text-muted-foreground mt-1">
              For official documents and ZATCA compliance
            </p>
          </div>
        )}

        {/* Business Type & Category */}
        {(customer.business_type || customer.customer_category) && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Business Classification</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {businessType && (
                <div>
                  <Label className="text-xs text-muted-foreground">Business Type</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className="mr-2">
                      {businessType.name_en}
                    </Badge>
                    <span className="text-sm" dir="rtl">{businessType.name_ar}</span>
                    {businessType.requires_vat && (
                      <Badge variant="secondary" className="ml-2 text-xs">VAT Required</Badge>
                    )}
                  </div>
                </div>
              )}
              {customerCategory && (
                <div>
                  <Label className="text-xs text-muted-foreground">Customer Category</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className="mr-2">
                      {customerCategory.name_en}
                    </Badge>
                    <span className="text-sm" dir="rtl">{customerCategory.name_ar}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Registration Numbers */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <IdCard className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Registration Information</span>
          </div>
          <div className="space-y-3">
            {customer.vat_number && (
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs text-muted-foreground">VAT Registration Number</Label>
                  <p className="font-mono text-sm">{formatSensitiveData(customer.vat_number, 6)}</p>
                </div>
                {vatValidation && (
                  <Badge variant={vatValidation.isValid ? "default" : "destructive"} className="text-xs">
                    {vatValidation.isValid ? '✓ Valid' : '✗ Invalid'}
                  </Badge>
                )}
              </div>
            )}
            
            {customer.commercial_registration && (
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs text-muted-foreground">Commercial Registration</Label>
                  <p className="font-mono text-sm">{formatSensitiveData(customer.commercial_registration, 4)}</p>
                </div>
                {crValidation && (
                  <Badge variant={crValidation.isValid ? "default" : "destructive"} className="text-xs">
                    {crValidation.isValid ? '✓ Valid' : '✗ Invalid'}
                  </Badge>
                )}
              </div>
            )}
            
            {customer.saudi_id && (
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Saudi ID {idValidation?.type && `(${idValidation.type === 'citizen' ? 'Citizen' : 'Resident'})`}
                  </Label>
                  <p className="font-mono text-sm">{formatSensitiveData(customer.saudi_id, 4)}</p>
                </div>
                {idValidation && (
                  <Badge variant={idValidation.isValid ? "default" : "destructive"} className="text-xs">
                    {idValidation.isValid ? '✓ Valid' : '✗ Invalid'}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Location */}
        {customer.region && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Location</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{customer.region}</Badge>
              <span className="text-sm text-muted-foreground">Saudi Arabia</span>
            </div>
            {customer.arabic_address && (
              <div className="mt-2">
                <Label className="text-xs text-muted-foreground">Arabic Address</Label>
                <p className="text-sm mt-1 text-right" dir="rtl">{customer.arabic_address}</p>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Financial Information */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Financial Settings</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Credit Limit</Label>
              <p className="text-sm font-semibold">
                {formatSaudiCurrency(customer.credit_limit || 0)}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Payment Terms</Label>
              <p className="text-sm">
                {customer.payment_terms_days || 30} days
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {customer.tax_exempt && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                <Shield className="w-3 h-3 mr-1" />
                Tax Exempt
              </Badge>
            )}
          </div>
        </div>

        {/* ZATCA Compliance Status */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">ZATCA Compliance</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs">VAT Registration</span>
              {customer.vat_number ? (
                <Badge variant="default" className="text-xs">✓ Registered</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">Not Required</Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs">Arabic Name</span>
              {customer.arabic_name ? (
                <Badge variant="default" className="text-xs">✓ Available</Badge>
              ) : (
                <Badge variant="outline" className="text-xs">Missing</Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs">Business Registration</span>
              {customer.commercial_registration ? (
                <Badge variant="default" className="text-xs">✓ Registered</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">Not Required</Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Label component since it wasn't imported
const Label = ({ className, children, ...props }: any) => (
  <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className || ''}`} {...props}>
    {children}
  </label>
);