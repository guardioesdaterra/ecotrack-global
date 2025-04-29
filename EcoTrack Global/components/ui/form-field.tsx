import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "./input"
import { Label } from "./label"

interface FormFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'secondary'
}

export function FormField({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  size = 'md',
  variant = 'default',
  className,
  id,
  ...props
}: FormFieldProps) {
  // Use a unique ID for the input if not provided
  const inputId = id || `form-field-${React.useId()}`
  
  // Set sizes based on the size prop
  const inputSizes = {
    sm: "h-8 text-xs",
    md: "h-10 text-sm",
    lg: "h-12 text-base"
  }
  
  // Set variants based on the variant prop
  const variants = {
    default: "border-cyan-900/40 focus-visible:border-cyan-500/70 focus-visible:ring-cyan-500/70",
    secondary: "border-purple-900/40 focus-visible:border-purple-500/70 focus-visible:ring-purple-500/70"
  }
  
  // Generate glow colors based on variant
  const glowColor = variant === 'default' 
    ? "from-cyan-500/20 via-purple-500/20 to-cyan-500/20" 
    : "from-purple-500/20 via-pink-500/20 to-purple-500/20"
  
  const focusGlowColor = variant === 'default'
    ? "from-cyan-500 via-purple-500 to-cyan-500"
    : "from-purple-500 via-pink-500 to-purple-500"
  
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label 
        htmlFor={inputId}
        className={cn(
          "text-sm font-medium mb-1 inline-block",
          variant === 'default' ? "text-cyan-300" : "text-purple-300"
        )}
      >
        {label}
      </Label>
      
      <div className="relative group">
        {/* Background subtle glow */}
        <div className={cn(
          "absolute -inset-0.5 rounded-md bg-gradient-to-r opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-500",
          glowColor
        )}></div>
        
        {/* Left icon if provided */}
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {leftIcon}
          </div>
        )}
        
        <input
          id={inputId}
          className={cn(
            "flex w-full rounded-md border bg-black/50 px-3 py-2 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 backdrop-blur-sm shadow-[0_0_10px_rgba(6,182,212,0.03)] transition-all duration-300 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]",
            inputSizes[size],
            variants[variant],
            leftIcon && "pl-10",
            rightIcon && "pr-10"
          )}
          {...props}
        />
        
        {/* Right icon if provided */}
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {rightIcon}
          </div>
        )}
        
        {/* Focus animation line */}
        <div className={cn(
          "absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r group-focus-within:w-full transition-all duration-500 rounded-full",
          focusGlowColor
        )}></div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="text-xs font-medium text-red-500 flex items-center gap-1 mt-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 8V12M12 16H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" 
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {error}
        </div>
      )}
      
      {/* Hint text */}
      {!error && hint && (
        <div className="text-xs text-gray-400 mt-1">
          {hint}
        </div>
      )}
    </div>
  )
} 