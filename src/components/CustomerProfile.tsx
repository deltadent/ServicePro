import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { geocodeAddress } from '@/utils/geocode';

const CustomerProfile = ({ formData, setFormData, handleSubmit, onCancel }) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="customer_type">Customer Type</Label>
              <Select value={formData.customer_type} onValueChange={(value) => setFormData({ ...formData, customer_type: value as "residential" | "commercial" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="short_address">Saudi Short Address</Label>
            <Input id="short_address" value={formData.short_address} onChange={(e) => setFormData({ ...formData, short_address: e.target.value })} onBlur={async () => {
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
            }} />
          </div>
          <div>
            <Label htmlFor="address">Full Address</Label>
            <Textarea id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="state">State/Province</Label>
              <Input id="state" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="zip_code">Postal Code</Label>
              <Input id="zip_code" value={formData.zip_code} onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit">Update Customer</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CustomerProfile;
