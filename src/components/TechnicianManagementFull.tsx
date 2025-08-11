import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, Edit, Trash2, Phone, Mail, Calendar, User, MoreVertical } from "lucide-react";
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
}

const TechnicianManagementFull = () => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
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
    
    if (!editingTechnician) {
      toast({
        title: "Error",
        description: "Can only edit existing technicians",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', editingTechnician.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Technician updated successfully"
      });

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
            <DialogHeader>
              <DialogTitle>{editingTechnician ? 'Edit' : 'Add'} Technician</DialogTitle>
              <DialogDescription>
                {editingTechnician ? 'Update' : 'Add a new'} technician to your team.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input id="full_name" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="employee_id">Employee ID</Label>
                  <Input id="employee_id" value={formData.employee_id} onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="flex items-center space-x-2 pt-6">
                  <Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                  <Label htmlFor="is_active">Active Status</Label>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit">{editingTechnician ? 'Update' : 'Add'} Technician</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search technicians..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {filteredTechnicians.length} technicians
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTechnicians.map((technician) => (
          <Card key={technician.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{technician.full_name || 'N/A'}</CardTitle>
                  <CardDescription>#{technician.employee_id || 'N/A'}</CardDescription>
                </div>
                <Badge variant={technician.is_active ? 'default' : 'destructive'}>
                  {technician.is_active ? 'Active' : 'Inactive'}
                </Badge>
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
            <div className="p-4 border-t flex justify-end">
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
                    {technician.is_active ? 'Deactivate' : 'Activate'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Card>
        ))}
        
        {filteredTechnicians.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">No technicians found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TechnicianManagementFull;
