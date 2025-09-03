"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { MotionCard } from "@/components/ui/motion";

const cardVariants = cva(
  "rounded-lg border text-card-foreground transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-card border-border shadow-soft",
        elevated: "bg-card border-border shadow-elegant hover:shadow-floating",
        glass: "glass",
        floating: "card-floating",
        gradient: "bg-gradient-to-br from-primary/5 to-secondary/5 border-border/50 shadow-soft",
        outline: "border-2 border-border bg-transparent hover:bg-accent/5",
      },
      size: {
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
        xl: "p-10",
      },
      interactive: {
        true: "cursor-pointer hover:scale-[1.01] active:scale-[0.99]",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      interactive: false,
    },
  }
);

export interface ModernCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  animated?: boolean;
  children: React.ReactNode;
}

const ModernCard = React.forwardRef<HTMLDivElement, ModernCardProps>(
  ({ className, variant, size, interactive, animated = true, children, ...props }, ref) => {
    if (animated) {
      return (
        <MotionCard
          className={cn(cardVariants({ variant, size, interactive, className }))}
          {...props}
        >
          {children}
        </MotionCard>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, size, interactive, className }))}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ModernCard.displayName = "ModernCard";

const ModernCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 pb-4", className)}
    {...props}
  />
));
ModernCardHeader.displayName = "ModernCardHeader";

const ModernCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  }
>(({ className, as: Comp = "h3", ...props }, ref) => (
  <Comp
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
ModernCardTitle.displayName = "ModernCardTitle";

const ModernCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
ModernCardDescription.displayName = "ModernCardDescription";

const ModernCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex-1", className)} {...props} />
));
ModernCardContent.displayName = "ModernCardContent";

const ModernCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-4", className)}
    {...props}
  />
));
ModernCardFooter.displayName = "ModernCardFooter";

// Specialized card components
export interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  className?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  description,
  trend,
  icon,
  className,
}) => (
  <ModernCard variant="elevated" className={cn("relative overflow-hidden", className)}>
    <ModernCardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <ModernCardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </ModernCardTitle>
        {icon && (
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            {icon}
          </div>
        )}
      </div>
    </ModernCardHeader>
    <ModernCardContent>
      <div className="text-2xl font-bold">{value}</div>
      <div className="flex items-center justify-between mt-2">
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <span
            className={cn(
              "text-xs font-medium flex items-center gap-1",
              trend.isPositive ? "text-green-600" : "text-red-600"
            )}
          >
            {trend.isPositive ? "↗" : "↘"} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
    </ModernCardContent>
  </ModernCard>
);

// Feature card with icon
export interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon,
  onClick,
  className,
}) => (
  <ModernCard
    variant="floating"
    interactive={!!onClick}
    onClick={onClick}
    className={cn("group", className)}
  >
    <ModernCardContent className="space-y-4">
      <div className="p-3 bg-primary/10 rounded-xl w-fit group-hover:bg-primary/20 transition-colors duration-200">
        <div className="text-primary">{icon}</div>
      </div>
      <div className="space-y-2">
        <ModernCardTitle className="group-hover:text-primary transition-colors duration-200">
          {title}
        </ModernCardTitle>
        <ModernCardDescription>{description}</ModernCardDescription>
      </div>
    </ModernCardContent>
  </ModernCard>
);

export {
  ModernCard,
  ModernCardHeader,
  ModernCardFooter,
  ModernCardTitle,
  ModernCardDescription,
  ModernCardContent,
};