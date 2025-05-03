"use client"

import { useEffect, useState } from "react"
import { useEffects } from "@/lib/effects"

export function GlobalEffects() {
  const { shouldReduceAnimations, shouldDisableEffects } = useEffects();
  const [mounted, setMounted] = useState(false);
  
  // Only render effects after mount to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) return null;
  
  return (
    <>
      {/* Global scanline effect - disable on low performance */}
      {!shouldDisableEffects && (
        <div className="fixed inset-0 pointer-events-none z-[999] scanline opacity-20"></div>
      )}
      
      {/* Decorative grid lines - simplified on reduced animations */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-10"
        style={{
          backgroundImage: shouldReduceAnimations
            ? 'linear-gradient(90deg, rgba(6,182,212,0.15) 1px, transparent 1px)'
            : 'linear-gradient(90deg, rgba(6,182,212,0.15) 1px, transparent 1px), linear-gradient(rgba(6,182,212,0.15) 1px, transparent 1px)',
          backgroundSize: shouldReduceAnimations ? '80px 80px' : '40px 40px'
        }}
      ></div>
      
      {/* Cyberpunk radial gradients - only show on high performance */}
      {!shouldReduceAnimations && (
        <>
          <div className="fixed top-0 right-0 w-[800px] h-[800px] rounded-full bg-cyan-900/5 blur-3xl pointer-events-none z-0"></div>
          <div className="fixed bottom-0 left-0 w-[800px] h-[800px] rounded-full bg-purple-900/5 blur-3xl pointer-events-none z-0"></div>
        </>
      )}
    </>
  );
} 