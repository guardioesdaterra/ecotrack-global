"use client"

import dynamic from 'next/dynamic'
import { useEffect, useState } from "react"

// Importar o MapClient dinamicamente para evitar problemas de SSR
const MapClient = dynamic(
  () => import("@/components/MapClient"),
  { ssr: false }
)

// Componente de carregamento enquanto o mapa está sendo carregado
function MapLoading() {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-black">
      <div className="relative animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-full blur-2xl"></div>
        <div className="h-16 w-16 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center relative">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h2a2 2 0 012-2v-1a2 2 0 012-2h1.945M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
      <p className="absolute mt-24 text-white/70">Carregando mapa global...</p>
    </div>
  )
}

// Adicionar uma visão 3D depois do mapa
function FloatingParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible" style={{ zIndex: 9900 }}>
      {/* Partículas grandes nos cantos */}
      {Array.from({ length: 20 }).map((_, i) => {
        const size = Math.random() * 15 + 5; // Partículas maiores nos cantos
        const isTop = Math.random() > 0.5;
        const isLeft = Math.random() > 0.5;
        
        // Posicionar nos cantos da tela
        const top = isTop ? (Math.random() * 20) : (80 + Math.random() * 20);
        const left = isLeft ? (Math.random() * 20) : (80 + Math.random() * 20);
        
        // Cores ciberpunk
        const colors = ['cyan', 'magenta', 'purple', 'blue', 'lime'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        // Animação diferente para cada partícula
        const animDuration = 15 + Math.random() * 20;
        const animDelay = Math.random() * 5;
        
        return (
          <div 
            key={`corner-${i}`}
            className="absolute rounded-full map-particle"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              top: `${top}%`,
              left: `${left}%`,
              backgroundColor: color,
              boxShadow: `0 0 30px ${color}, 0 0 15px ${color}`,
              opacity: 0.4 + Math.random() * 0.4,
              animation: `float-particle ${animDuration}s infinite ease-in-out ${animDelay}s, 
                         particle-pulse 3s infinite ${Math.random() * 2}s`,
              zIndex: 99999
            }}
          />
        );
      })}
      
      {/* Partículas médias distribuídas pelo mapa */}
      {Array.from({ length: 30 }).map((_, i) => {
        const size = Math.random() * 8 + 3;
        const top = 20 + Math.random() * 60;
        const left = 20 + Math.random() * 60;
        
        // Cores ciberpunk com mais opacidade
        const colors = ['rgba(0, 255, 255, 0.6)', 'rgba(255, 0, 255, 0.6)', 'rgba(148, 0, 211, 0.6)', 'rgba(0, 191, 255, 0.6)', 'rgba(50, 205, 50, 0.6)'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        // Animação mais lenta
        const animDuration = 20 + Math.random() * 30;
        const animDelay = Math.random() * 10;
        const animType = Math.random() > 0.5 ? 'float-particle' : 'float-particle-alt';
        
        return (
          <div 
            key={`mid-${i}`}
            className="absolute rounded-full map-particle"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              top: `${top}%`,
              left: `${left}%`,
              backgroundColor: color,
              boxShadow: `0 0 20px ${color}, 0 0 10px ${color}`,
              opacity: 0.3 + Math.random() * 0.3,
              animation: `${animType} ${animDuration}s infinite ease-in-out ${animDelay}s`,
              zIndex: 99995
            }}
          />
        );
      })}
      
      {/* Destaque nos cantos do mapa com gradients */}
      <div className="absolute top-0 left-0 w-[200px] h-[200px] opacity-20" 
        style={{
          background: 'radial-gradient(circle at top left, cyan, transparent 70%)',
          zIndex: 9990
        }}
      />
      <div className="absolute top-0 right-0 w-[200px] h-[200px] opacity-20" 
        style={{
          background: 'radial-gradient(circle at top right, magenta, transparent 70%)',
          zIndex: 9990
        }}
      />
      <div className="absolute bottom-0 left-0 w-[200px] h-[200px] opacity-20" 
        style={{
          background: 'radial-gradient(circle at bottom left, lime, transparent 70%)',
          zIndex: 9990
        }}
      />
      <div className="absolute bottom-0 right-0 w-[200px] h-[200px] opacity-20" 
        style={{
          background: 'radial-gradient(circle at bottom right, purple, transparent 70%)',
          zIndex: 9990
        }}
      />
    </div>
  );
}

export default function GlobePage() {
  // Estado para controlar o carregamento do mapa
  const [isLoading, setIsLoading] = useState(true)
  
  // Atividades de exemplo para testar os marcadores
  const testActivities = [
    {
      id: "1",
      lat: 0,
      lng: 0,
      type: "reforestation",
      title: "Projeto de Reflorestamento Central",
      description: "Projeto de reflorestamento no centro do mapa para testar visibilidade"
    },
    {
      id: "2", 
      lat: 20,
      lng: 20,
      type: "clean-up",
      title: "Limpeza de Oceanos",
      description: "Limpeza de oceanos no nordeste do mapa"
    },
    {
      id: "3",
      lat: -20,
      lng: -20,
      type: "education",
      title: "Educação Ambiental",
      description: "Projeto de educação ambiental no sudoeste do mapa"
    },
    {
      id: "4",
      lat: -20,
      lng: 20,
      type: "conservation",
      title: "Conservação de Espécies",
      description: "Projeto de conservação no sudeste do mapa"
    },
    {
      id: "5",
      lat: 20,
      lng: -20,
      type: "recycling",
      title: "Centro de Reciclagem",
      description: "Centro de reciclagem no noroeste do mapa"
    }
  ]
  
  // Simulação de carregamento para melhor UX
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1500)
    
    return () => clearTimeout(timer)
  }, [])
  
  return (
    <div className="w-full h-full fixed inset-0 overflow-hidden" style={{ minHeight: '100vh', touchAction: 'pan-y' }}>
      {isLoading ? (
        <MapLoading />
      ) : (
        <div className="w-full h-full">
          <MapClient 
            activities={testActivities}
            stadiaApiKey={null}
          />
        </div>
      )}
      
      {/* Overlay de debug para ajudar a visualizar o estado dos marcadores */}
      <div className="absolute top-2 right-2 z-[99999] bg-black/70 text-white text-xs px-2 py-1 rounded-md">
        Marcadores de Teste: {testActivities.length}
      </div>
      
      <FloatingParticles />
    </div>
  )
} 