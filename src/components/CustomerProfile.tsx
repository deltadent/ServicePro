import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { geocodeAddress } from '@/utils/geocode';
import { normalizeToE164Saudi, formatPhoneForDisplay } from '@/lib/phone';
import { useState, useEffect } from 'react';
import { SaudiCustomerFieldsSimple } from '@/components/forms/SaudiCustomerFieldsSimple';
import { validateCustomerRequiredFields } from '@/lib/utils/saudi';
import type { Customer } from '@/components/CustomerColumns';

const CustomerProfile = ({ formData, setFormData, handleSubmit, onCancel }) => {
  const [phoneFeedback, setPhoneFeedback] = useState<{mobile?: string, work?: string}>({});
  const [isPerson, setIsPerson] = useState(!formData.company_name && (formData.first_name || formData.last_name));
  const [saudiValidationErrors, setSaudiValidationErrors] = useState<string[]>([]);

  // Determine if this is a person or company based on filled fields
  useEffect(() => {
    const hasPersonFields = formData.first_name || formData.last_name;
    const hasCompanyField = formData.company_name;
    setIsPerson(hasPersonFields || (!hasCompanyField && !hasPersonFields));
  }, [formData.first_name, formData.last_name, formData.company_name]);

  // Validate Saudi fields when customer type or business type changes
  useEffect(() => {
    const errors = validateCustomerRequiredFields({
      customer_type: formData.customer_type,
      business_type: formData.business_type,
      vat_number: formData.vat_number,
      commercial_registration: formData.commercial_registration,
      saudi_id: formData.saudi_id,
    });
    setSaudiValidationErrors(errors);
  }, [formData.customer_type, formData.business_type, formData.vat_number, formData.commercial_registration, formData.saudi_id]);


  const handlePhoneBlur = (field: 'phone_mobile' | 'phone_work', value: string) => {
    if (!value.trim()) {
      setPhoneFeedback(prev => ({ ...prev, [field]: undefined }));
      return;
    }

    const normalized = normalizeToE164Saudi(value);
    if (normalized) {
      setFormData(prev => ({ ...prev, [field]: normalized }));
      const displayValue = formatPhoneForDisplay(normalized);
      setPhoneFeedback(prev => ({
        ...prev,
        [field]: value !== displayValue ? `Reformatted to ${displayValue}` : undefined
      }));
    } else {
      setPhoneFeedback(prev => ({ ...prev, [field]: 'Invalid Saudi phone number' }));
    }
  };

  const handleNameTypeChange = (type: 'person' | 'company') => {
    setIsPerson(type === 'person');
    if (type === 'person') {
      setFormData(prev => ({ ...prev, company_name: null }));
    } else {
      setFormData(prev => ({ ...prev, first_name: null, last_name: null }));
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Type Section */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Customer Type</Label>
              <Select value={formData.customer_type} onValueChange={(value) => setFormData({ ...formData, customer_type: value as "residential" | "commercial" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Name Section */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Name *</Label>
              <RadioGroup
                value={isPerson ? 'person' : 'company'}
                onValueChange={(value) => handleNameTypeChange(value as 'person' | 'company')}
                className="flex gap-6 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="person" id="person" />
                  <Label htmlFor="person">Individual</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="company" id="company" />
                  <Label htmlFor="company">Company</Label>
                </div>
              </RadioGroup>
            </div>

            {isPerson ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name || ''}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required={isPerson}
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name || ''}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required={isPerson}
                  />
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name || ''}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  required={!isPerson}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Enter the company or organization name
                </p>
              </div>
            )}
          </div>

          {/* Contact Information Section */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Contact Information</Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone_mobile">Mobile Phone *</Label>
                <Input
                  id="phone_mobile"
                  value={formData.phone_mobile || ''}
                  onChange={(e) => setFormData({ ...formData, phone_mobile: e.target.value })}
                  onBlur={(e) => handlePhoneBlur('phone_mobile', e.target.value)}
                  required
                />
                {phoneFeedback.mobile && (
                  <p className={`text-sm mt-1 ${phoneFeedback.mobile.includes('Invalid') ? 'text-destructive' : 'text-green-600'}`}>
                    {phoneFeedback.mobile}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="phone_work">Work Phone</Label>
              <Input
                id="phone_work"
                value={formData.phone_work || ''}
                onChange={(e) => setFormData({ ...formData, phone_work: e.target.value })}
                onBlur={(e) => handlePhoneBlur('phone_work', e.target.value)}
              />
              {phoneFeedback.work && (
                <p className={`text-sm mt-1 ${phoneFeedback.work.includes('Invalid') ? 'text-destructive' : 'text-green-600'}`}>
                  {phoneFeedback.work}
                </p>
              )}
            </div>

            <div>
              <Label className="text-base">Preferred Contact Method</Label>
              <RadioGroup
                value={formData.preferred_contact || 'mobile'}
                onValueChange={(value) => setFormData({ ...formData, preferred_contact: value as any })}
                className="flex gap-6 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mobile" id="preferred_mobile" />
                  <Label htmlFor="preferred_mobile">Mobile</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="work" id="preferred_work" />
                  <Label htmlFor="preferred_work">Work</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email" id="preferred_email" />
                  <Label htmlFor="preferred_email">Email</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="whatsapp" id="preferred_whatsapp" />
                  <Label htmlFor="preferred_whatsapp">WhatsApp</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Address Section */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Address</Label>

            <div>
              <Label htmlFor="short_address">Saudi Short Address</Label>
              <Input
                id="short_address"
                value={formData.short_address || ''}
                onChange={(e) => setFormData({ ...formData, short_address: e.target.value })}
                onBlur={async () => {
                  if (formData.short_address) {
                    const result = await geocodeAddress(formData.short_address);
                    if (result) {
                      setFormData(prev => ({
                        ...prev,
                        address: result.address,
                        city: result.city,
                        state: result.state,
                        zip_code: result.zip_code,
                      }));
                    }
                  }
                }}
              />
            </div>

            <div>
              <Label htmlFor="address">Full Address</Label>
              <Textarea
                id="address"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="zip_code">Postal Code</Label>
                <Input
                  id="zip_code"
                  value={formData.zip_code || ''}
                  onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Communication Settings Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Communication Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email_enabled">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive automated reminders and follow-ups via email
                  </p>
                </div>
                <Switch
                  id="email_enabled"
                  checked={formData.email_enabled !== undefined ? formData.email_enabled : true}
                  onCheckedChange={(checked) => setFormData({ ...formData, email_enabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="whatsapp_enabled">WhatsApp Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive automated reminders and follow-ups via WhatsApp
                  </p>
                  {!formData.phone_mobile && (
                    <p className="text-sm text-destructive">
                      Requires a valid mobile phone number
                    </p>
                  )}
                </div>
                <Switch
                  id="whatsapp_enabled"
                  checked={formData.whatsapp_enabled !== undefined ? formData.whatsapp_enabled : false}
                  onCheckedChange={(checked) => setFormData({ ...formData, whatsapp_enabled: checked })}
                  disabled={!formData.phone_mobile}
                />
              </div>
            </CardContent>
          </Card>

          {/* Saudi Market Fields */}
          <SaudiCustomerFieldsSimple 
            formData={formData}
            setFormData={setFormData}
            customerType={formData.customer_type}
          />

          {/* Saudi Validation Errors */}
          {saudiValidationErrors.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-red-800">Required Saudi Information:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {saudiValidationErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {formData.id ? 'Update Customer' : 'Create Customer'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CustomerProfile;
