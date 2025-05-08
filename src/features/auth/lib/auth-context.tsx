"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import type { Database } from "@/types/supabase"
import { createBrowserSupabaseClient } from "@/utils/supabase/index"

// Type for the auth context
interface AuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
})

// Hook to use the auth context
export const useAuth = () => useContext(AuthContext)

// Provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  const supabase = createBrowserSupabaseClient()
  const router = useRouter()

  // Initialize - Check for existing session
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true)
        
        // Get session data if there is an active session
        const { data: { session: activeSession } } = await supabase.auth.getSession()
        
        if (activeSession) {
          setSession(activeSession)
          setUser(activeSession.user)
        }
      } catch (error) {
        console.error("Error initializing auth:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initialize()
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user || null)
      setIsLoading(false)
    })
    
    // Clean up subscription
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      
      if (error) {
        throw error
      }
    } catch (error) {
      console.error("Error signing in with Google:", error)
    }
  }
  
  // Sign out
  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }
  
  // Context value
  const value = {
    user,
    session,
    isLoading,
    signInWithGoogle,
    signOut,
  }
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 