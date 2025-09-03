"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/motion";
import { MotionButton } from "@/components/ui/motion";

const modernButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft hover:shadow-medium",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-soft",
        outline: "border border-border bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gradient: "btn-gradient hover:scale-105 active:scale-95",
        glass: "btn-glass backdrop-blur-md hover:bg-white/20 border border-white/20",
        glow: "bg-primary text-primary-foreground shadow-glow hover:shadow-neon",
        elevated: "bg-card border border-border shadow-elegant hover:shadow-floating hover:-translate-y-0.5",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
      animation: {
        none: "",
        scale: "",
        lift: "",
        glow: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      animation: "scale",
    },
  }
);

export interface ModernButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof modernButtonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  animated?: boolean;
}

const ModernButton = React.forwardRef<HTMLButtonElement, ModernButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    animation,
    loading = false, 
    leftIcon, 
    rightIcon, 
    animated = true,
    children, 
    disabled,
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading;

    const buttonContent = (
      <>
        {loading && <LoadingSpinner className="mr-2 h-4 w-4" />}
        {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </>
    );

    const buttonClass = cn(
      modernButtonVariants({ variant, size, animation, className }),
      loading && "cursor-not-allowed"
    );

    if (animated) {
      return (
        <MotionButton
          ref={ref}
          className={buttonClass}
          disabled={isDisabled}
          variant={animation}
          {...props}
        >
          {buttonContent}
        </MotionButton>
      );
    }

    return (
      <button
        ref={ref}
        className={buttonClass}
        disabled={isDisabled}
        {...props}
      >
        {buttonContent}
      </button>
    );
  }
);

ModernButton.displayName = "ModernButton";

// Specialized button components
export interface IconButtonProps
  extends Omit<ModernButtonProps, 'leftIcon' | 'rightIcon' | 'children'> {
  icon: React.ReactNode;
  'aria-label': string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = "icon", variant = "ghost", ...props }, ref) => (
    <ModernButton ref={ref} size={size} variant={variant} {...props}>
      {icon}
    </ModernButton>
  )
);

IconButton.displayName = "IconButton";

// Button group component
export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline";
  size?: "sm" | "default" | "lg";
  children: React.ReactNode;
}

export const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, variant = "default", size = "default", children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "inline-flex rounded-md shadow-sm",
        "[&>*:first-child]:rounded-l-md [&>*:first-child]:rounded-r-none",
        "[&>*:last-child]:rounded-r-md [&>*:last-child]:rounded-l-none",
        "[&>*:not(:first-child):not(:last-child)]:rounded-none",
        "[&>*:not(:first-child)]:-ml-px",
        className
      )}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            variant,
            size,
          });
        }
        return child;
      })}
    </div>
  )
);

ButtonGroup.displayName = "ButtonGroup";

// Floating action button
export interface FabProps extends ModernButtonProps {
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}

export const FloatingActionButton = React.forwardRef<HTMLButtonElement, FabProps>(
  ({ 
    className, 
    position = "bottom-right", 
    variant = "default", 
    size = "icon-lg",
    ...props 
  }, ref) => {
    const positionClasses = {
      "bottom-right": "fixed bottom-6 right-6",
      "bottom-left": "fixed bottom-6 left-6",
      "top-right": "fixed top-6 right-6",
      "top-left": "fixed top-6 left-6",
    };

    return (
      <ModernButton
        ref={ref}
        className={cn(
          "rounded-full shadow-floating hover:shadow-large z-50",
          positionClasses[position],
          className
        )}
        variant={variant}
        size={size}
        {...props}
      />
    );
  }
);

FloatingActionButton.displayName = "FloatingActionButton";

export { ModernButton };