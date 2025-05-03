"use client"

import { GradientButton } from "@/components/ui/gradient-button"
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
import { useEffect, useState } from "react"

interface UserActivityStats {
  activityCount: number;
}

export function AuthButtons() {
  const { user, isLoading, signInWithGoogle, signOut } = useAuth()
  const router = useRouter()
  const [userStats, setUserStats] = useState<UserActivityStats>({ activityCount: 0 })
  const [isLoggingIn, setIsLoggingIn] = useState(false)

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
      <GradientButton 
        variant="variant" 
        disabled 
        size="sm"
        className="rounded-full"
        icon={<div className="w-3.5 h-3.5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />}
      >
        Authenticating
      </GradientButton>
    )
  }

  if (!user) {
    return (
      <GradientButton 
        variant="variant" 
        onClick={handleSignIn}
        disabled={isLoggingIn}
        size="sm"
        className="rounded-full"
        icon={isLoggingIn 
          ? <div className="w-3.5 h-3.5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          : <LogIn className="w-3.5 h-3.5" />
        }
      >
        {isLoggingIn ? "Initiating..." : "Sign In"}
      </GradientButton>
    )
  }

  // User is logged in
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <GradientButton 
          variant="variant" 
          size="sm"
          className="rounded-full flex items-center gap-2 pl-2 pr-1"
        >
          <span className="text-xs truncate max-w-[80px]">
            {user?.user_metadata?.name || user?.email || 'User'}
          </span>
          
          <Avatar className="h-6 w-6 border border-cyan-800/70">
            {user?.user_metadata?.avatar_url ? (
              <AvatarImage src={user.user_metadata.avatar_url} />
            ) : null}
            <AvatarFallback className="bg-black text-[10px] text-cyan-400">
              {getInitials(user?.user_metadata?.name || user?.email || 'U')}
            </AvatarFallback>
          </Avatar>
          
          {/* Activity indicator dot */}
          {userStats.activityCount > 0 && (
            <div className="absolute -right-0.5 -top-0.5 w-2 h-2 rounded-full bg-cyan-400 border border-black"></div>
          )}
        </GradientButton>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56 bg-black/90 border-cyan-900/50 shadow-lg shadow-cyan-950/20 backdrop-blur-md">
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
        
        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer focus:bg-cyan-950/20 focus:text-cyan-300"
          onSelect={() => router.push('/profile')}
        >
          <UserIcon className="w-4 h-4 text-cyan-400" />
          <span>View Profile</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          className="flex items-center gap-2 cursor-pointer focus:bg-cyan-950/20 focus:text-cyan-300"
          onSelect={() => router.push('/monitor')}
        >
          <BarChart2 className="w-4 h-4 text-cyan-400" />
          <span>My Data</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="bg-cyan-950/50" />
        
        <DropdownMenuItem 
          className="flex items-center gap-2 cursor-pointer focus:bg-red-950/20 focus:text-red-300 text-red-500"
          onSelect={signOut}
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
