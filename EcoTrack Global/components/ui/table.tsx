import * as React from "react"

import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto cyber-pattern">
    {/* Subtle glow behind table */}
    <div className="absolute inset-0 bg-gradient-radial from-cyan-500/5 to-transparent opacity-50 pointer-events-none"></div>
    
    {/* Subtle scan line effect */}
    <div className="absolute inset-0 scanline opacity-5 pointer-events-none"></div>
    
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead 
    ref={ref} 
    className={cn(
      "relative border-b border-cyan-500/20 bg-black/60 backdrop-blur-sm",
      className
    )} 
    {...props} 
  >
    {/* Header glow effect */}
    <tr className="absolute inset-0 pointer-events-none">
      <td colSpan={100} className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></td>
    </tr>
  </thead>
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn(
      "relative border-0 bg-black/40 backdrop-blur-sm", 
      className
    )}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "relative border-t border-cyan-500/20 bg-black/60 font-medium",
      className
    )}
    {...props}
  >
    {/* Footer glow effect */}
    <tr className="absolute inset-0 pointer-events-none">
      <td colSpan={100} className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></td>
    </tr>
  </tfoot>
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "group relative border-b border-cyan-900/20 transition-colors hover:bg-cyan-950/20 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  >
    {/* Row hover effect */}
    <td className="absolute inset-0 pointer-events-none border border-cyan-500/0 group-hover:border-cyan-500/30 transition-colors duration-300"></td>
  </tr>
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-cyan-300 [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-4 align-middle [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
