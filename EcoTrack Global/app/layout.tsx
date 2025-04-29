import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import type { Metadata, Viewport } from 'next'
import { Navbar } from "@/components/navbar"
import { OverlayProvider } from "@/contexts/overlay-context"
import { AuthProvider } from "@/contexts/auth-context"
import { Overlay } from "@/components/overlay"
import { Sidebar } from "@/components/sidebar"
import "./globals.css"
import "./fix-leaflet.css"
import { EffectsProvider } from '@/lib/effects'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "EcoTrack Global",
  description: "Track environmental initiatives worldwide",
  manifest: "/manifest.json",
  generator: 'Earth Guardians'
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
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <script
          src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          crossOrigin=""
          defer
        ></script>
      </head>
      <body className={`${inter.className} antialiased bg-black text-white overflow-x-hidden`}>
        {/* Global scanline effect */}
        <div className="fixed inset-0 pointer-events-none z-[999] scanline opacity-20"></div>
        
        {/* Decorative grid lines */}
        <div className="fixed inset-0 pointer-events-none z-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(90deg, rgba(6,182,212,0.15) 1px, transparent 1px), linear-gradient(rgba(6,182,212,0.15) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        ></div>
        
        {/* Cyberpunk radial gradients */}
        <div className="fixed top-0 right-0 w-[800px] h-[800px] rounded-full bg-cyan-900/5 blur-3xl pointer-events-none z-0"></div>
        <div className="fixed bottom-0 left-0 w-[800px] h-[800px] rounded-full bg-purple-900/5 blur-3xl pointer-events-none z-0"></div>
        
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <EffectsProvider initialPerformance="high">
            <AuthProvider>
              <OverlayProvider>
                <div className="flex min-h-screen h-full relative z-10">
                  <Sidebar />
                  <div className="flex-1 relative w-full">
                    <Navbar />
                    <main className="w-full h-screen pb-16 sm:pb-0">
                      {children}
                    </main>
                    <footer className="bg-black/80 backdrop-blur-md border-t border-cyan-500/20 py-4 relative overflow-hidden">
                      {/* Footer scanline effect */}
                      <div className="absolute inset-0 pointer-events-none z-0 opacity-20"
                        style={{
                          backgroundImage: 'repeating-linear-gradient(90deg, rgba(6,182,212,0.1) 0px, rgba(6,182,212,0.1) 1px, transparent 1px, transparent 4px)'
                        }}
                      ></div>
                      
                      {/* Glowing divider line */}
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
                      
                      <div className="container mx-auto px-4 relative z-10">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-2">
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
                            <p className="text-xs text-gray-400">
                              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600 font-bold text-glow-cyan">
                                EcoTrack Global
                              </span> © {new Date().getFullYear()}
                            </p>
                          </div>
                          <div className="flex gap-6">
                            <a href="#" className="text-xs text-gray-400 hover:text-cyan-400 transition relative group">
                              About
                              <span className="absolute -bottom-1 left-0 right-0 h-px bg-cyan-500/50 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
                            </a>
                            <a href="#" className="text-xs text-gray-400 hover:text-cyan-400 transition relative group">
                              Privacy
                              <span className="absolute -bottom-1 left-0 right-0 h-px bg-cyan-500/50 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
                            </a>
                            <a href="#" className="text-xs text-gray-400 hover:text-cyan-400 transition relative group">
                              Terms
                              <span className="absolute -bottom-1 left-0 right-0 h-px bg-cyan-500/50 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
                            </a>
                            <a href="#" className="text-xs text-gray-400 hover:text-cyan-400 transition relative group">
                              Contact
                              <span className="absolute -bottom-1 left-0 right-0 h-px bg-cyan-500/50 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
                            </a>
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
        </ThemeProvider>
      </body>
    </html>
  )
}
