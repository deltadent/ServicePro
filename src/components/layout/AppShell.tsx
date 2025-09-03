"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { AnimatedPage } from "@/components/ui/motion";
import { CommandPalette } from "@/components/CommandPalette";

interface AppShellProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
  animated?: boolean;
}

export function AppShell({ 
  children, 
  sidebar, 
  header, 
  className, 
  animated = true 
}: AppShellProps) {
  const content = (
    <div className={cn("min-h-screen bg-background", className)}>
      <CommandPalette />
      
      {/* Sidebar */}
      {sidebar && (
        <aside className="fixed inset-y-0 left-0 z-50">
          {sidebar}
        </aside>
      )}

      {/* Main content area */}
      <div className={cn(
        "flex flex-col",
        sidebar && "lg:ml-64" // Adjust based on sidebar width
      )}>
        {/* Header */}
        {header && (
          <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
            {header}
          </header>
        )}

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );

  if (animated) {
    return (
      <AnimatedPage className={className}>
        {content}
      </AnimatedPage>
    );
  }

  return content;
}

// Page header component
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  className?: string;
}

export function PageHeader({ 
  title, 
  description, 
  actions, 
  breadcrumbs,
  className 
}: PageHeaderProps) {
  return (
    <div className={cn("container-modern py-6 border-b border-border/50", className)}>
      {breadcrumbs && (
        <div className="mb-4">
          {breadcrumbs}
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-responsive-xl font-bold tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-responsive text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

// Content area component
interface ContentAreaProps {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}

export function ContentArea({ children, className, padded = true }: ContentAreaProps) {
  return (
    <div className={cn(
      "flex-1",
      padded && "container-modern py-6",
      className
    )}>
      {children}
    </div>
  );
}

// Modern breadcrumbs
interface BreadcrumbProps {
  items: Array<{
    label: string;
    href?: string;
    current?: boolean;
  }>;
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn("flex items-center space-x-1 text-sm", className)}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <span className="text-muted-foreground">/</span>
          )}
          {item.href && !item.current ? (
            <a
              href={item.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </a>
          ) : (
            <span className={cn(
              item.current ? "text-foreground font-medium" : "text-muted-foreground"
            )}>
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

// Quick stats bar
interface QuickStatsProps {
  stats: Array<{
    label: string;
    value: string | number;
    trend?: {
      value: number;
      isPositive: boolean;
    };
    icon?: React.ReactNode;
  }>;
  className?: string;
}

export function QuickStats({ stats, className }: QuickStatsProps) {
  return (
    <div className={cn(
      "grid grid-cols-2 md:grid-cols-4 gap-4 mb-6",
      className
    )}>
      {stats.map((stat, index) => (
        <div 
          key={index}
          className="bg-card rounded-lg p-4 border border-border shadow-soft"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </p>
              <p className="text-2xl font-bold mt-1">
                {stat.value}
              </p>
              {stat.trend && (
                <p className={cn(
                  "text-xs mt-1 flex items-center gap-1",
                  stat.trend.isPositive ? "text-green-600" : "text-red-600"
                )}>
                  {stat.trend.isPositive ? "↗" : "↘"} 
                  {Math.abs(stat.trend.value)}%
                </p>
              )}
            </div>
            {stat.icon && (
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                {stat.icon}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Empty state component
interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({ 
  title, 
  description, 
  action, 
  icon,
  className 
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center py-12",
      className
    )}>
      {icon && (
        <div className="mb-4 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground mb-6 max-w-sm">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}