import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Customer } from "./CustomerColumns";
import CustomerProfile from "./CustomerProfile";
import JobOrders from "./JobOrders";
import { ArrowLeft, User, Phone, Mail, MapPin, Building, Calendar, Clock } from "lucide-react";

interface CustomerDetailsProps {
  customer: Customer;
  onBack: () => void;
  formData: any;
  setFormData: (data: any) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

const CustomerDetails = ({ customer, onBack, formData, setFormData, handleSubmit }: CustomerDetailsProps) => {
  const initials = customer.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  return (
    <div className="space-y-6">
      {/* Header with Breadcrumb */}
      <div className="flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={onBack} className="cursor-pointer flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" />
                Customers
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{customer.name || 'New Customer'}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to List
        </Button>
      </div>

      {/* Customer Overview Card */}
      {customer.id && (
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-2xl flex items-center gap-3">
                  {customer.name}
                  <Badge variant={customer.is_active ? 'success' : 'secondary'}>
                    {customer.is_active ? 'Active' : 'Archived'}
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-2">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Building className="w-4 h-4" />
                      <Badge variant={customer.customer_type === 'commercial' ? 'default' : 'secondary'}>
                        {customer.customer_type === 'commercial' ? 'Commercial' : 'Residential'}
                      </Badge>
                    </div>
                    {customer.created_at && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        Added {new Date(customer.created_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Contact Information */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contact</h4>
                <div className="space-y-2">
                  {customer.phone ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="font-mono">{customer.phone}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>No phone number</span>
                    </div>
                  )}
                  {customer.email ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{customer.email}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span>No email address</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Address</h4>
                <div className="space-y-2">
                  {(customer.address || customer.short_address) ? (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <div>{customer.short_address || customer.address}</div>
                        {customer.city || customer.state ? (
                          <div className="text-muted-foreground">
                            {[customer.city, customer.state].filter(Boolean).join(', ')}
                            {customer.zip_code && ` ${customer.zip_code}`}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>No address provided</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Information</h4>
                <div className="space-y-2 text-sm">
                  {customer.updated_at && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>Updated {new Date(customer.updated_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for detailed information */}
      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profile Details
          </TabsTrigger>
          <TabsTrigger value="jobs" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            Job Orders
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <CustomerProfile
            formData={formData}
            setFormData={setFormData}
            handleSubmit={handleSubmit}
            onCancel={onBack}
          />
        </TabsContent>
        <TabsContent value="jobs">
          <JobOrders customer={customer} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerDetails;
