import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 cursor-default",
  {
    variants: {
      variant: {
        default:
          "bg-cyan-900/50 text-cyan-300 border border-cyan-900/50 hover:bg-cyan-900/60",
        secondary:
          "bg-gray-800/50 text-gray-300 border border-gray-700/50 hover:bg-gray-800/60",
        destructive:
          "bg-red-900/50 text-red-300 border border-red-900/50 hover:bg-red-900/60",
        outline:
          "text-cyan-300 border border-cyan-600/50 hover:bg-cyan-900/20",
        success:
          "bg-green-900/50 text-green-300 border border-green-900/50 hover:bg-green-900/60",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
