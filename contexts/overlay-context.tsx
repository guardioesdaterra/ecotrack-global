"use client"

import React, { createContext, useContext, useState } from "react"

type OverlayType = "submit" | "monitor" | "edit" | "view" | null

interface OverlayContextType {
  overlayType: OverlayType;
  editActivityId?: string;
  showOverlay: (type: OverlayType, activityId?: string) => void;
  hideOverlay: () => void;
  isOverlayVisible: boolean;
}

const OverlayContext = createContext<OverlayContextType>({
  overlayType: null,
  showOverlay: () => {},
  hideOverlay: () => {},
  isOverlayVisible: false,
})

export const useOverlay = () => useContext(OverlayContext)

export const OverlayProvider = ({ 
  children 
}: { 
  children: React.ReactNode 
}) => {
  const [overlayType, setOverlayType] = useState<OverlayType>(null)
  const [editActivityId, setEditActivityId] = useState<string | undefined>(undefined)
  const isOverlayVisible = overlayType !== null

  const showOverlay = (type: OverlayType, activityId?: string) => {
    setOverlayType(type)
    if ((type === 'edit' || type === 'view') && activityId) {
      setEditActivityId(activityId)
    }
    // Prevent scrolling on the body when overlay is open
    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden"
    }
  }

  const hideOverlay = () => {
    setOverlayType(null)
    setEditActivityId(undefined)
    // Re-enable scrolling when overlay is closed
    if (typeof document !== "undefined") {
      document.body.style.overflow = ""
    }
  }

  return (
    <OverlayContext.Provider 
      value={{ 
        overlayType, 
        editActivityId, 
        showOverlay, 
        hideOverlay, 
        isOverlayVisible 
      }}
    >
      {children}
    </OverlayContext.Provider>
  )
} 