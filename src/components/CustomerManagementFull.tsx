
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Download, Upload, FileText, FileSpreadsheet, TrendingUp, TrendingDown, Users, Calendar } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { geocodeAddress } from '@/utils/geocode';
import { DataTable } from "@/components/ui/DataTable";
import { getColumns, Customer } from "./CustomerColumns";
import CustomerDetails from "./CustomerDetails";
import CustomerImportDialog from "./CustomerImportDialog";
import { exportCustomersToCSV, exportCustomersToExcel } from '@/lib/customersRepo';

const CustomerManagementFull = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [communicationFilter, setCommunicationFilter] = useState<'all' | 'whatsapp' | 'email'>('all');
  const [viewMode, setViewMode] = useState<'all' | 'last30days' | 'yeartodate'>('all');
  const [customerStats, setCustomerStats] = useState({
    last30Days: { current: 0, previous: 0, percentage: 0 },
    yearToDate: { current: 0, previous: 0, percentage: 0 }
  });
  const [formData, setFormData] = useState({
    id: '', // For detecting edit vs create mode
    name: '',
    email: '',
    phone: '',
    address: '',
    short_address: '',
    city: '',
    state: '',
    zip_code: '',
    customer_type: 'residential' as "residential" | "commercial",
    is_active: true,
    // New fields for person/company support
    first_name: '',
    last_name: '',
    company_name: '',
    phone_mobile: '',
    phone_work: '',
    preferred_contact: 'mobile' as 'mobile' | 'work' | 'email' | 'whatsapp',
    email_enabled: true,
    whatsapp_enabled: false,
    tags: [],
    country: ''
  });
  const { toast } = useToast();

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
      const customerData = data as Customer[] || [];
      setCustomers(customerData);
      calculateCustomerStats(customerData);
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

  const calculateCustomerStats = (customerList: Customer[]) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Year-to-date calculations
    const currentYear = now.getFullYear();
    const lastYear = currentYear - 1;
    const startOfYear = new Date(currentYear, 0, 1);
    const startOfLastYear = new Date(lastYear, 0, 1);
    const sameDayLastYear = new Date(lastYear, now.getMonth(), now.getDate());

    // Last 30 days
    const last30Days = customerList.filter(customer => {
      const createdAt = new Date(customer.created_at || '');
      return createdAt >= thirtyDaysAgo;
    }).length;

    // Previous 30 days (31-60 days ago)
    const previous30Days = customerList.filter(customer => {
      const createdAt = new Date(customer.created_at || '');
      return createdAt >= sixtyDaysAgo && createdAt < thirtyDaysAgo;
    }).length;

    // Year to date
    const yearToDate = customerList.filter(customer => {
      const createdAt = new Date(customer.created_at || '');
      return createdAt >= startOfYear;
    }).length;

    // Same period last year
    const samePeriodLastYear = customerList.filter(customer => {
      const createdAt = new Date(customer.created_at || '');
      return createdAt >= startOfLastYear && createdAt <= sameDayLastYear;
    }).length;

    // Calculate percentages
    const last30DaysPercentage = previous30Days > 0
      ? ((last30Days - previous30Days) / previous30Days) * 100
      : last30Days > 0 ? 100 : 0;

    const yearToDatePercentage = samePeriodLastYear > 0
      ? ((yearToDate - samePeriodLastYear) / samePeriodLastYear) * 100
      : yearToDate > 0 ? 100 : 0;

    setCustomerStats({
      last30Days: {
        current: last30Days,
        previous: previous30Days,
        percentage: Math.round(last30DaysPercentage * 100) / 100
      },
      yearToDate: {
        current: yearToDate,
        previous: samePeriodLastYear,
        percentage: Math.round(yearToDatePercentage * 100) / 100
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Construct the name field properly based on person/company type
      let submitData = { ...formData };

      // Determine if this is a person or company based on filled fields
      const hasPersonFields = submitData.first_name && submitData.last_name;
      const hasCompanyField = submitData.company_name;

      if (hasPersonFields && !hasCompanyField) {
        // Person: construct name from first and last name
        submitData.name = `${submitData.first_name.trim()} ${submitData.last_name.trim()}`.trim();
      } else if (hasCompanyField && !hasPersonFields) {
        // Company: use company name
        submitData.name = submitData.company_name.trim();
      } else if (hasCompanyField && hasPersonFields) {
        // Both filled: prefer company name but could show warning
        submitData.name = submitData.company_name.trim();
      } else {
        // Neither filled: this shouldn't happen due to form validation, but handle it
        submitData.name = 'Unknown Customer';
      }

      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(submitData)
          .eq('id', editingCustomer.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Customer updated successfully"
        });
      } else {
        // For new customer creation, exclude the id field to let database auto-generate UUID
        const { id, ...createData } = submitData;
        const { error } = await supabase
          .from('customers')
          .insert([createData]);

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
      id: customer.id, // ← Add the customer ID for editing detection
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
      first_name: customer.first_name || '',
      last_name: customer.last_name || '',
      company_name: customer.company_name || '',
      phone_mobile: customer.phone_mobile || '',
      phone_work: customer.phone_work || '',
      preferred_contact: customer.preferred_contact || 'mobile',
      email_enabled: customer.email_enabled !== undefined ? customer.email_enabled : true,
      whatsapp_enabled: customer.whatsapp_enabled !== undefined ? customer.whatsapp_enabled : false,
      tags: customer.tags || [],
      country: customer.country || ''
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
      id: '', // Reset ID for create mode
      name: '',
      email: '',
      phone: '',
      address: '',
      short_address: '',
      city: '',
      state: '',
      zip_code: '',
      customer_type: 'residential' as "residential" | "commercial",
      is_active: true,
      first_name: '',
      last_name: '',
      company_name: '',
      phone_mobile: '',
      phone_work: '',
      preferred_contact: 'mobile' as 'mobile' | 'work' | 'email' | 'whatsapp',
      email_enabled: true,
      whatsapp_enabled: false,
      tags: [],
      country: ''
    });
  };

  const getFilteredCustomersByDate = (customerList: Customer[]) => {
    const now = new Date();

    switch (viewMode) {
      case 'last30days': {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return customerList.filter(customer => {
          const createdAt = new Date(customer.created_at || '');
          return createdAt >= thirtyDaysAgo;
        });
      }
      case 'yeartodate': {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return customerList.filter(customer => {
          const createdAt = new Date(customer.created_at || '');
          return createdAt >= startOfYear;
        });
      }
      default:
        return customerList;
    }
  };

  const filteredCustomers = getFilteredCustomersByDate(customers).filter(customer => {
    // Search term filter
    const matchesSearch = !searchTerm ||
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.phone && customer.phone.includes(searchTerm)) ||
      (customer.phone_mobile && customer.phone_mobile.includes(searchTerm)) ||
      (customer.first_name && customer.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.last_name && customer.last_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.company_name && customer.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.address && customer.address.toLowerCase().includes(searchTerm.toLowerCase()));

    // Communication filter
    const matchesCommunication = communicationFilter === 'all' ||
      (communicationFilter === 'whatsapp' && customer.whatsapp_enabled) ||
      (communicationFilter === 'email' && customer.email_enabled);

    return matchesSearch && matchesCommunication;
  });

  const handleExportCSV = async () => {
    try {
      const customersToExport = filteredCustomers.length > 0 ? filteredCustomers : customers;
      const filename = `customers_${new Date().toISOString().split('T')[0]}`;
      await exportCustomersToCSV(customersToExport, filename);
      toast({
        title: "Export successful",
        description: `Exported ${customersToExport.length} customers to CSV`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export customers to CSV",
        variant: "destructive"
      });
    }
  };

  const handleExportExcel = async () => {
    try {
      const customersToExport = filteredCustomers.length > 0 ? filteredCustomers : customers;
      const filename = `customers_${new Date().toISOString().split('T')[0]}`;
      await exportCustomersToExcel(customersToExport, filename);
      toast({
        title: "Export successful",
        description: `Exported ${customersToExport.length} customers to Excel`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export customers to Excel",
        variant: "destructive"
      });
    }
  };

  const handleImportComplete = (importedCount: number) => {
    fetchCustomers(); // Refresh the customer list
  };

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
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Customer Management</h2>
            <p className="text-muted-foreground">Manage your customer database</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* All Customers Card */}
            <Card
              className={`cursor-pointer transition-all hover:shadow-md ${
                viewMode === 'all' ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setViewMode('all')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">All Customers</p>
                    <p className="text-2xl font-bold">{customers.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            {/* Last 30 Days Card */}
            <Card
              className={`cursor-pointer transition-all hover:shadow-md ${
                viewMode === 'last30days' ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setViewMode('last30days')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">New (30 Days)</p>
                    <p className="text-2xl font-bold">{customerStats.last30Days.current}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {customerStats.last30Days.percentage >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`text-sm font-medium ${
                        customerStats.last30Days.percentage >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {customerStats.last30Days.percentage >= 0 ? '+' : ''}
                        {customerStats.last30Days.percentage}%
                      </span>
                    </div>
                  </div>
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            {/* Year to Date Card */}
            <Card
              className={`cursor-pointer transition-all hover:shadow-md ${
                viewMode === 'yeartodate' ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setViewMode('yeartodate')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Year to Date</p>
                    <p className="text-2xl font-bold">{customerStats.yearToDate.current}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {customerStats.yearToDate.percentage >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`text-sm font-medium ${
                        customerStats.yearToDate.percentage >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {customerStats.yearToDate.percentage >= 0 ? '+' : ''}
                        {customerStats.yearToDate.percentage}%
                      </span>
                    </div>
                  </div>
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter Section */}
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={communicationFilter} onValueChange={(value: 'all' | 'whatsapp' | 'email') => setCommunicationFilter(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Communication</SelectItem>
                <SelectItem value="whatsapp">WhatsApp Enabled</SelectItem>
                <SelectItem value="email">Email Enabled</SelectItem>
              </SelectContent>
            </Select>
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
      </CardContent>

      <CustomerImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImportComplete={handleImportComplete}
      />
    </Card>
  );
};

export default CustomerManagementFull;
