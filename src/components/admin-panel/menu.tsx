"use client";

import { Link, useLocation } from "react-router-dom";
import { Ellipsis } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CollapseMenuButton } from "@/components/admin-panel/collapse-menu-button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider
} from "@/components/ui/tooltip";
import { LucideProps } from "lucide-react";
import { ForwardRefExoticComponent, RefAttributes } from "react";

interface MenuProps {
  isOpen: boolean | undefined;
  menuItems: {
    icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
    label: string;
    path: string;
  }[];
}

export function Menu({ isOpen, menuItems }: MenuProps) {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <ScrollArea className="[&>div>div[style]]:!block">
      <nav className="mt-8 h-full w-full">
        <ul className="flex flex-col min-h-[calc(100vh-48px-36px-16px-32px)] lg:min-h-[calc(100vh-32px-40px-32px)] items-start space-y-1 px-2">
          {menuItems.map(({ icon: Icon, label, path }, index) => (
            <li className={cn("w-full")} key={index}>
              <div className="w-full">
                <TooltipProvider disableHoverableContent>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={pathname === path ? "secondary" : "ghost"}
                        className="w-full justify-start h-10 mb-1"
                        asChild
                      >
                        <Link to={path}>
                          <span
                            className={cn(isOpen === false ? "" : "mr-4")}
                          >
                            <Icon size={18} />
                          </span>
                          <p
                            className={cn(
                              "max-w-[200px] truncate",
                              isOpen === false
                                ? "-translate-x-96 opacity-0"
                                : "translate-x-0 opacity-100"
                            )}
                          >
                            {label}
                          </p>
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    {isOpen === false && (
                      <TooltipContent side="right">
                        {label}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
            </li>
          ))}
        </ul>
      </nav>
    </ScrollArea>
  );
}
