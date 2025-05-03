import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <div className="relative group">
        {/* Background subtle glow */}
        <div className="absolute -inset-0.5 rounded-md bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-500"></div>
        
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-cyan-900/40 bg-black/50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-cyan-500/70 focus-visible:ring-1 focus-visible:ring-cyan-500/70 disabled:cursor-not-allowed disabled:opacity-50 backdrop-blur-sm shadow-[0_0_10px_rgba(6,182,212,0.03)] transition-all duration-300 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] flex items-center",
            className
          )}
          ref={ref}
          style={{ 
            lineHeight: 'normal',
            ...(props.style || {}) 
          }}
          {...props}
        />
        
        {/* Focus animation line */}
        <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500 group-focus-within:w-full transition-all duration-500 rounded-full"></div>
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
