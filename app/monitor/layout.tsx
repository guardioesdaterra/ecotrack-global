"use client"

import { useEffect } from "react"
import { motion } from "framer-motion" 

export default function MonitorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Background elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div 
          className="absolute top-0 right-0 w-[70%] h-[50%] bg-gradient-to-b from-cyan-950/20 to-transparent blur-[120px] transform -translate-y-1/2 translate-x-1/3"
        />
        <div 
          className="absolute bottom-0 left-0 w-[70%] h-[50%] bg-gradient-to-t from-purple-950/20 to-transparent blur-[120px] transform translate-y-1/2 -translate-x-1/3"
        />
        <motion.div 
          className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-cyan-600/5 blur-[100px]"
          animate={{
            y: [0, -20, 0],
            opacity: [0.5, 0.8, 0.5]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-purple-600/5 blur-[100px]"
          animate={{
            y: [0, 20, 0],
            opacity: [0.5, 0.8, 0.5]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
      </div>

      {/* Main content */}
      <main>
        {children}
      </main>
    </div>
  )
} 