"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "card" | "text" | "avatar" | "button";
  animated?: boolean;
}

export function ModernSkeleton({
  className,
  variant = "default",
  animated = true,
  ...props
}: SkeletonProps) {
  const baseClasses = "bg-muted rounded-md";
  const animationClasses = animated ? "animate-pulse" : "";
  
  const variantClasses = {
    default: "h-4 w-full",
    card: "h-48 w-full",
    text: "h-4",
    avatar: "h-10 w-10 rounded-full",
    button: "h-10 w-24",
  };

  return (
    <div
      className={cn(
        baseClasses,
        animationClasses,
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

// Skeleton variants for common UI patterns
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <ModernSkeleton variant="card" />
      <div className="space-y-2">
        <ModernSkeleton className="h-5 w-3/4" />
        <ModernSkeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonTable({ 
  rows = 5, 
  columns = 4,
  className 
}: { 
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex space-x-4">
        {Array.from({ length: columns }, (_, i) => (
          <ModernSkeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {Array.from({ length: columns }, (_, colIndex) => (
            <ModernSkeleton key={colIndex} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="space-y-2 p-4 rounded-lg border">
          <ModernSkeleton className="h-4 w-16" />
          <ModernSkeleton className="h-8 w-24" />
          <ModernSkeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonProfile({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center space-x-4", className)}>
      <ModernSkeleton variant="avatar" />
      <div className="space-y-2">
        <ModernSkeleton className="h-4 w-32" />
        <ModernSkeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function SkeletonForm({ 
  fields = 5,
  className 
}: { 
  fields?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6", className)}>
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-2">
          <ModernSkeleton className="h-4 w-20" />
          <ModernSkeleton className="h-10 w-full" />
        </div>
      ))}
      
      <div className="flex space-x-3 pt-4">
        <ModernSkeleton variant="button" />
        <ModernSkeleton variant="button" />
      </div>
    </div>
  );
}

export function SkeletonNavigation({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex items-center space-x-3 p-2">
          <ModernSkeleton className="h-4 w-4" />
          <ModernSkeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}