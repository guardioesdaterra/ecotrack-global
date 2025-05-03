import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { usePerformanceMode } from "@/hooks/use-performance-mode"

const buttonVariants = cva(
  "relative inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-black/30 text-white border border-cyan-500/30 hover:border-cyan-500/60 hover:bg-cyan-950/20 backdrop-blur-sm",
        destructive: "bg-black/30 text-red-500 border border-red-500/30 hover:border-red-500/60 hover:bg-red-950/20 backdrop-blur-sm",
        outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-black/30 text-purple-500 border border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-950/20 backdrop-blur-sm",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  icon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, icon, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const { shouldReduceAnimations } = usePerformanceMode()
    
    // Get base color for glow based on variant
    let glowColor = "rgba(6, 182, 212, 0.15)"
    
    if (variant === "destructive") {
      glowColor = "rgba(239, 68, 68, 0.15)"
    } else if (variant === "secondary") {
      glowColor = "rgba(147, 51, 234, 0.15)"
    }
    
    // Apply reduced animation class if needed
    const animationClass = shouldReduceAnimations ? "!transition-none" : ""
    
    // When asChild is true, Slot expects a single child
    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }), animationClass)}
          ref={ref}
          {...props}
        />
      )
    }
    
    // Default button rendering with minimal effects
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }), "group", animationClass)}
        ref={ref}
        {...props}
      >
        {/* Simple hover glow effect */}
        <span 
          className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            boxShadow: `0 0 8px ${glowColor}`,
          }}
        ></span>
        
        {/* Button content */}
        <span className="relative z-10 inline-flex items-center gap-x-2 text-ellipsis max-w-full">
          {icon && <span className="mr-1">{icon}</span>}
          {children}
        </span>
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
