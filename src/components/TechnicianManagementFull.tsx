import { useState, useEffect, useMemo } from 'react';
import { ModernCard, FeatureCard } from "@/components/ui/modern-card";
import { ModernButton, FloatingActionButton } from "@/components/ui/modern-button";
import { ModernDataTable, ActionsCell } from "@/components/ui/modern-data-table";
import { MotionDiv, MotionContainer, AnimatedPage } from "@/components/ui/motion";
import { SkeletonTable } from "@/components/ui/modern-skeleton";
import { AppShell, PageHeader, ContentArea } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, Edit, Trash2, Phone, Mail, Calendar, User, MoreVertical, Archive, Users, Shield, Activity } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ColumnDef } from "@tanstack/react-table";
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

  const columns = useMemo<ColumnDef<Technician>[]>(() => [
    {
      accessorKey: "full_name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="font-medium">{row.original.full_name || 'N/A'}</div>
            <div className="text-sm text-muted-foreground">{row.original.email}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "employee_id",
      header: "ID",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.employee_id || 'N/A'}</Badge>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <Badge variant={row.original.role === 'admin' ? 'default' : 'secondary'}>
          {row.original.role === 'admin' ? (
            <>
              <Shield className="w-3 h-3 mr-1" />
              Admin
            </>
          ) : (
            <>
              <User className="w-3 h-3 mr-1" />
              Worker
            </>
          )}
        </Badge>
      ),
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => row.original.department || 'N/A',
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'default' : 'destructive'}>
          <Activity className="w-3 h-3 mr-1" />
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      accessorKey: "phone",
      header: "Contact",
      cell: ({ row }) => (
        <div className="space-y-1">
          {row.original.phone && (
            <div className="flex items-center gap-1 text-sm">
              <Phone className="w-3 h-3" />
              {row.original.phone}
            </div>
          )}
          <div className="flex items-center gap-1 text-sm">
            <Mail className="w-3 h-3" />
            {row.original.email}
          </div>
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <ActionsCell
          onEdit={() => handleEdit(row.original)}
          onDelete={() => handleDelete(row.original.id)}
        />
      ),
    },
  ], []);

  const handleDelete = async (technicianId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', technicianId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Technician deleted successfully"
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

  const teamStats = [
    {
      label: "Total Team Members",
      value: technicians.length,
      icon: <Users className="w-5 h-5" />
    },
    {
      label: "Active Workers", 
      value: technicians.filter(t => t.role === 'worker' && t.is_active).length,
      icon: <User className="w-5 h-5" />
    },
    {
      label: "Admins",
      value: technicians.filter(t => t.role === 'admin' && t.is_active).length,
      icon: <Shield className="w-5 h-5" />
    }
  ];

  if (loading) {
    return (
      <AnimatedPage>
        <PageHeader title="Technician Management" description="Manage your technician team" />
        <ContentArea>
          <MotionContainer>
            <SkeletonTable rows={10} columns={6} />
          </MotionContainer>
        </ContentArea>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <PageHeader 
        title="Technician Management"
        description="Manage your technician team"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <ModernButton 
                variant="gradient"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => { resetForm(); setEditingTechnician(null); }}
              >
                Add Technician
              </ModernButton>
            </DialogTrigger>
            <DialogContent className="max-w-2xl glass">
              <ScrollArea className="max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    {editingTechnician ? 'Edit' : 'Add'} Technician
                  </DialogTitle>
                  <DialogDescription>
                    {editingTechnician ? 'Update' : 'Add a new'} technician to your team.
                  </DialogDescription>
                </DialogHeader>
                
                <MotionDiv variant="fadeInUp" className="p-1">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="full_name">Full Name</Label>
                        <Input 
                          id="full_name" 
                          value={formData.full_name} 
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          value={formData.email} 
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    
                    {!editingTechnician && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="password">Password</Label>
                          <Input 
                            id="password" 
                            type="password" 
                            value={formData.password} 
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="employee_id">Employee ID</Label>
                        <Input 
                          id="employee_id" 
                          value={formData.employee_id} 
                          onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input 
                          id="phone" 
                          value={formData.phone} 
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="department">Department</Label>
                        <Input 
                          id="department" 
                          value={formData.department} 
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="role">Role</Label>
                        <Select 
                          value={formData.role} 
                          onValueChange={(value: 'admin' | 'worker') => setFormData({ ...formData, role: value })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="worker">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Worker
                              </div>
                            </SelectItem>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4" />
                                Admin
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Switch 
                        id="is_active" 
                        checked={formData.is_active} 
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} 
                      />
                      <Label htmlFor="is_active" className="text-sm font-medium">
                        Active Status
                      </Label>
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <ModernButton 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </ModernButton>
                      <ModernButton 
                        type="submit"
                        variant="gradient"
                      >
                        {editingTechnician ? 'Update' : 'Add'} Technician
                      </ModernButton>
                    </div>
                  </form>
                </MotionDiv>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        }
      />
      
      <ContentArea>
        <MotionContainer className="space-y-8">
          {/* Team Stats */}
          <MotionDiv variant="fadeInUp">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {teamStats.map((stat, index) => (
                <MotionDiv key={stat.label} variant="scaleIn" delay={index * 0.1}>
                  <ModernCard variant="floating" className="text-center">
                    <div className="p-6">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl mb-4">
                        {stat.icon}
                      </div>
                      <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </div>
                  </ModernCard>
                </MotionDiv>
              ))}
            </div>
          </MotionDiv>

          {/* Data Table */}
          <MotionDiv variant="fadeInUp" delay={0.4}>
            <ModernDataTable
              columns={columns}
              data={technicians}
              loading={loading}
              searchable={true}
              searchPlaceholder="Search technicians..."
              exportable={true}
              refreshable={true}
              onRefresh={fetchTechnicians}
              filterColumns={['role', 'department']}
            />
          </MotionDiv>
        </MotionContainer>
      </ContentArea>
    </AnimatedPage>
  );
};

export default TechnicianManagementFull;
