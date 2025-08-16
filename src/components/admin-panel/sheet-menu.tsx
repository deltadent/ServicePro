import { Link } from "react-router-dom";
import { MenuIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetHeader,
  SheetContent,
  SheetTrigger,
  SheetTitle
} from "@/components/ui/sheet";
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
    BarChart3
  } from "lucide-react";
import { Menu } from "./menu";

export function SheetMenu() {
    const { isAdmin } = useAuth();
    const adminMenuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
        { icon: Calendar, label: 'Job Management', path: '/admin/jobs' },
        { icon: Users, label: 'Technicians', path: '/admin/technicians' },
        { icon: Users, label: 'Customers', path: '/admin/customers' },
        { icon: Package, label: 'Inventory', path: '/admin/inventory' },
        { icon: DollarSign, label: 'Financial', path: '/admin/financial' },
        { icon: BarChart3, label: 'Reports', path: '/admin/reports' },
      ];
    
      const workerMenuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/worker' },
        { icon: ClipboardList, label: 'My Jobs', path: '/worker/jobs' },
        { icon: Package, label: 'Inventory', path: '/worker/inventory' },
        { icon: User, label: 'Profile', path: '/worker/profile' },
      ];
    
      const menuItems = isAdmin ? adminMenuItems : workerMenuItems;
  return (
    <Sheet>
      <SheetTrigger className="lg:hidden" asChild>
        <Button className="h-8" variant="outline" size="icon">
          <MenuIcon size={20} />
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:w-72 px-3 h-full flex flex-col" side="left">
        <SheetHeader>
          <div className="flex justify-center items-center pb-2 pt-1">
            <Wrench className="w-6 h-6 mr-1" />
            <SheetTitle className="font-bold text-lg">ServicePro</SheetTitle>
          </div>
        </SheetHeader>
        <Menu isOpen menuItems={menuItems} />
      </SheetContent>
    </Sheet>
  );
}
