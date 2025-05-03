"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { usePerformanceMode } from "@/hooks/use-performance-mode"

const gradientButtonVariants = cva(
  [
    "gradient-button",
    "inline-flex items-center justify-center",
    "rounded-md px-4 py-2",
    "text-sm font-medium",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    "disabled:pointer-events-none disabled:opacity-50",
    "transition-all duration-300"
  ],
  {
    variants: {
      variant: {
        default: "",
        variant: "gradient-button-variant",
      },
      size: {
        default: "h-10",
        sm: "h-9 px-3 py-1.5 text-xs",
        lg: "h-11 px-6"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    },
  }
)

export interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof gradientButtonVariants> {
  asChild?: boolean
  icon?: React.ReactNode
}

const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, variant, size, asChild = false, icon, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const { shouldReduceAnimations } = usePerformanceMode()
    
    // Apply reduced animation class if needed
    const animationClass = shouldReduceAnimations ? "!transition-none" : ""

    // When asChild is true, Slot expects a single child
    if (asChild) {
      return (
        <Comp
          className={cn(gradientButtonVariants({ variant, size, className }), animationClass)}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      )
    }
    
    // Default button rendering
    return (
      <Comp
        className={cn(gradientButtonVariants({ variant, size, className }), animationClass)}
        ref={ref}
        {...props}
      >
        {icon && <span className="mr-2">{icon}</span>}
        {children}
      </Comp>
    )
  }
)
GradientButton.displayName = "GradientButton"

export { GradientButton, gradientButtonVariants } 