import AdminPanelLayout from "@/components/admin-panel/admin-panel-layout";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Package,
  DollarSign,
  User,
  Settings,
  LogOut,
  Wrench,
  ClipboardList,
  BarChart3,
  Shield,
  FileText
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Debug logging
  console.log('Layout Debug - Profile:', profile);
  console.log('Layout Debug - Is Admin:', isAdmin);
  console.log('Layout Debug - Profile Role:', profile?.role);

  const adminMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { icon: Calendar, label: 'Job Management', path: '/admin/jobs' },
    { icon: Users, label: 'Technicians', path: '/admin/technicians' },
    { icon: Users, label: 'Customers', path: '/admin/customers' },
    { icon: FileText, label: 'Quotes', path: '/admin/quotes' },
    { icon: Shield, label: 'Checklists', path: '/admin/checklists' },
    { icon: Package, label: 'Inventory', path: '/admin/inventory' },
    { icon: DollarSign, label: 'Financial', path: '/admin/financial' },
    { icon: BarChart3, label: 'Reports', path: '/admin/reports' },
    { icon: Settings, label: 'Settings', path: '/admin/settings' },
  ];

  const workerMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/worker' },
    { icon: ClipboardList, label: 'My Jobs', path: '/worker/jobs' },
    { icon: Package, label: 'Inventory', path: '/worker/inventory' },
    { icon: User, label: 'Profile', path: '/worker/profile' },
  ];

  const menuItems = isAdmin ? adminMenuItems : workerMenuItems;

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <AdminPanelLayout menuItems={menuItems} profile={profile} handleSignOut={handleSignOut}>
      {children}
    </AdminPanelLayout>
  );
};

export default Layout;
