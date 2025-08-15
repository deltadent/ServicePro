import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, Edit, Trash2, Phone, Mail, Calendar, User, MoreVertical, Archive } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

interface Technician {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: 'admin' | 'worker';
  employee_id: string | null;
  department: string | null;
  hire_date: string;
  is_active: boolean;
  created_at: string;
  login_credential_email: string | null;
  login_credential_id: string | null;
}

const TechnicianManagementFull = () => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    employee_id: '',
    department: '',
    role: 'worker' as 'admin' | 'worker',
    is_active: true
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const fetchTechnicians = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Type cast the data to ensure role is properly typed
      const typedTechnicians: Technician[] = (data || []).map(tech => ({
        ...tech,
        role: tech.role as 'admin' | 'worker'
      }));
      
      setTechnicians(typedTechnicians);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch technicians",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingTechnician) {
        // Update existing technician
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
            employee_id: formData.employee_id,
            department: formData.department,
            role: formData.role,
            is_active: formData.is_active,
          })
          .eq('id', editingTechnician.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Technician updated successfully"
        });
      } else {
        // Add new technician
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("User not created");

        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            full_name: formData.full_name,
            phone: formData.phone,
            employee_id: formData.employee_id,
            department: formData.department,
            role: formData.role,
            is_active: formData.is_active,
          })
          .eq('id', authData.user.id);

        if (profileError) throw profileError;

        toast({
          title: "Success",
          description: "Technician added successfully"
        });
      }

      setIsDialogOpen(false);
      setEditingTechnician(null);
      resetForm();
      fetchTechnicians();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEdit = (technician: Technician) => {
    setEditingTechnician(technician);
    setFormData({
      full_name: technician.full_name || '',
      email: technician.email || '',
      password: '',
      phone: technician.phone || '',
      employee_id: technician.employee_id || '',
      department: technician.department || '',
      role: technician.role,
      is_active: technician.is_active
    });
    setIsDialogOpen(true);
  };

  const handleToggleStatus = async (technicianId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', technicianId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Technician ${!currentStatus ? 'activated' : 'deactivated'} successfully`
      });
      
      fetchTechnicians();
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
      full_name: '',
      email: '',
      password: '',
      phone: '',
      employee_id: '',
      department: '',
      role: 'worker',
      is_active: true
    });
  };

  const filteredTechnicians = technicians.filter(tech =>
    tech.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tech.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tech.employee_id?.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Technician Management</h2>
          <p className="text-muted-foreground">Manage your technician team</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingTechnician(null); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Technician
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <ScrollArea className="max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>{editingTechnician ? 'Edit' : 'Add'} Technician</DialogTitle>
              <DialogDescription>
                {editingTechnician ? 'Update' : 'Add a new'} technician to your team.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 p-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input id="full_name" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
              </div>
              
              {!editingTechnician && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employee_id">Employee ID</Label>
                  <Input id="employee_id" value={formData.employee_id} onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={(value: 'admin' | 'worker') => setFormData({ ...formData, role: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="worker">Worker</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2 pt-6">
                  <Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                  <Label htmlFor="is_active">Active Status</Label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit">{editingTechnician ? 'Update' : 'Add'} Technician</Button>
              </div>
            </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          placeholder="Search by name, email, or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 w-full max-w-sm"
        />
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <div className="grid gap-4">
            {filteredTechnicians.filter(t => t.is_active).length > 0 ? (
              filteredTechnicians.filter(t => t.is_active).map((technician) => (
                <Card key={technician.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{technician.full_name || 'N/A'}</CardTitle>
                        <CardDescription>#{technician.employee_id || 'N/A'}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={technician.is_active ? 'default' : 'destructive'}>
                          {technician.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(technician)}>
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(technician.id, technician.is_active)}>
                              <Archive className="mr-2 h-4 w-4" />
                              <span>{technician.is_active ? 'Archive' : 'Unarchive'}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="truncate">{technician.email}</span>
                    </div>
                    {technician.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span>{technician.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="capitalize">{technician.role}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span>Hired: {new Date(technician.hire_date).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>No active technicians found.</p>
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="archived">
          <div className="grid gap-4">
            {filteredTechnicians.filter(t => !t.is_active).length > 0 ? (
              filteredTechnicians.filter(t => !t.is_active).map((technician) => (
                <Card key={technician.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{technician.full_name || 'N/A'}</CardTitle>
                        <CardDescription>#{technician.employee_id || 'N/A'}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={technician.is_active ? 'default' : 'destructive'}>
                          {technician.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(technician)}>
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(technician.id, technician.is_active)}>
                              <Archive className="mr-2 h-4 w-4" />
                              <span>{technician.is_active ? 'Archive' : 'Unarchive'}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="truncate">{technician.email}</span>
                    </div>
                    {technician.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span>{technician.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="capitalize">{technician.role}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span>Hired: {new Date(technician.hire_date).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>No archived technicians found.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TechnicianManagementFull;
