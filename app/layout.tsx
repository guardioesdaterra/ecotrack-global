import type { Metadata, Viewport } from 'next'
import { ThemeProvider } from "@/components/theme-provider"
import { Navbar } from "@/components/navbar"
import { OverlayProvider } from "@/contexts/overlay-context"
import { AuthProvider } from "@/contexts/auth-context"
import { Overlay } from "@/components/overlay"
import { EffectsProvider } from '@/lib/effects'
import { GlobalEffects } from '@/components/global-effects'
import { PerformanceProvider } from '@/hooks/use-performance-mode'
import { AppShell } from '@/components/ui/app-shell'
import Script from 'next/script'
import { ViewportFix } from "@/components/ui/viewport-fix"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { fontClasses } from '@/lib/fonts'

// Import styles
import "@/styles/globals.css"
import "leaflet/dist/leaflet.css"
import "@/app/fix-leaflet.css"
import "./invert-map.css"

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

/**
 * Combined provider to reduce nesting depth
 * This reduces the provider tree depth from 7 to 3 levels
 */
function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <PerformanceProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <EffectsProvider initialPerformance="medium">
          <AuthProvider>
            <OverlayProvider>
              {children}
            </OverlayProvider>
          </AuthProvider>
        </EffectsProvider>
      </ThemeProvider>
    </PerformanceProvider>
  );
}

export default function RootLayout({ children }: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={fontClasses}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192x140.png" />
        {/* Use preconnect for external resources */}
        <link rel="preconnect" href="https://unpkg.com" />
        
        {/* Preload Leaflet CSS for faster loading with integrity check */}
        <link 
          rel="preload"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          as="style"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin="anonymous"
        />
        <link 
          rel="stylesheet" 
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin="anonymous"
        />
        
        {/* Load Leaflet with higher priority */}
        <Script 
          src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          strategy="beforeInteractive"
          integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased bg-black text-white overflow-x-hidden">
        {/* Add our viewport fix component instead of inline script */}
        <ViewportFix />
        
        {/* Wrap everything in error boundary */}
        <ErrorBoundary>
          <AppProviders>
            <GlobalEffects />
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
          </AppProviders>
        </ErrorBoundary>
      </body>
    </html>
  )
}
