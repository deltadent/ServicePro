import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Phone, Mail, MessageSquare, Clock, Wrench, TrendingUp, Target, Plus, Calendar, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { Customer } from '@/components/CustomerColumns';
import { SaudiCustomerDisplay } from '@/components/display/SaudiCustomerDisplay';

interface CustomerProfileProps {
  id?: string;
}

const CustomerProfile = ({ id: propId }: CustomerProfileProps = {}) => {
  const { id: urlId } = useParams<{ id: string }>();
  const customerId = propId || urlId;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [jobsPeriod, setJobsPeriod] = useState(30);
  const [stats, setStats] = useState({
    jobs30d: 0,
    completionRate: 0,
    totalSpent: 0,
    allJobs: 0
  });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);

  useEffect(() => {
    if (customerId) {
      fetchCustomerData();
    }
  }, [customerId]);

  // Recalculate stats when period changes
  useEffect(() => {
    if (customer && customerId) {
      fetchCustomerStats(customerId);
    }
  }, [customerId, jobsPeriod, customer]);

  const fetchCustomerData = async () => {
    if (!customerId) return;

    try {
      setLoading(true);

      const { data: customerData, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) throw error;

      setCustomer(customerData);
      await fetchCustomerStats(customerId);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load customer data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerStats = async (customerId: string) => {
    try {
      const periodDaysAgo = new Date();
      periodDaysAgo.setDate(periodDaysAgo.getDate() - jobsPeriod);

      // All jobs for this customer
      const { data: allJobs, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          id, status, total_cost, created_at, started_at, completed_at, scheduled_date,
          title, description, priority,
          profiles(full_name)
        `)
        .eq('customer_id', customerId)
        .order('scheduled_date', { ascending: false });

      if (jobsError) throw jobsError;

      // Jobs in selected period
      const jobsInPeriod = allJobs?.filter(job => new Date(job.created_at) >= periodDaysAgo).length || 0;

      // Completed jobs in selected period
      const completedInPeriod = allJobs?.filter(job =>
        new Date(job.created_at) >= periodDaysAgo && job.status === 'completed'
      ).length || 0;

      // Recent jobs for display (last 10)
      const recentJobsList = allJobs?.slice(0, 10) || [];

      // Completion rate
      const completionRate = jobsInPeriod > 0 ? Math.round((completedInPeriod / jobsInPeriod) * 100) : 0;

      // Total spent
      const totalSpent = allJobs?.reduce((sum, job) => sum + (job.total_cost || 0), 0) || 0;

      setStats({
        jobs30d: jobsInPeriod,
        completionRate,
        totalSpent,
        allJobs: allJobs?.length || 0
      });

      setRecentJobs(recentJobsList);
    } catch (error) {
      console.error('Error fetching customer stats:', error);
    }
  };

  const handleCall = (phoneNumber: string) => {
    window.open(`tel:${phoneNumber}`, '_self');
  };

  const handleEmail = (email: string) => {
    window.open(`mailto:${email}`, '_self');
  };

  const handleWhatsApp = (phoneNumber: string) => {
    // Remove any non-numeric characters and ensure + prefix
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const whatsappPhone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
    window.open(`https://wa.me/${whatsappPhone.substring(1)}`, '_blank');
  };

  const handleJobCreated = () => {
    if (customer) {
      fetchCustomerStats(customer.id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <h2 className="text-xl font-semibold mb-2">Customer Not Found</h2>
        <p className="text-muted-foreground mb-4">The customer you're looking for doesn't exist.</p>
        <Button onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <p className="text-muted-foreground">Customer Profile</p>
        </div>
      </div>


      {/* Jobs Section with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <TabsList>
                <TabsTrigger value="profile">Profile Details</TabsTrigger>
                <TabsTrigger value="saudi">Saudi Arabia</TabsTrigger>
                <TabsTrigger value="jobs">Recent Jobs</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-4">
                {activeTab === 'jobs' && (
                  <Select value={jobsPeriod.toString()} onValueChange={(value) => setJobsPeriod(parseInt(value))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {activeTab === 'jobs' && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Job
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Create New Job</DialogTitle>
                        <DialogDescription>
                          Create a new job for {customer.name}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          This will open the full job creation interface. Continue?
                        </p>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline">Cancel</Button>
                          <Button onClick={() => {
                            navigate('/admin/jobs');
                          }}>
                            Continue
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <TabsContent value="profile" className="space-y-6">
            {/* Profile Details Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                <p className="text-base">{customer.name}</p>
              </div>
              {customer.customer_type && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Type</Label>
                  <p className="text-base capitalize">{customer.customer_type}</p>
                </div>
              )}
              {customer.email && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="text-base">{customer.email}</p>
                </div>
              )}
              {(customer.phone_mobile || customer.phone_work) && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                  <p className="text-base">
                    {customer.preferred_contact === 'mobile' ? customer.phone_mobile :
                     customer.preferred_contact === 'work' ? customer.phone_work :
                     customer.phone_mobile || customer.phone_work}
                  </p>
                </div>
              )}
              {customer.short_address && (
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                  <p className="text-base">{customer.short_address}</p>
                  {customer.city && <p className="text-sm text-muted-foreground">{customer.city}, {customer.state} {customer.zip_code}</p>}
                </div>
              )}
            </div>

            {/* Communication Actions */}
            {(customer.email || customer.phone_mobile || customer.phone_work) && (
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                {customer.email && customer.email_enabled && (
                  <Button variant="outline" size="sm" onClick={() => handleEmail(customer.email!)}>
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                )}
                {customer.whatsapp_enabled && (customer.phone_mobile || customer.phone_work) && (
                  <Button variant="outline" size="sm" onClick={() => handleWhatsApp(customer.preferred_contact === 'mobile' ? customer.phone_mobile! : customer.phone_work!)}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                )}
                {(customer.phone_mobile || customer.phone_work) && (
                  <Button variant="outline" size="sm" onClick={() => handleCall(customer.preferred_contact === 'mobile' ? customer.phone_mobile! : customer.phone_work!)}>
                    <Phone className="w-4 h-4 mr-2" />
                    Call
                  </Button>
                )}
              </div>
            )}

            {/* Communication Settings */}
            <div className="flex items-center gap-4 pt-2 border-t border-dashed">
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-xs">
                  <Mail className="w-3 h-3 mr-1" />
                  {customer.email_enabled ? "Email Enabled" : "Email Disabled"}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-xs">
                  <MessageSquare className="w-3 h-3 mr-1" />
                  {customer.whatsapp_enabled ? "WhatsApp Enabled" : "WhatsApp Disabled"}
                </Badge>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="saudi" className="space-y-6">
            <SaudiCustomerDisplay customer={customer} showSensitiveData={false} />
          </TabsContent>

          <TabsContent value="jobs" className="space-y-6">
            {/* Recent Jobs Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-100">Jobs ({jobsPeriod}d)</p>
                      <p className="text-2xl font-bold">{stats.jobs30d}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm text-green-100">Completion Rate ({jobsPeriod}d)</p>
                      <p className="text-2xl font-bold">{stats.completionRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm text-purple-100">SAR spent ({jobsPeriod}d)</p>
                      <p className="text-2xl font-bold">SAR {stats.totalSpent.toFixed(0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Jobs Table */}
            <div className="space-y-3">
              {recentJobs.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No jobs found</p>
                </div>
              ) : (
                recentJobs.map((job) => (
                  <Card key={job.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={
                              job.status === 'completed' ? 'default' :
                              job.status === 'in_progress' ? 'secondary' :
                              'outline'
                            }>
                              {job.status.replace('_', ' ')}
                            </Badge>
                            <span className="text-sm font-medium">{job.title}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(job.scheduled_date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {new Date(job.scheduled_date).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            {job.profiles?.full_name && (
                              <div className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {job.profiles.full_name}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">SAR {(job.total_cost || 0).toFixed(0)}</p>
                          <p className="text-sm text-muted-foreground">Job #{job.job_number}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </CardContent>
      </Card>
      </Tabs>
    </div>
  );
};

export default CustomerProfile;