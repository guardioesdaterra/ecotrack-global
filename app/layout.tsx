import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import type { Metadata, Viewport } from 'next'
import { Navbar } from "@/components/navbar"
import { OverlayProvider } from "@/contexts/overlay-context"
import { AuthProvider } from "@/contexts/auth-context"
import { Overlay } from "@/components/overlay"
import { EffectsProvider } from '@/lib/effects'
import { GlobalEffects } from '@/components/global-effects'
import { PerformanceProvider } from '@/hooks/use-performance-mode'
import { AppShell } from '@/components/ui/app-shell'
import Script from 'next/script'
import "@/styles/globals.css"
import "leaflet/dist/leaflet.css"
import "@/app/fix-leaflet.css"
import "./invert-map.css"

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap', // Melhora a performance ao exibir fonte
  variable: '--font-inter',
  preload: true 
})

export const metadata: Metadata = {
  title: "EcoTrack Global",
  description: "Track environmental initiatives worldwide",
  manifest: "/manifest.json",
  generator: 'Earth Guardians',
  keywords: 'ecotrack, sustentabilidade, meio ambiente, visualização, mapa, atividades ambientais',
  authors: [{ name: 'EcoTrack Team' }],
  metadataBase: new URL('https://ecotrack.global'),
  openGraph: {
    title: 'EcoTrack Global',
    description: 'Rastreamento e Visualização de Atividades Ambientais Globais',
    url: 'https://ecotrack.global',
    siteName: 'EcoTrack Global',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
}

export default function RootLayout({ children }: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon-192x140.png" />
        {/* Preload Leaflet CSS for faster loading */}
        <link 
          rel="preload"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          as="style"
        />
        <link 
          rel="stylesheet" 
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          crossOrigin=""
        />
        {/* Load Leaflet with higher priority */}
        <Script 
          src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          strategy="beforeInteractive"
          crossOrigin=""
        />
        
        {/* Script para corrigir o problema de altura viewport em mobile */}
        <Script id="viewport-fix" strategy="afterInteractive">
          {`
            // Fix para altura de viewport em dispositivos móveis
            function setMobileViewportHeight() {
              // First we get the viewport height and we multiple it by 1% to get a value for a vh unit
              let vh = window.innerHeight * 0.01;
              // Then we set the value in the --vh custom property to the root of the document
              document.documentElement.style.setProperty('--vh', \`\${vh}px\`);
              
              // Também força o mapa a preencher a altura correta
              const mapElements = document.querySelectorAll('.leaflet-container');
              mapElements.forEach(el => {
                if (el instanceof HTMLElement) {
                  el.style.height = \`\${window.innerHeight}px\`;
                }
              });
            }

            // Executa quando a página carrega
            setMobileViewportHeight();

            // Executa quando o tamanho da janela muda
            window.addEventListener('resize', () => {
              setMobileViewportHeight();
            });

            // Adiciona listener para orientationchange para dispositivos móveis
            window.addEventListener('orientationchange', () => {
              setTimeout(setMobileViewportHeight, 100);
            });
          `}
        </Script>
      </head>
      <body className={`${inter.className} antialiased bg-black text-white overflow-x-hidden`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <PerformanceProvider>
            <EffectsProvider initialPerformance="medium">
              <GlobalEffects />
              <AuthProvider>
                <OverlayProvider>
                  <div className="flex min-h-screen h-full relative z-10">
                    <div className="flex-1 relative w-full">
                      <Navbar />
                      <main className="w-full h-screen pb-0">
                        <AppShell>
                          {children}
                        </AppShell>
                      </main>
                      <footer className="bg-black/80 backdrop-blur-md border-t border-cyan-500/20 py-4 relative overflow-hidden">
                        {/* Simplified footer styling */}
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
                        
                        <div className="container mx-auto px-4 relative z-10">
                          <div className="flex flex-col md:flex-row justify-between items-center gap-2">
                            <div className="flex items-center gap-2">
                              <div className="h-5 w-5 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600"></div>
                              <p className="text-xs text-gray-400">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600 font-bold">
                                  EcoTrack Global
                                </span> © {new Date().getFullYear()}
                              </p>
                            </div>
                            <div className="flex gap-6">
                              <a href="#" className="text-xs text-gray-400 hover:text-cyan-400 transition">About</a>
                              <a href="#" className="text-xs text-gray-400 hover:text-cyan-400 transition">Privacy</a>
                              <a href="#" className="text-xs text-gray-400 hover:text-cyan-400 transition">Terms</a>
                              <a href="#" className="text-xs text-gray-400 hover:text-cyan-400 transition">Contact</a>
                            </div>
                          </div>
                        </div>
                      </footer>
                    </div>
                  </div>
                  <Overlay />
                </OverlayProvider>
              </AuthProvider>
            </EffectsProvider>
          </PerformanceProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
