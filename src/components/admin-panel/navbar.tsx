import { ModeToggle } from "@/components/mode-toggle";
import { UserNav } from "@/components/admin-panel/user-nav";
import { SheetMenu } from "@/components/admin-panel/sheet-menu";
import { SyncStatus } from "@/components/SyncStatus";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'worker';
}

import { LucideProps } from "lucide-react";
import { ForwardRefExoticComponent, RefAttributes } from "react";

interface NavbarProps {
  title: string;
  profile: Profile | null;
  handleSignOut: () => Promise<void>;
  menuItems: {
    icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
    label: string;
    path: string;
  }[];
}

export function Navbar({ title, profile, handleSignOut, menuItems }: NavbarProps) {
  return (
    <header className="sticky top-0 z-10 w-full bg-background/95 shadow backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:shadow-secondary">
      <div className="mx-4 sm:mx-8 flex h-14 items-center">
        <div className="flex items-center space-x-4 lg:space-x-0">
          <SheetMenu menuItems={menuItems} />
          <h1 className="font-bold">{title}</h1>
        </div>
        <div className="flex flex-1 items-center justify-end">
          <SyncStatus />
          <ModeToggle />
          <UserNav profile={profile} handleSignOut={handleSignOut} />
        </div>
      </div>
    </header>
  );
}
