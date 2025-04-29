"use client"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { LogIn, LogOut, User as UserIcon, Activity, BarChart2 } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabaseClient"
import { useEffect, useState, useRef } from "react"

interface UserActivityStats {
  activityCount: number;
}

export function AuthButtons() {
  const { user, isLoading, signInWithGoogle, signOut } = useAuth()
  const router = useRouter()
  const [userStats, setUserStats] = useState<UserActivityStats>({ activityCount: 0 })
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  
  // Style ref to manage dynamic styles
  const authStylesRef = useRef<HTMLStyleElement | null>(null)
  
  // Add auth-specific animations
  useEffect(() => {
    if (typeof window !== 'undefined' && !authStylesRef.current) {
      const styleEl = document.createElement('style')
      styleEl.textContent = `
        @keyframes loadingbar {
          0% {
            transform: scaleX(0);
            transform-origin: left;
          }
          50% {
            transform: scaleX(1);
            transform-origin: left;
          }
          50.1% {
            transform-origin: right;
          }
          100% {
            transform: scaleX(0);
            transform-origin: right;
          }
        }
        
        @keyframes scanning {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        
        @keyframes text-glitch {
          0% {
            text-shadow: 0.05em 0 0 rgba(6, 182, 212, 0.75), -0.05em -0.025em 0 rgba(124, 58, 237, 0.75);
          }
          14% {
            text-shadow: 0.05em 0 0 rgba(6, 182, 212, 0.75), -0.05em -0.025em 0 rgba(124, 58, 237, 0.75);
          }
          15% {
            text-shadow: -0.05em -0.025em 0 rgba(6, 182, 212, 0.75), 0.025em 0.025em 0 rgba(124, 58, 237, 0.75);
          }
          49% {
            text-shadow: -0.05em -0.025em 0 rgba(6, 182, 212, 0.75), 0.025em 0.025em 0 rgba(124, 58, 237, 0.75);
          }
          50% {
            text-shadow: 0.025em 0.05em 0 rgba(6, 182, 212, 0.75), 0.05em 0 0 rgba(124, 58, 237, 0.75);
          }
          99% {
            text-shadow: 0.025em 0.05em 0 rgba(6, 182, 212, 0.75), 0.05em 0 0 rgba(124, 58, 237, 0.75);
          }
          100% {
            text-shadow: -0.025em 0 0 rgba(6, 182, 212, 0.75), -0.025em -0.025em 0 rgba(124, 58, 237, 0.75);
          }
        }
        
        .animate-loadingbar {
          animation: loadingbar 2s infinite;
        }
      `
      document.head.appendChild(styleEl)
      authStylesRef.current = styleEl
    }
    
    return () => {
      if (authStylesRef.current) {
        authStylesRef.current.remove()
        authStylesRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error, count } = await supabase
        .from('ecotrack')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error fetching user stats:', error);
        return;
      }
      
      setUserStats({ 
        activityCount: count || 0
      });
    } catch (err) {
      console.error('Failed to fetch user stats:', err);
    }
  };

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      await signInWithGoogle();
    } finally {
      // Set a timeout just to ensure the visual feedback is shown
      setTimeout(() => setIsLoggingIn(false), 1000);
    }
  };

  if (isLoading) {
    return (
      <Button 
        variant="ghost" 
        size="sm" 
        disabled 
        className="h-8 opacity-90 bg-black/50 rounded-full overflow-hidden relative transition-all duration-300"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-950/30 to-purple-950/30"></div>
        
        {/* Scanner effect */}
        <div className="absolute -inset-1 overflow-hidden opacity-70">
          <div 
            className="absolute inset-0" 
            style={{
              backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(6, 182, 212, 0.2) 45%, rgba(6, 182, 212, 0.3) 50%, rgba(6, 182, 212, 0.2) 55%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'scanning 1.5s infinite linear'
            }}
          ></div>
        </div>
        
        {/* Border glow effect */}
        <div className="absolute -inset-px rounded-full bg-gradient-to-r from-cyan-500/30 via-purple-500/30 to-cyan-500/30 opacity-80 blur-[1px]"></div>
        
        <div className="mr-2 w-4 h-4 relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-cyan-500 opacity-70 animate-pulse"></div>
          <div className="h-2 w-2 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full animate-ping"></div>
        </div>
        
        <div className="relative">
          <span 
            className="text-xs text-cyan-400 inline-block"
            style={{
              animation: 'text-glitch 2s infinite' 
            }}
          >
            Authenticating
          </span>
          <div className="absolute left-0 right-0 -bottom-px h-[1px] bg-gradient-to-r from-cyan-500 to-transparent w-full scale-x-0 animate-loadingbar"></div>
        </div>
      </Button>
    )
  }

  if (!user) {
    return (
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleSignIn}
        disabled={isLoggingIn}
        className="h-8 bg-black/50 hover:bg-cyan-900/30 text-cyan-300 border border-cyan-900/50 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.1)] relative overflow-hidden group"
      >
        {/* Hover effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/20 to-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/0 to-cyan-500/10 opacity-0 group-hover:opacity-100 scanning-effect"></div>
        
        {/* Border Glow Effect */}
        <div className="absolute -inset-px rounded-full bg-gradient-to-r from-cyan-500/0 via-cyan-500/30 to-cyan-500/0 opacity-0 group-hover:opacity-100 blur-[1px] transition-opacity"></div>
        
        {isLoggingIn ? (
          <>
            <div className="h-3.5 w-3.5 mr-2 relative">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 rounded-full border border-cyan-400/30 animate-pulse"></div>
            </div>
            <span className="text-xs relative">
              Initiating...
              <span className="absolute -bottom-px left-0 right-0 h-[1px] bg-gradient-to-r from-cyan-500 to-transparent animate-loadingbar"></span>
            </span>
          </>
        ) : (
          <>
            <LogIn className="h-3.5 w-3.5 mr-2 relative" />
            <span className="text-xs relative">
              Sign In
              <span className="absolute -bottom-px left-0 right-0 h-[1px] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left bg-gradient-to-r from-cyan-500 to-transparent"></span>
            </span>
          </>
        )}
      </Button>
    )
  }

  // User is logged in
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 flex items-center gap-2 bg-black/60 hover:bg-cyan-900/30 border border-cyan-900/50 p-1 pl-2 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.1)] relative overflow-hidden group"
        >
          {/* Scan line effect */}
          <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div 
              className="absolute inset-0 scanning-effect"
              style={{
                background: 'linear-gradient(45deg, transparent 65%, rgba(6, 182, 212, 0.2) 70%, transparent 75%)',
                backgroundSize: '200% 200%',
                animation: 'scanning 3s ease-in-out infinite'
              }}
            ></div>
          </div>
          
          {/* Border glow effect */}
          <div className="absolute -inset-px rounded-full bg-gradient-to-r from-cyan-500/30 via-purple-500/30 to-cyan-500/30 opacity-0 group-hover:opacity-100 blur-[1px] transition-opacity"></div>
          
          <span className="text-xs text-cyan-300 truncate max-w-[80px] relative group-hover:text-cyan-200 transition-colors duration-300">
            {user.email?.split('@')[0] || user.user_metadata?.full_name?.split(' ')[0] || "User"}
            {/* Underline effect */}
            <span className="absolute -bottom-px left-0 right-0 h-[1px] bg-gradient-to-r from-cyan-500 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
          </span>
          
          <div className="relative">
            <Avatar className="h-6 w-6 border border-cyan-900/50 group-hover:border-cyan-500/50 transition-colors duration-300 relative overflow-hidden">
              {/* Avatar highlight effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none"></div>
              
              {/* Pulsing glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/0 to-purple-500/0 group-hover:from-cyan-500/30 group-hover:to-purple-500/30 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
              
              <AvatarImage 
                src={user.user_metadata?.avatar_url || ""}
                alt={user.user_metadata?.full_name || "User"}
                className="relative z-0"
              />
              <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-xs relative z-0">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                {getInitials(user.user_metadata?.full_name || user.email || "User")}
              </AvatarFallback>
            </Avatar>
            
            {/* Status indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-cyan-500 border border-black z-20">
              <div className="absolute inset-0 rounded-full bg-cyan-400 animate-pulse"></div>
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="bg-black/95 border-cyan-900/50 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-lg p-1.5 min-w-[220px] relative"
      >
        {/* Animated background effects */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Grid pattern */}
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(6, 182, 212, 0.4) 1px, transparent 1px)',
              backgroundSize: '10px 10px'
            }}
          ></div>
          
          {/* Diagonal scan line */}
          <div className="absolute inset-0 overflow-hidden opacity-10">
            <div 
              className="absolute inset-0 scanning-effect"
              style={{
                background: 'linear-gradient(45deg, transparent 65%, rgba(6, 182, 212, 0.3) 70%, transparent 75%)',
                backgroundSize: '200% 200%',
                animation: 'scanning 3s ease-in-out infinite'
              }}
            ></div>
          </div>
          
          {/* Glowing border effect */}
          <div className="absolute rounded-lg">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/80 to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
            <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-cyan-500/50 to-transparent"></div>
            <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-purple-500/50 to-transparent"></div>
          </div>
        </div>
        
        {/* User info section */}
        <div className="px-4 py-3 flex items-start gap-3 relative z-10">
          <div className="relative">
            <Avatar className="h-14 w-14 border-2 border-cyan-900/50 shadow-[0_0_10px_rgba(6,182,212,0.2)] overflow-hidden">
              {/* Inner glow */}
              <div className="absolute inset-0 opacity-20" style={{ boxShadow: "inset 0 0 8px rgba(6, 182, 212, 0.5)" }}></div>
              
              <AvatarImage 
                src={user.user_metadata?.avatar_url || ""}
                alt={user.user_metadata?.full_name || "User"}
              />
              <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-lg relative overflow-hidden">
                {/* Animated highlight */}
                <div 
                  className="absolute -inset-full h-[500%] w-[100px] opacity-20"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                    transform: 'rotate(45deg)',
                    animation: 'scanning 3s ease-in-out infinite',
                    left: '-100%'
                  }}
                ></div>
                {getInitials(user.user_metadata?.full_name || user.email || "User")}
              </AvatarFallback>
            </Avatar>
            
            {/* Status indicator */}
            <div className="absolute top-0 right-0 h-3 w-3 rounded-full bg-cyan-500 border border-black">
              <div className="absolute inset-0 rounded-full bg-cyan-400 animate-pulse"></div>
            </div>
          </div>
          
          <div className="flex flex-col">
            <p className="font-medium text-cyan-300 group relative inline-block">
              {user.user_metadata?.full_name || "User"}
              {/* Underline effect */}
              <span className="absolute -bottom-px left-0 right-0 h-[1px] bg-gradient-to-r from-cyan-500 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
            </p>
            <p className="text-xs text-gray-400 mb-2">
              {user.email}
            </p>
            <div className="flex items-center gap-1.5 text-gray-300 bg-cyan-950/20 rounded-full px-2 py-0.5 border border-cyan-900/30 shadow-[0_0_5px_rgba(6,182,212,0.1)]">
              <Activity className="h-3 w-3 text-purple-400" />
              <span className="text-xs font-medium text-cyan-400/90">
                {userStats.activityCount} {userStats.activityCount === 1 ? 'activity' : 'activities'}
              </span>
            </div>
          </div>
        </div>
        
        <DropdownMenuSeparator className="bg-gradient-to-r from-transparent via-cyan-900/50 to-transparent h-px my-1" />
        
        <DropdownMenuItem 
          className="cursor-pointer flex items-center gap-2 text-gray-300 hover:text-cyan-300 hover:bg-cyan-900/30 focus:bg-cyan-900/40 rounded-md relative px-3 py-2 group overflow-hidden"
          onClick={() => router.push("/profile")}
        >
          {/* Animated highlight on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 overflow-hidden transition-opacity duration-300">
            <div 
              className="absolute -left-[100%] top-0 bottom-0 w-10 h-full bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent group-hover:animate-[cyber-scan_2s_ease-in-out_infinite] pointer-events-none"
            ></div>
          </div>
          
          <UserIcon className="h-4 w-4 text-cyan-400 relative z-10" />
          <span className="relative z-10">Profile</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          className="cursor-pointer flex items-center gap-2 text-gray-300 hover:text-purple-300 hover:bg-purple-900/30 focus:bg-purple-900/40 rounded-md relative px-3 py-2 group overflow-hidden"
          onClick={() => router.push("/monitor")}
        >
          {/* Animated highlight on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 overflow-hidden transition-opacity duration-300">
            <div 
              className="absolute -left-[100%] top-0 bottom-0 w-10 h-full bg-gradient-to-r from-transparent via-purple-500/20 to-transparent group-hover:animate-[cyber-scan_2s_ease-in-out_infinite] pointer-events-none"
            ></div>
          </div>
          
          <BarChart2 className="h-4 w-4 text-purple-400 relative z-10" />
          <span className="relative z-10">My Activities</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="bg-gradient-to-r from-transparent via-cyan-900/50 to-transparent h-px my-1" />
        
        <DropdownMenuItem 
          className="cursor-pointer flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 focus:bg-red-900/20 rounded-md relative px-3 py-2 group overflow-hidden"
          onClick={() => signOut()}
        >
          {/* Animated highlight on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 overflow-hidden transition-opacity duration-300">
            <div 
              className="absolute -left-[100%] top-0 bottom-0 w-10 h-full bg-gradient-to-r from-transparent via-red-500/20 to-transparent group-hover:animate-[cyber-scan_2s_ease-in-out_infinite] pointer-events-none"
            ></div>
          </div>
          
          <LogOut className="h-4 w-4 relative z-10" />
          <span className="relative z-10">Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Helper function to get initials from name
function getInitials(name: string): string {
  // For email addresses, just use the first letter
  if (name.includes('@')) {
    return name.charAt(0).toUpperCase()
  }
  
  // For names, get first letter of each word
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}
