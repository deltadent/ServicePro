import { Navbar } from "@/components/admin-panel/navbar";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'worker';
}

import { LucideProps } from "lucide-react";
import { ForwardRefExoticComponent, RefAttributes } from "react";

interface ContentLayoutProps {
  title: string;
  children: React.ReactNode;
  profile: Profile | null;
  handleSignOut: () => Promise<void>;
  menuItems: {
    icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
    label: string;
    path: string;
  }[];
}

export function ContentLayout({ title, children, profile, handleSignOut, menuItems }: ContentLayoutProps) {
  return (
    <div>
      <Navbar title={title} profile={profile} handleSignOut={handleSignOut} menuItems={menuItems} />
      <div className="container pt-8 pb-8 px-4 sm:px-8">{children}</div>
    </div>
  );
}
