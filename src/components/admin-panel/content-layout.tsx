import { Navbar } from "@/components/admin-panel/navbar";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'worker';
}

interface ContentLayoutProps {
  title: string;
  children: React.ReactNode;
  profile: Profile | null;
  handleSignOut: () => Promise<void>;
}

export function ContentLayout({ title, children, profile, handleSignOut }: ContentLayoutProps) {
  return (
    <div>
      <Navbar title={title} profile={profile} handleSignOut={handleSignOut} />
      <div className="container pt-8 pb-8 px-4 sm:px-8">{children}</div>
    </div>
  );
}
