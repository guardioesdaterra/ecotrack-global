"use client"

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Globe, Info, X } from "lucide-react";
import { getActivityColor } from "./types";

// Define the activity types for the legend
export const activityTypes = [
  { value: "reforestation", label: "Reforestation" },
  { value: "clean-up", label: "Clean-up" },
  { value: "education", label: "Education" },
  { value: "conservation", label: "Conservation" },
  { value: "renewable", label: "Renewable Energy" },
  { value: "other", label: "Other" }
];

interface MapLegendProps {
  isMobile: boolean;
}

/**
 * Map legend showing different activity types
 */
export function MapLegend({ isMobile }: MapLegendProps) {
  const [expanded, setExpanded] = useState(!isMobile);
  
  return (
    <div 
      className={`absolute ${isMobile ? 'bottom-20 left-4' : 'bottom-8 left-8'} z-[1000] transition-all duration-300`}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className={`bg-black/70 backdrop-blur-md rounded-lg border border-slate-700/50 ${expanded ? 'p-4' : 'p-2'} shadow-lg shadow-black/30`}
        style={{
          boxShadow: '0 0 20px rgba(6, 182, 212, 0.2)',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          {expanded && (
            <h3 className="text-sm font-medium text-white/90 flex items-center gap-2">
              <Globe className="h-4 w-4 text-cyan-400" />
              Activity Types
            </h3>
          )}
          <button 
            onClick={() => setExpanded(!expanded)}
            className={`w-6 h-6 rounded-full flex items-center justify-center bg-black/50 text-white/80 hover:bg-black/70 transition-colors ${expanded ? 'ml-auto' : ''}`}
          >
            {expanded ? <X className="h-3 w-3" /> : <Info className="h-3 w-3" />}
          </button>
        </div>
        
        {expanded && (
          <div className="space-y-2 mt-2">
            {activityTypes.map((type) => (
              <div key={type.value} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ 
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    border: `1.5px solid ${getActivityColor(type.value)}`,
                    boxShadow: `0 0 6px ${getActivityColor(type.value)}`
                  }}
                ></div>
                <span className="text-xs text-white/80">{type.label}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default MapLegend; 