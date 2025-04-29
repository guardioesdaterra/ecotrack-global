'use client'

import { useEffect, useRef, ReactNode, createContext, useContext, useState } from 'react'
import React from 'react'

// Tipos de efeitos disponíveis
export type EffectType = 'glitch' | 'scan' | 'pulse' | 'glow' | 'neon' | 'matrix' | 'terminal'

// Configurações de efeitos
export interface EffectConfig {
  intensity?: 'low' | 'medium' | 'high'
  color?: 'cyan' | 'purple' | 'mixed' | string
  speed?: 'slow' | 'medium' | 'fast'
  size?: 'sm' | 'md' | 'lg'
  performance?: 'low' | 'high'
}

// Contexto para compartilhar estado global de efeitos
interface EffectsContextProps {
  performanceMode: 'low' | 'high'
  setPerformanceMode: (mode: 'low' | 'high') => void
  glitchEnabled: boolean
  setGlitchEnabled: (enabled: boolean) => void
  animationsEnabled: boolean
  setAnimationsEnabled: (enabled: boolean) => void
  applyEffect: (el: HTMLElement, effect: EffectType, config?: EffectConfig) => () => void
}

const EffectsContext = createContext<EffectsContextProps | null>(null)

// Hook para usar os efeitos em qualquer componente
export const useEffects = () => {
  const context = useContext(EffectsContext)
  if (!context) {
    throw new Error('useEffects must be used within an EffectsProvider')
  }
  return context
}

// Hook para gerar animações CSS dinamicamente
export const useEffectStyles = () => {
  const styleRef = useRef<HTMLStyleElement | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || styleRef.current) return

    // Criar elemento de estilo
    const styleEl = document.createElement('style')
    styleEl.setAttribute('data-cyberpunk-effects', 'true')
    
    // Definir keyframes e classes CSS
    styleEl.textContent = `
      @keyframes cyberscan {
        0% { transform: translateY(-100%); }
        100% { transform: translateY(100%); }
      }
      
      @keyframes cyberpulse {
        0% { opacity: 0.1; transform: scale(1); }
        50% { opacity: 0.2; transform: scale(1.05); }
        100% { opacity: 0.1; transform: scale(1); }
      }
      
      @keyframes text-glitch {
        0% { text-shadow: 0.05em 0 0 rgba(6, 182, 212, 0.75), -0.05em -0.025em 0 rgba(124, 58, 237, 0.75); }
        14% { text-shadow: 0.05em 0 0 rgba(6, 182, 212, 0.75), -0.05em -0.025em 0 rgba(124, 58, 237, 0.75); }
        15% { text-shadow: -0.05em -0.025em 0 rgba(6, 182, 212, 0.75), 0.025em 0.025em 0 rgba(124, 58, 237, 0.75); }
        49% { text-shadow: -0.05em -0.025em 0 rgba(6, 182, 212, 0.75), 0.025em 0.025em 0 rgba(124, 58, 237, 0.75); }
        50% { text-shadow: 0.025em 0.05em 0 rgba(6, 182, 212, 0.75), 0.05em 0 0 rgba(124, 58, 237, 0.75); }
        99% { text-shadow: 0.025em 0.05em 0 rgba(6, 182, 212, 0.75), 0.05em 0 0 rgba(124, 58, 237, 0.75); }
        100% { text-shadow: -0.025em 0 0 rgba(6, 182, 212, 0.75), -0.025em -0.025em 0 rgba(124, 58, 237, 0.75); }
      }
      
      @keyframes marquee {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      
      @keyframes scanning {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      
      @keyframes flicker {
        0% { opacity: 1; }
        10% { opacity: 0.8; }
        12% { opacity: 1; }
        30% { opacity: 1; }
        31% { opacity: 0.6; }
        32% { opacity: 1; }
        70% { opacity: 1; }
        71% { opacity: 0.8; }
        72% { opacity: 1; }
        100% { opacity: 1; }
      }
      
      @keyframes loadingbar {
        0% { transform: scaleX(0); transform-origin: left; }
        50% { transform: scaleX(1); transform-origin: left; }
        50.1% { transform-origin: right; }
        100% { transform: scaleX(0); transform-origin: right; }
      }
      
      @keyframes matrix-rain {
        0% { top: -10%; }
        100% { top: 100%; }
      }
      
      /* Efeitos cyberpunk */
      .cyber-glitch {
        animation: text-glitch 3s infinite;
      }
      
      .cyber-glitch--low {
        animation: text-glitch 6s infinite;
      }
      
      .cyber-scan {
        position: relative;
        overflow: hidden;
      }
      
      .cyber-scan::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        background: linear-gradient(90deg, transparent 0%, rgba(6, 182, 212, 0.2) 45%, rgba(6, 182, 212, 0.3) 50%, rgba(6, 182, 212, 0.2) 55%, transparent 100%);
        background-size: 200% 100%;
        animation: scanning 3s linear infinite;
        pointer-events: none;
        opacity: 0.5;
      }
      
      .cyber-scan--low::after {
        opacity: 0.2;
        animation-duration: 6s;
      }
      
      .cyber-pulse {
        animation: cyberpulse 4s ease infinite;
      }
      
      .cyber-pulse--low {
        animation: cyberpulse 8s ease infinite;
      }
      
      .cyber-flicker {
        animation: flicker 5s linear infinite;
      }
      
      .cyber-flicker--low {
        animation: flicker 10s linear infinite;
      }
      
      .cyber-marquee {
        animation: marquee 12s linear infinite;
        display: inline-block;
        white-space: nowrap;
        width: max-content;
      }
      
      .cyber-marquee--low {
        animation: marquee 18s linear infinite;
      }
      
      .cyber-loadingbar {
        animation: loadingbar 2s infinite;
      }
      
      .cyber-loadingbar--low {
        animation: loadingbar 4s infinite;
      }

      /* Scrollbar customizado */
      .cyber-scrollbar::-webkit-scrollbar {
        width: 6px;
        background-color: rgba(0, 0, 0, 0.3);
      }
      
      .cyber-scrollbar::-webkit-scrollbar-track {
        background: linear-gradient(90deg, rgba(0, 0, 0, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%);
        border-radius: 3px;
      }
      
      .cyber-scrollbar::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, rgba(6, 182, 212, 0.7) 0%, rgba(124, 58, 237, 0.7) 100%);
        border-radius: 3px;
        border: 1px solid rgba(6, 182, 212, 0.3);
        box-shadow: 0 0 5px rgba(6, 182, 212, 0.5);
      }
      
      .cyber-scrollbar::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(180deg, rgba(6, 182, 212, 0.9) 0%, rgba(124, 58, 237, 0.9) 100%);
      }
    `
    
    // Adicionar na página
    document.head.appendChild(styleEl)
    styleRef.current = styleEl
    
    // Limpar quando componente for desmontado
    return () => {
      if (styleRef.current) {
        styleRef.current.remove()
      }
    }
  }, [])
  
  return styleRef.current !== null
}

// Componente provedor para gerenciar os efeitos globalmente
export const EffectsProvider = ({ children, initialPerformance = 'high' }: { 
  children: ReactNode, 
  initialPerformance?: 'low' | 'high' 
}) => {
  // Estados globais para controle de efeitos
  const [performanceMode, setPerformanceMode] = useState<'low' | 'high'>(initialPerformance)
  const [glitchEnabled, setGlitchEnabled] = useState(true)
  const [animationsEnabled, setAnimationsEnabled] = useState(true)
  
  // Carregar estilos CSS
  useEffectStyles()
  
  // Aplicar um efeito a um elemento HTML
  const applyEffect = (
    el: HTMLElement, 
    effect: EffectType, 
    config: EffectConfig = {}
  ): (() => void) => {
    // Verificar se animações estão habilitadas
    if (!animationsEnabled) return () => {}
    
    // Determinar intensidade com base no modo de performance
    const intensity = config.intensity || (performanceMode === 'high' ? 'medium' : 'low')
    const speed = config.speed || (performanceMode === 'high' ? 'medium' : 'slow')
    
    // Aplicar classes de acordo com o efeito solicitado
    switch (effect) {
      case 'glitch':
        if (glitchEnabled) {
          el.classList.add(intensity === 'low' ? 'cyber-glitch--low' : 'cyber-glitch')
          if (config.color) {
            el.style.setProperty('--glitch-color', typeof config.color === 'string' ? config.color : 'rgba(6, 182, 212, 0.75)')
          }
        }
        break
      
      case 'scan':
        el.classList.add(intensity === 'low' ? 'cyber-scan--low' : 'cyber-scan')
        break
      
      case 'pulse':
        el.classList.add(intensity === 'low' ? 'cyber-pulse--low' : 'cyber-pulse')
        break
      
      case 'glow':
        // Aplicar efeito de brilho via inline style
        el.style.boxShadow = intensity === 'low' 
          ? '0 0 5px rgba(6, 182, 212, 0.5)' 
          : '0 0 15px rgba(6, 182, 212, 0.8)'
        el.style.transition = 'box-shadow 0.3s ease'
        break
      
      case 'neon':
        // Bordas neon
        const color = typeof config.color === 'string' ? config.color : 'rgba(6, 182, 212, 0.8)'
        el.style.border = `1px solid ${color}`
        el.style.boxShadow = intensity === 'low' 
          ? `0 0 5px ${color}, inset 0 0 5px ${color}` 
          : `0 0 10px ${color}, inset 0 0 5px ${color}`
        break
        
      case 'matrix':
        // Efeito matrix/chuva digital
        const matrixContainer = document.createElement('div')
        matrixContainer.style.position = 'absolute'
        matrixContainer.style.top = '0'
        matrixContainer.style.left = '0'
        matrixContainer.style.right = '0'
        matrixContainer.style.bottom = '0'
        matrixContainer.style.overflow = 'hidden'
        matrixContainer.style.pointerEvents = 'none'
        matrixContainer.style.zIndex = '1'
        matrixContainer.setAttribute('data-effect', 'matrix')
        
        // Adicionar caracteres matrix que caem
        const charCount = intensity === 'low' ? 5 : 15
        for (let i = 0; i < charCount; i++) {
          const char = document.createElement('div')
          char.textContent = String.fromCharCode(33 + Math.floor(Math.random() * 94))
          char.style.position = 'absolute'
          char.style.color = 'rgba(6, 182, 212, 0.7)'
          char.style.left = `${Math.random() * 100}%`
          char.style.top = `${Math.random() * 100}%`
          char.style.fontSize = '10px'
          char.style.fontFamily = 'monospace'
          char.style.textShadow = '0 0 5px rgba(6, 182, 212, 0.7)'
          char.style.animation = `matrix-rain ${3 + Math.random() * 5}s linear infinite`
          char.style.opacity = '0.7'
          matrixContainer.appendChild(char)
        }
        
        el.appendChild(matrixContainer)
        break
      
      case 'terminal':
        // Estilo de terminal/console
        el.style.fontFamily = 'monospace, courier'
        el.style.color = '#00ff9c'
        el.style.backgroundColor = 'rgba(0, 20, 20, 0.8)'
        el.style.padding = '8px'
        el.style.borderRadius = '4px'
        el.style.border = '1px solid rgba(0, 255, 156, 0.3)'
        el.style.boxShadow = '0 0 10px rgba(0, 255, 156, 0.2)'
        
        // Cursor piscando
        const cursor = document.createElement('span')
        cursor.textContent = '▋'
        cursor.style.display = 'inline-block'
        cursor.style.animation = 'flicker 1s infinite'
        cursor.style.marginLeft = '2px'
        cursor.style.opacity = '0.7'
        el.appendChild(cursor)
        break
    }
    
    // Retornar função de limpeza
    return () => {
      el.classList.remove('cyber-glitch', 'cyber-glitch--low')
      el.classList.remove('cyber-scan', 'cyber-scan--low')
      el.classList.remove('cyber-pulse', 'cyber-pulse--low')
      el.style.boxShadow = ''
      el.style.border = ''
      el.style.fontFamily = ''
      el.style.color = ''
      el.style.backgroundColor = ''
      el.style.padding = ''
      el.style.borderRadius = ''
      
      // Remover elementos filhos específicos
      const matrixContainers = el.querySelectorAll('[data-effect="matrix"]')
      matrixContainers.forEach(container => container.remove())
    }
  }
  
  // Create context value object
  const contextValue = {
    performanceMode,
    setPerformanceMode,
    glitchEnabled,
    setGlitchEnabled,
    animationsEnabled,
    setAnimationsEnabled,
    applyEffect
  };
  
  // Use React.createElement instead of JSX
  return React.createElement(
    EffectsContext.Provider,
    { value: contextValue },
    children
  );
}

// Componentes de efeito prontos para uso
export const CyberText = ({ 
  children, 
  effect = 'glitch',
  className = '',
  config = {},
  ...props 
}: {
  children: ReactNode
  effect?: EffectType
  className?: string
  config?: EffectConfig
  [key: string]: any
}) => {
  const ref = useRef<HTMLSpanElement>(null)
  const { performanceMode } = useEffects()
  
  // Determinar classe CSS com base no modo de performance
  const effectClass = `cyber-${effect}${performanceMode === 'low' ? '--low' : ''}`  
  // Use React.createElement instead of JSX
  return React.createElement(
    'span',
    {
      ref,
      className: `${effectClass} ${className}`,
      ...props
    },
    children
  );
}

// Hooks customizados para elementos específicos
export const useCyberElement = (effect: EffectType, config?: EffectConfig) => {
  const ref = useRef<HTMLElement>(null)
  const { applyEffect } = useEffects()
  
  useEffect(() => {
    if (!ref.current) return
    
    const cleanup = applyEffect(ref.current, effect, config)
    return cleanup
  }, [effect, config, applyEffect])
  
  return ref
}

// Detecta automaticamente o nível de performance do dispositivo
export const useDetectPerformance = () => {
  const { setPerformanceMode } = useEffects()
  
  useEffect(() => {
    // Método simples para detectar performance
    const detectPerformance = () => {
      // Verificar memória disponível (se API disponível)
      const memory = Number((navigator as any).deviceMemory) || 4
      if (memory < 4) {
        return 'low'
      }
      
      // Verificar núcleos do CPU (se API disponível)
      if ('hardwareConcurrency' in navigator) {
        const cores = navigator.hardwareConcurrency || 4
        if (cores < 4) {
          return 'low' 
        }
      }
      
      // Verificar se é mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      if (isMobile) {
        return 'low'
      }
      
      return 'high'
    }
    
    // Definir modo de performance automaticamente
    setPerformanceMode(detectPerformance())
  }, [setPerformanceMode])
} 
