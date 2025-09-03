"use client";

import { motion, HTMLMotionProps, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

// Animation variants
export const fadeInUp: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 1, 1],
    },
  },
};

export const fadeInDown: Variants = {
  initial: {
    opacity: 0,
    y: -20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 1, 1],
    },
  },
};

export const scaleIn: Variants = {
  initial: {
    opacity: 0,
    scale: 0.9,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 1, 1],
    },
  },
};

export const slideInLeft: Variants = {
  initial: {
    opacity: 0,
    x: -20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 1, 1],
    },
  },
};

export const slideInRight: Variants = {
  initial: {
    opacity: 0,
    x: 20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 1, 1],
    },
  },
};

export const stagger: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const pageTransition: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 1, 1],
    },
  },
};

// Motion components with predefined animations
interface MotionDivProps extends HTMLMotionProps<"div"> {
  variant?: keyof typeof animationVariants;
  delay?: number;
  duration?: number;
}

const animationVariants = {
  fadeInUp,
  fadeInDown,
  scaleIn,
  slideInLeft,
  slideInRight,
  pageTransition,
};

export const MotionDiv = ({
  children,
  className,
  variant = "fadeInUp",
  delay = 0,
  duration,
  variants,
  ...props
}: MotionDivProps) => {
  const selectedVariants = variants || animationVariants[variant];
  
  // Override duration if provided
  if (duration && selectedVariants.animate) {
    if (typeof selectedVariants.animate === 'object' && 'transition' in selectedVariants.animate) {
      selectedVariants.animate.transition = {
        ...selectedVariants.animate.transition,
        duration,
        delay,
      };
    }
  }

  return (
    <motion.div
      className={className}
      variants={selectedVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const MotionContainer = ({
  children,
  className,
  ...props
}: HTMLMotionProps<"div">) => {
  return (
    <motion.div
      className={cn("space-y-4", className)}
      variants={stagger}
      initial="initial"
      animate="animate"
      exit="exit"
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Hover animations
export const hoverScale = {
  whileHover: { 
    scale: 1.02,
    transition: { duration: 0.2 }
  },
  whileTap: { 
    scale: 0.98,
    transition: { duration: 0.1 }
  },
};

export const hoverLift = {
  whileHover: { 
    y: -2,
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    transition: { duration: 0.2 }
  },
};

export const hoverGlow = {
  whileHover: { 
    boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)",
    transition: { duration: 0.2 }
  },
};

// Button motion component
interface MotionButtonProps extends HTMLMotionProps<"button"> {
  variant?: "scale" | "lift" | "glow";
}

export const MotionButton = ({
  children,
  className,
  variant = "scale",
  ...props
}: MotionButtonProps) => {
  const hoverVariants = {
    scale: hoverScale,
    lift: hoverLift,
    glow: hoverGlow,
  };

  return (
    <motion.button
      className={className}
      {...hoverVariants[variant]}
      {...props}
    >
      {children}
    </motion.button>
  );
};

// Card motion component
export const MotionCard = ({
  children,
  className,
  ...props
}: HTMLMotionProps<"div">) => {
  return (
    <motion.div
      className={cn("card-floating", className)}
      variants={scaleIn}
      initial="initial"
      animate="animate"
      exit="exit"
      {...hoverLift}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Loading animations
export const LoadingSpinner = ({ className }: { className?: string }) => (
  <motion.div
    className={cn("w-6 h-6 border-2 border-primary border-t-transparent rounded-full", className)}
    animate={{ rotate: 360 }}
    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
  />
);

export const LoadingDots = ({ className }: { className?: string }) => (
  <div className={cn("flex space-x-1", className)}>
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="w-2 h-2 bg-primary rounded-full"
        animate={{ y: [0, -8, 0] }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          delay: i * 0.1,
        }}
      />
    ))}
  </div>
);

// Page wrapper with animation
export const AnimatedPage = ({
  children,
  className,
  ...props
}: HTMLMotionProps<"div">) => {
  return (
    <motion.div
      className={cn("min-h-screen", className)}
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      {...props}
    >
      {children}
    </motion.div>
  );
};