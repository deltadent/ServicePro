import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { geocodeAddress } from '@/utils/geocode';
import { useState } from 'react';
import { Phone, Mail, MapPin, User, Building, AlertCircle } from 'lucide-react';

interface CustomerProfileProps {
  formData: {
    name: string;
    email: string;
    phone: string;
    address: string;
    short_address: string;
    city: string;
    state: string;
    zip_code: string;
    customer_type: 'residential' | 'commercial';
    is_active: boolean;
  };
  setFormData: (data: any) => void;
  handleSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

interface ValidationErrors {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  short_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

const CustomerProfile = ({ formData, setFormData, handleSubmit, onCancel }: CustomerProfileProps) => {
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isValidating, setIsValidating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Validation functions
  const validateEmail = (email: string): string | null => {
    if (!email) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? null : 'Please enter a valid email address';
  };

  const validatePhone = (phone: string): string | null => {
    if (!phone) return null;
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone.replace(/\s/g, '')) ? null : 'Please enter a valid phone number';
  };

  const validateRequired = (value: string, fieldName: string): string | null => {
    return value.trim() ? null : `${fieldName} is required`;
  };

  const validateZipCode = (zipCode: string): string | null => {
    if (!zipCode) return null;
    const zipRegex = /^[0-9]{5}(-[0-9]{4})?$/; // US ZIP code format
    return zipRegex.test(zipCode) ? null : 'Please enter a valid ZIP code';
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    
    // Required field validation
    const nameError = validateRequired(formData.name, 'Name');
    if (nameError) errors.name = nameError;
    
    // Optional field validation
    const emailError = validateEmail(formData.email);
    if (emailError) errors.email = emailError;
    
    const phoneError = validatePhone(formData.phone);
    if (phoneError) errors.phone = phoneError;
    
    const zipError = validateZipCode(formData.zip_code);
    if (zipError) errors.zip_code = zipError;
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFieldChange = (field: keyof typeof formData, value: string) => {
    setFormData({ ...formData, [field]: value });
    
    // Clear validation error for this field
    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof ValidationErrors];
        return newErrors;
      });
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidating(true);
    
    if (validateForm()) {
      await handleSubmit(e);
    }
    
    setIsValidating(false);
  };

  const handleAddressGeocoding = async () => {
    if (formData.short_address) {
      setIsGeocoding(true);
      try {
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
      } catch (error) {
        console.error('Geocoding error:', error);
      } finally {
        setIsGeocoding(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Customer Information
          </CardTitle>
          <CardDescription>
            Enter the customer's basic information and contact details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFormSubmit} className="space-y-6">
            {/* Basic Information Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-1">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className={validationErrors.name ? 'border-red-500' : ''}
                  placeholder="Enter customer name"
                  required 
                />
                {validationErrors.name && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {validationErrors.name}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_type" className="flex items-center gap-1">
                  <Building className="w-4 h-4" />
                  Customer Type
                </Label>
                <Select value={formData.customer_type} onValueChange={(value) => handleFieldChange('customer_type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Residential</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="commercial">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Commercial</Badge>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            
            {/* Contact Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={formData.email} 
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    className={validationErrors.email ? 'border-red-500' : ''}
                    placeholder="customer@example.com"
                  />
                  {validationErrors.email && (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {validationErrors.email}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    Phone Number
                  </Label>
                  <Input 
                    id="phone" 
                    value={formData.phone} 
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    className={validationErrors.phone ? 'border-red-500' : ''}
                    placeholder="+1 (555) 123-4567"
                  />
                  {validationErrors.phone && (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {validationErrors.phone}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </div>
            <Separator />
            
            {/* Address Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Address Information
              </h3>
              <div className="space-y-2">
                <Label htmlFor="short_address" className="flex items-center gap-1">
                  Saudi Short Address
                  {isGeocoding && <Badge variant="secondary">Geocoding...</Badge>}
                </Label>
                <Input 
                  id="short_address" 
                  value={formData.short_address} 
                  onChange={(e) => handleFieldChange('short_address', e.target.value)}
                  onBlur={handleAddressGeocoding}
                  placeholder="Enter short address for auto-completion"
                  disabled={isGeocoding}
                />
                {validationErrors.short_address && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {validationErrors.short_address}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Full Address</Label>
                <Textarea 
                  id="address" 
                  value={formData.address} 
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  className={validationErrors.address ? 'border-red-500' : ''}
                  rows={3}
                  placeholder="Enter complete address details"
                />
                {validationErrors.address && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {validationErrors.address}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input 
                    id="city" 
                    value={formData.city} 
                    onChange={(e) => handleFieldChange('city', e.target.value)}
                    className={validationErrors.city ? 'border-red-500' : ''}
                    placeholder="City name"
                  />
                  {validationErrors.city && (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {validationErrors.city}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State/Province</Label>
                  <Input 
                    id="state" 
                    value={formData.state} 
                    onChange={(e) => handleFieldChange('state', e.target.value)}
                    className={validationErrors.state ? 'border-red-500' : ''}
                    placeholder="State or province"
                  />
                  {validationErrors.state && (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {validationErrors.state}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip_code">Postal Code</Label>
                  <Input 
                    id="zip_code" 
                    value={formData.zip_code} 
                    onChange={(e) => handleFieldChange('zip_code', e.target.value)}
                    className={validationErrors.zip_code ? 'border-red-500' : ''}
                    placeholder="12345"
                  />
                  {validationErrors.zip_code && (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {validationErrors.zip_code}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </div>
            <Separator />
            
            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={isValidating || isGeocoding}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isValidating || isGeocoding}
                className="min-w-[120px]"
              >
                {isValidating ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </div>
                ) : (
                  'Save Customer'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerProfile;
