import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "group overflow-hidden text-primary-foreground bg-black border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)] hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:border-cyan-400/70 relative",
        destructive: "group overflow-hidden text-destructive-foreground bg-black border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)] hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:border-red-400/70",
        outline: "group overflow-hidden border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
        secondary: "group overflow-hidden text-secondary-foreground bg-black border border-purple-500/50 shadow-[0_0_10px_rgba(147,51,234,0.2)] hover:shadow-[0_0_15px_rgba(147,51,234,0.4)] hover:border-purple-400/70 relative",
        ghost: "group hover:bg-accent hover:text-accent-foreground",
        link: "group text-primary underline-offset-4 hover:underline",
        cyber: "group overflow-hidden text-white bg-black border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)] hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] relative",
        rainbow: "group overflow-hidden text-white bg-black border border-pink-500/50 shadow-[0_0_10px_rgba(236,72,153,0.3)] hover:shadow-[0_0_15px_rgba(236,72,153,0.5)] relative",
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // Determine the glow and scan colors based on variant
    let glowColor = "rgba(6, 182, 212, 0.3)"
    let scanGradient = "linear-gradient(to right, transparent, #06b6d4, transparent)"
    
    if (variant === "destructive") {
      glowColor = "rgba(239, 68, 68, 0.3)"
      scanGradient = "linear-gradient(to right, transparent, #ef4444, transparent)"
    } else if (variant === "secondary") {
      glowColor = "rgba(147, 51, 234, 0.3)"
      scanGradient = "linear-gradient(to right, transparent, #9333ea, transparent)"
    } else if (variant === "rainbow") {
      glowColor = "rgba(236, 72, 153, 0.3)"
      scanGradient = "linear-gradient(to right, transparent, #ec4899, transparent)"
    }
    
    // When asChild is true, Slot expects a single child
    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        />
      )
    }
    
    // Default button rendering with effects
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {/* Cyberpunk scan line animation */}
        <span 
          className="absolute inset-0 overflow-hidden rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `
              repeating-linear-gradient(
                to bottom,
                transparent,
                transparent 48%,
                ${glowColor} 48%,
                ${glowColor} 52%,
                transparent 52%,
                transparent 100%
              )
            `,
            backgroundSize: '100% 8px',
            mixBlendMode: 'overlay',
          }}
        ></span>
        
        {/* Hover glow effect */}
        <span className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 70%)`,
            mixBlendMode: 'overlay',
          }}
        ></span>
        
        {/* Scan animation */}
        <span 
          className="absolute inset-0 overflow-hidden rounded-md opacity-0 group-hover:opacity-100"
          style={{
            maskImage: scanGradient
          }}
        >
          <span 
            className="absolute h-full w-10 animate-[cyber-scan_2s_ease-in-out_infinite]"
            style={{
              background: scanGradient,
              left: '-100%',
            }}
          ></span>
        </span>
        
        {/* Add an inner border glow on hover */}
        <span className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            boxShadow: `inset 0 0 8px ${glowColor}`,
          }}
        ></span>
        
        {/* Actual button content */}
        <span className="relative z-10 inline-flex items-center gap-x-2 text-ellipsis max-w-full">
          {props.children}
        </span>
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
