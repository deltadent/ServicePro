import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Customer } from "./CustomerColumns";
import CustomerProfile from "./CustomerProfile";
import JobOrders from "./JobOrders";

interface CustomerDetailsProps {
  customer: Customer;
  onBack: () => void;
  formData: any;
  setFormData: (data: any) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

const CustomerDetails = ({ customer, onBack, formData, setFormData, handleSubmit }: CustomerDetailsProps) => {
  return (
    <Card>
      <CardHeader>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={onBack} className="cursor-pointer">
                Customers
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{customer.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="profile" className="mt-4">
          <TabsList>
            <TabsTrigger value="profile">Profile Details</TabsTrigger>
            <TabsTrigger value="jobs">Job Orders</TabsTrigger>
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
      </CardContent>
    </Card>
  );
};

export default CustomerDetails;
