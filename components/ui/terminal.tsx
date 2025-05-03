import * as React from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface TerminalProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  variant?: "primary" | "secondary" | "warning" | "error" | "success"
  autoScroll?: boolean
  maxHeight?: string
  decorative?: boolean
  content?: string
}

const terminalVariants = {
  primary: {
    border: "border-cyan-500/40",
    glow: "rgba(6, 182, 212, 0.3)",
    title: "text-cyan-400",
    accent: "bg-cyan-500"
  },
  secondary: {
    border: "border-purple-500/40",
    glow: "rgba(147, 51, 234, 0.3)",
    title: "text-purple-400",
    accent: "bg-purple-500"
  },
  warning: {
    border: "border-yellow-500/40",
    glow: "rgba(234, 179, 8, 0.3)",
    title: "text-yellow-400",
    accent: "bg-yellow-500" 
  },
  error: {
    border: "border-red-500/40",
    glow: "rgba(239, 68, 68, 0.3)",
    title: "text-red-400",
    accent: "bg-red-500"
  },
  success: {
    border: "border-green-500/40",
    glow: "rgba(34, 197, 94, 0.3)",
    title: "text-green-400",
    accent: "bg-green-500"
  }
}

export function Terminal({
  children,
  title = "Terminal",
  variant = "primary",
  autoScroll = false,
  maxHeight = "300px",
  decorative = false,
  content = "",
  className,
  ...props
}: TerminalProps) {
  const terminalRef = React.useRef<HTMLDivElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const variantStyles = terminalVariants[variant]
  
  const [isTyping, setIsTyping] = React.useState(decorative && !!content)
  const [displayedContent, setDisplayedContent] = React.useState<string>("")
  
  // Auto-scroll to bottom when content changes
  React.useEffect(() => {
    if (autoScroll && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [children, displayedContent, autoScroll])
  
  // Simulated typing animation for decorative mode
  React.useEffect(() => {
    if (decorative && content && isTyping) {
      let charIndex = 0
      const typingSpeed = 50 // milliseconds per character
      
      const typingInterval = setInterval(() => {
        if (charIndex < content.length) {
          setDisplayedContent(content.substring(0, charIndex + 1))
          charIndex++
        } else {
          clearInterval(typingInterval)
          setIsTyping(false)
        }
      }, typingSpeed)
      
      return () => clearInterval(typingInterval)
    }
  }, [content, decorative, isTyping])
  
  return (
    <div 
      ref={terminalRef}
      className={cn(
        "relative rounded-md bg-black/70 backdrop-blur-sm",
        variantStyles.border,
        "border shadow-lg overflow-hidden",
        `shadow-[0_0_15px_${variantStyles.glow}]`,
        className
      )}
      {...props}
    >
      {/* Terminal header */}
      <div className="flex items-center px-4 h-8 bg-black/60 border-b border-opacity-40 relative" style={{ borderColor: `var(--${variant}-color)` }}>
        {/* Controls */}
        <div className="flex items-center space-x-2 absolute left-3">
          <div className="w-3 h-3 rounded-full bg-red-500 opacity-80"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-80"></div>
          <div className="w-3 h-3 rounded-full bg-green-500 opacity-80"></div>
        </div>
        
        {/* Title */}
        <div className={cn("flex-1 text-center text-xs font-mono font-medium", variantStyles.title)}>
          {title}
        </div>
        
        {/* Decorative elements */}
        <div className="flex items-center space-x-1 absolute right-3">
          <div className="w-4 h-1 bg-gray-500 opacity-50 rounded-sm"></div>
          <motion.div 
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={cn("w-1.5 h-1.5 rounded-full", variantStyles.accent)} 
          />
        </div>
      </div>
      
      {/* Activity indicator */}
      <div className="absolute top-8 left-0 right-0 h-0.5 overflow-hidden">
        <motion.div 
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className={cn("h-full w-1/4", variantStyles.accent, "opacity-60")}
        />
      </div>
      
      {/* Content */}
      <div 
        ref={contentRef}
        className={cn(
          "font-mono text-xs p-4 text-gray-300 overflow-auto cyberpunk-scrollbar animate-data-flow",
          isTyping ? "typing-cursor" : ""
        )}
        style={{ maxHeight }}
      >
        {decorative && content ? displayedContent : children}
      </div>
      
      {/* Scanline effect */}
      <div className="absolute inset-0 scanline opacity-10 pointer-events-none"></div>
      
      {/* Grid pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(to right, ${variantStyles.glow} 1px, transparent 1px),
            linear-gradient(to bottom, ${variantStyles.glow} 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      ></div>
    </div>
  )
} 