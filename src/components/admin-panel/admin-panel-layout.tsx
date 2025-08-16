"use client";

import { Sidebar } from "@/components/admin-panel/sidebar";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";
import { LucideProps } from "lucide-react";
import { ForwardRefExoticComponent, RefAttributes } from "react";
import { useLocation } from "react-router-dom";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'worker';
}

export default function AdminPanelLayout({
  children,
  menuItems,
  profile,
  handleSignOut
}: {
  children: React.ReactNode;
  menuItems: {
    icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
    label: string;
    path: string;
  }[];
  profile: Profile | null;
  handleSignOut: () => Promise<void>;
}) {
  const { getOpenState, settings } = useSidebar();
  const location = useLocation();
  const pathname = location.pathname;
  const title = menuItems.find(item => item.path === pathname)?.label || "Dashboard";

  return (
    <>
      <Sidebar menuItems={menuItems} />
      <main
        className={cn(
          "min-h-[calc(100vh_-_56px)] bg-zinc-50 dark:bg-zinc-900 transition-[margin-left] ease-in-out duration-300",
          !settings.disabled && (!getOpenState() ? "lg:ml-[90px]" : "lg:ml-60")
        )}
      >
        <ContentLayout title={title} profile={profile} handleSignOut={handleSignOut}>
          {children}
        </ContentLayout>
      </main>
    </>
  );
}
