"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
  Users,
  Package,
  BarChart3,
  FileText,
  Shield,
  DollarSign,
  Briefcase,
  Clock,
  MapPin,
  CheckSquare,
  Home,
  Search,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string[];
  category: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const adminCommands: CommandItem[] = [
    {
      id: "dashboard",
      title: "Dashboard",
      description: "View main dashboard",
      path: "/admin",
      icon: Home,
      shortcut: ["d"],
      category: "Navigation",
    },
    {
      id: "jobs",
      title: "Job Management",
      description: "Manage all jobs",
      path: "/admin/jobs",
      icon: Briefcase,
      shortcut: ["j"],
      category: "Operations",
    },
    {
      id: "schedule",
      title: "Schedule",
      description: "View and manage schedule",
      path: "/admin/schedule",
      icon: Calendar,
      shortcut: ["s"],
      category: "Operations",
    },
    {
      id: "customers",
      title: "Customers",
      description: "Manage customer database",
      path: "/admin/customers",
      icon: Users,
      shortcut: ["c"],
      category: "Resources",
    },
    {
      id: "technicians",
      title: "Technicians",
      description: "Manage technician team",
      path: "/admin/technicians",
      icon: User,
      shortcut: ["t"],
      category: "Team",
    },
    {
      id: "quotes",
      title: "Quotes",
      description: "Manage quotes and estimates",
      path: "/admin/quotes",
      icon: FileText,
      shortcut: ["q"],
      category: "Sales",
    },
    {
      id: "invoices",
      title: "Invoices",
      description: "Manage billing and invoices",
      path: "/admin/invoices",
      icon: DollarSign,
      shortcut: ["i"],
      category: "Sales",
    },
    {
      id: "inventory",
      title: "Inventory",
      description: "Manage parts and supplies",
      path: "/admin/inventory",
      icon: Package,
      shortcut: ["v"],
      category: "Resources",
    },
    {
      id: "reports",
      title: "Reports",
      description: "View analytics and reports",
      path: "/admin/reports",
      icon: BarChart3,
      shortcut: ["r"],
      category: "Analytics",
    },
    {
      id: "checklists",
      title: "Checklists",
      description: "Manage job checklists",
      path: "/admin/checklists",
      icon: Shield,
      shortcut: ["l"],
      category: "Team",
    },
    {
      id: "settings",
      title: "Settings",
      description: "Application settings",
      path: "/admin/settings",
      icon: Settings,
      shortcut: [","],
      category: "Settings",
    },
  ];

  const workerCommands: CommandItem[] = [
    {
      id: "dashboard",
      title: "Dashboard",
      description: "View worker dashboard",
      path: "/worker",
      icon: Home,
      shortcut: ["d"],
      category: "Navigation",
    },
    {
      id: "my-jobs",
      title: "My Jobs",
      description: "View assigned jobs",
      path: "/worker/jobs",
      icon: CheckSquare,
      shortcut: ["j"],
      category: "Work",
    },
    {
      id: "time-tracking",
      title: "Time Tracking",
      description: "Track work hours",
      path: "/worker/time-tracking",
      icon: Clock,
      shortcut: ["t"],
      category: "Work",
    },
    {
      id: "inventory",
      title: "Inventory",
      description: "Check parts availability",
      path: "/worker/inventory",
      icon: Package,
      shortcut: ["i"],
      category: "Resources",
    },
    {
      id: "profile",
      title: "Profile",
      description: "Manage your profile",
      path: "/worker/profile",
      icon: User,
      shortcut: ["p"],
      category: "Settings",
    },
  ];

  const commands = isAdmin ? adminCommands : workerCommands;

  const handleSelect = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const groupedCommands = commands.reduce((groups, command) => {
    const category = command.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(command);
    return groups;
  }, {} as Record<string, CommandItem[]>);

  return (
    <>
      <div className="hidden">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm text-muted-foreground ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Search className="h-4 w-4" />
          Search...
          <CommandShortcut>⌘K</CommandShortcut>
        </button>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {Object.entries(groupedCommands).map(([category, items]) => (
            <CommandGroup key={category} heading={category}>
              {items.map((command) => {
                const Icon = command.icon;
                return (
                  <CommandItem
                    key={command.id}
                    value={command.title}
                    onSelect={() => handleSelect(command.path)}
                    className="flex items-center gap-3 px-2 py-3"
                  >
                    <Icon className="h-4 w-4" />
                    <div className="flex-1">
                      <div className="font-medium">{command.title}</div>
                      {command.description && (
                        <div className="text-sm text-muted-foreground">
                          {command.description}
                        </div>
                      )}
                    </div>
                    {command.shortcut && (
                      <CommandShortcut>
                        {command.shortcut.map((key, index) => (
                          <React.Fragment key={key}>
                            {index > 0 && " "}
                            {key === "," ? "⌘," : key.toUpperCase()}
                          </React.Fragment>
                        ))}
                      </CommandShortcut>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}

// Hook to trigger command palette
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  const toggle = () => setOpen(!open);
  const close = () => setOpen(false);
  const show = () => setOpen(true);

  return {
    open,
    toggle,
    close,
    show,
  };
}