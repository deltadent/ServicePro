
import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Search, Filter, Users, Building, TrendingUp, Download, Upload, RefreshCw, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { geocodeAddress } from '@/utils/geocode';
import { DataTable } from "@/components/ui/DataTable";
import { getColumns, Customer } from "./CustomerColumns";
import CustomerDetails from "./CustomerDetails";

interface CustomerStats {
  total: number;
  active: number;
  archived: number;
  residential: number;
  commercial: number;
  withEmail: number;
  withPhone: number;
  recentlyAdded: number;
}

interface FilterOptions {
  customerType: string;
  hasEmail: string;
  hasPhone: string;
  city: string;
  state: string;
  dateRange: string;
}

const CustomerManagementFull = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    customerType: 'all',
    hasEmail: 'all',
    hasPhone: 'all',
    city: '',
    state: '',
    dateRange: 'all'
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    short_address: '',
    city: '',
    state: '',
    zip_code: '',
    customer_type: 'residential' as "residential" | "commercial",
    is_active: true
  });
  const { toast } = useToast();

  // Customer statistics
  const customerStats = useMemo((): CustomerStats => {
    const total = customers.length;
    const active = customers.filter(c => c.is_active).length;
    const archived = customers.filter(c => !c.is_active).length;
    const residential = customers.filter(c => c.customer_type === 'residential').length;
    const commercial = customers.filter(c => c.customer_type === 'commercial').length;
    const withEmail = customers.filter(c => c.email && c.email.trim()).length;
    const withPhone = customers.filter(c => c.phone && c.phone.trim()).length;
    const recentlyAdded = customers.filter(c => {
      const createdDate = new Date(c.created_at || '');
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return createdDate > weekAgo;
    }).length;

    return {
      total,
      active,
      archived,
      residential,
      commercial,
      withEmail,
      withPhone,
      recentlyAdded
    };
  }, [customers]);

  // Get unique cities and states for filter options
  const uniqueCities = useMemo(() => {
    const cities = customers
      .map(c => c.city)
      .filter(Boolean)
      .filter((city, index, arr) => arr.indexOf(city) === index)
      .sort();
    return cities;
  }, [customers]);

  const uniqueStates = useMemo(() => {
    const states = customers
      .map(c => c.state)
      .filter(Boolean)
      .filter((state, index, arr) => arr.indexOf(state) === index)
      .sort();
    return states;
  }, [customers]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data as Customer[] || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch customers",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(formData)
          .eq('id', editingCustomer.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Customer updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('customers')
          .insert([formData]);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Customer created successfully"
        });
      }

      setIsDialogOpen(false);
      setEditingCustomer(null);
      resetForm();
      fetchCustomers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      short_address: customer.short_address || '',
      city: customer.city || '',
      state: customer.state || '',
      zip_code: customer.zip_code || '',
      customer_type: customer.customer_type as "residential" | "commercial",
      is_active: customer.is_active,
    });
    setSelectedCustomer(customer);
  };

  const handleAdd = () => {
    resetForm();
    setEditingCustomer(null);
    setSelectedCustomer({} as Customer); // A bit of a hack to show the details view
  };

  const handleDelete = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Customer deleted successfully"
      });
      
      fetchCustomers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleArchive = async (customer: Customer) => {
    try {
      const { error } = await supabase
        .from('customers')
        .update({ is_active: !customer.is_active })
        .eq('id', customer.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Customer ${!customer.is_active ? 'unarchived' : 'archived'} successfully`
      });
      
      fetchCustomers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      short_address: '',
      city: '',
      state: '',
      zip_code: '',
      customer_type: 'residential' as "residential" | "commercial",
      is_active: true
    });
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (customer.phone && customer.phone.includes(searchTerm)) ||
    (customer.address && customer.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const columns = getColumns(handleEdit, handleArchive, handleDelete);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (selectedCustomer) {
    return (
      <CustomerDetails
        customer={selectedCustomer}
        onBack={() => setSelectedCustomer(null)}
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleSubmit}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Customer Management</h2>
          <p className="text-muted-foreground">Manage your customer database</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </div>


      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <DataTable columns={columns} data={filteredCustomers.filter(c => c.is_active)} onRowClick={handleEdit} />
        </TabsContent>
        <TabsContent value="archived">
          <DataTable columns={columns} data={filteredCustomers.filter(c => !c.is_active)} onRowClick={handleEdit} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerManagementFull;
