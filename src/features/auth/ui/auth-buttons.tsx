"use client"

import { useAuth } from "../lib/auth-context"
import { LogIn, LogOut, User as UserIcon, Activity, BarChart2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { createBrowserSupabaseClient } from "@/utils/supabase/index"
import { useEffect, useState, useRef } from "react"

interface UserActivityStats {
  activityCount: number;
}

export function AuthButtons() {
  const { user, isLoading, signInWithGoogle, signOut } = useAuth()
  const router = useRouter()
  const [userStats, setUserStats] = useState<UserActivityStats>({ activityCount: 0 })
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user]);

  useEffect(() => {
    // Close dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUserStats = async () => {
    if (!user?.id) return;
    
    try {
      // Use createBrowserSupabaseClient to ensure we have a valid client
      const supabaseClient = createBrowserSupabaseClient();
      
      const { data, error, count } = await supabaseClient
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
        variant="outline" 
        disabled 
        size="sm"
        className="rounded-full"
      >
        <div className="w-3.5 h-3.5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent mr-2" />
        Authenticating
      </Button>
    )
  }

  if (!user) {
    return (
      <Button 
        variant="outline" 
        onClick={handleSignIn}
        disabled={isLoggingIn}
        size="sm"
        className="rounded-full"
      >
        {isLoggingIn 
          ? <div className="w-3.5 h-3.5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent mr-2" />
          : <LogIn className="w-3.5 h-3.5 mr-2" />
        }
        {isLoggingIn ? "Initiating..." : "Sign In"}
      </Button>
    )
  }

  // User is logged in - custom dropdown implementation
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="inline-flex items-center justify-center rounded-full h-9 w-9 text-sm font-medium border border-input bg-transparent hover:bg-accent hover:text-accent-foreground"
        onClick={() => setDropdownOpen(!dropdownOpen)}
      >
        {user?.user_metadata?.name?.substring(0, 1) || 'U'}
      </button>
      
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-black/90 border border-cyan-900/50 shadow-cyan-950/20 backdrop-blur-md p-2 z-50">
          <div className="flex flex-col p-2 gap-1.5 border-b border-cyan-950/50">
            <div className="text-xs font-medium text-cyan-300 flex justify-between items-center">
              <span>Signed in as</span>
              <span className="font-mono text-muted-foreground text-[10px]">{user?.id?.substring(0, 8)}</span>
            </div>
            <div className="text-sm truncate">{user?.user_metadata?.name || user?.email || 'User'}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          </div>
          
          <div className="p-2 border-b border-cyan-950/50">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-cyan-300">Activity Stats</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Submissions</span>
              </div>
              <div className="bg-cyan-950/30 px-1.5 rounded text-[10px] font-medium text-cyan-300 border border-cyan-900/50">
                {userStats.activityCount}
              </div>
            </div>
          </div>
          
          <button
            className="flex w-full items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-cyan-950/20 hover:text-cyan-300"
            onClick={() => {
              router.push('/profile');
              setDropdownOpen(false);
            }}
          >
            <UserIcon className="w-4 h-4 text-cyan-400" />
            <span>View Profile</span>
          </button>
          
          <button
            className="flex w-full items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-cyan-950/20 hover:text-cyan-300"
            onClick={() => {
              router.push('/monitor');
              setDropdownOpen(false);
            }}
          >
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            <span>My Data</span>
          </button>
          
          <div className="h-px my-1 bg-cyan-950/50" />
          
          <button
            className="flex w-full items-center gap-2 px-2 py-1.5 text-sm rounded-sm text-red-500 hover:bg-red-950/20 hover:text-red-300"
            onClick={() => {
              signOut();
              setDropdownOpen(false);
            }}
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}

function getInitials(name: string): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
} 