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
    BarChart3,
    FileText,
    Shield
  } from "lucide-react";
import { Menu } from "./menu";
import { LucideProps } from "lucide-react";
import { ForwardRefExoticComponent, RefAttributes } from "react";

export function SheetMenu({ menuItems }: {
  menuItems: {
    icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
    label: string;
    path: string;
  }[];
}) {
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
