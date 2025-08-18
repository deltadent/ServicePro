import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground border-border hover:bg-accent hover:text-accent-foreground",
        success: "border-transparent bg-green-100 text-green-800 hover:bg-green-100/80",
        
        // Priority badges matching the UI design
        "priority-high": "bg-priority-high text-priority-high-foreground border-priority-high-border",
        "priority-medium": "bg-priority-medium text-priority-medium-foreground border-priority-medium-border",
        "priority-low": "bg-priority-low text-priority-low-foreground border-priority-low-border",
        
        // Status badges
        "status-todo": "bg-status-todo text-status-todo-foreground border-status-todo-border",
        "status-progress": "bg-status-progress text-status-progress-foreground border-status-progress-border",
        "status-completed": "bg-status-completed text-status-completed-foreground border-status-completed-border",
        
        // Service badges
        "service-medical": "bg-service-medical text-service-medical-foreground border-service-medical-border",
        "service-business": "bg-service-business text-service-business-foreground border-service-business-border",
        
        // Elegant variations
        "elegant-pink": "bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100",
        "elegant-purple": "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
        "elegant-blue": "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
        "elegant-green": "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
        "elegant-yellow": "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100",
        "elegant-gray": "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
      },
      size: {
        default: "px-3 py-1 rounded-full text-xs",
        sm: "px-2 py-0.5 rounded-md text-xs",
        lg: "px-4 py-1.5 rounded-full text-sm",
        pill: "px-3 py-1 rounded-full text-xs",
        square: "px-2 py-1 rounded-lg text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }