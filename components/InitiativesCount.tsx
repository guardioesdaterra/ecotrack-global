"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface ImpactStats {
  projects: number;
  countries: number;
}

export function ImpactStats() {
  const [stats, setStats] = useState<ImpactStats>({
    projects: 0,
    countries: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);
      
      try {
        if (!supabase) {
          throw new Error('Supabase client not initialized');
        }
        
        // Fetch all activities
        const { data, error } = await supabase
          .from("activities")
          .select("*");
          
        if (error) {
          console.error("Error fetching activities:", error);
          setError("Failed to load statistics");
          // Use fallback data for demo
          setStats({
            projects: 32,
            countries: 86
          });
        } else if (data && data.length > 0) {
          // Calculate stats from the real data
          // 1. Project count is simply the number of activities
          const projectCount = data.length;
          
          // 2. Count unique countries
          const uniqueCountries = new Set();
          data.forEach(activity => {
            if (activity.country) {
              uniqueCountries.add(activity.country);
            }
          });
          
          setStats({
            projects: projectCount,
            countries: uniqueCountries.size
          });
        } else {
          // No data, use fallback
          setStats({
            projects: 32,
            countries: 86
          });
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("Failed to load statistics");
        // Use fallback data for demo
        setStats({
          projects: 32,
          countries: 86
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchStats();
  }, []);

  return {
    stats,
    loading,
    error
  };
}

// Individual stat components for backwards compatibility
export function InitiativesCount() {
  const { stats, loading, error } = ImpactStats();
  
  if (loading) return <span className="text-gray-400">...</span>;
  if (error) return <span className="text-xl font-bold text-green-400">32</span>;
  return <span className="text-xl font-bold text-green-400">{stats.projects}</span>;
}

export function CountriesCount() {
  const { stats, loading, error } = ImpactStats();
  
  if (loading) return <span className="text-gray-400">...</span>;
  if (error) return <span className="text-xl font-bold text-cyan-400">86</span>;
  return <span className="text-xl font-bold text-cyan-400">{stats.countries}</span>;
}

