"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"
import { usePerformanceMode } from "@/hooks/use-performance-mode"
import { useEffect, useState } from "react"

// Tipos para os itens de navegação
interface NavItem {
  title: string
  href: string
  icon?: React.ReactNode
}

// Propriedades do componente de navegação
export interface NavigationProps {
  items: NavItem[]
  className?: string
}

export function Navigation({ items, className }: NavigationProps) {
  const pathname = usePathname()
  const isMobile = useMediaQuery("(max-width: 768px)")
  const { performanceMode, shouldReduceAnimations, optimizeForNavigation } = usePerformanceMode()
  const [lastNavTime, setLastNavTime] = useState(0)
  
  // Otimizar renderização baseada no modo de performance
  const isHighPerformance = performanceMode === "high"
  const optimizedTransition = shouldReduceAnimations 
    ? { duration: 0.1 } 
    : { type: "spring", stiffness: 400, damping: 30, duration: 0.2 }
  
  // Adicionar função para controlar cliques na navegação
  const handleNavClick = () => {
    // Evitar otimização repetida em cliques rápidos
    const now = Date.now()
    if (now - lastNavTime > 300) {
      setLastNavTime(now)
      optimizeForNavigation(true)
    }
  }
  
  // Listener para restaurar o modo normal após a navegação
  useEffect(() => {
    // Detectar quando a navegação foi concluída
    const handleNavComplete = () => {
      // Esperar que o DOM esteja estável
      setTimeout(() => {
        optimizeForNavigation(false)
      }, 300)
    }
    
    // O useEffect com dependência de pathname dispara quando a navegação foi concluída
    handleNavComplete()
  }, [pathname, optimizeForNavigation])
  
  return (
    <nav className={cn("flex items-center", className)}>
      {items.map((item) => {
        const isActive = pathname === item.href
        
        return (
          <Link 
            key={item.href} 
            href={item.href}
            onClick={handleNavClick}
            className={cn(
              "relative px-3 py-2 text-sm font-medium transition-colors duration-200 hover:text-foreground flex items-center gap-1",
              isActive ? "text-foreground" : "text-foreground/60",
              shouldReduceAnimations ? "transition-none" : ""
            )}
          >
            {item.icon && (
              <span className="h-4 w-4 mr-1">{item.icon}</span>
            )}
            {item.title}
            
            {/* Indicador de item ativo - animado apenas em dispositivos de alta performance */}
            {isActive && !shouldReduceAnimations && (
              <motion.div
                className="absolute -bottom-px left-0 right-0 h-[2px] bg-primary rounded-full"
                layoutId="navigation-indicator"
                transition={optimizedTransition}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
            )}
            
            {/* Alternativa não animada para dispositivos de baixo desempenho */}
            {isActive && shouldReduceAnimations && (
              <div className="absolute -bottom-px left-0 right-0 h-[2px] bg-primary rounded-full" />
            )}
          </Link>
        )
      })}
    </nav>
  )
} 