"use client"

import React, { createContext, useContext, useState } from "react"

type OverlayType = "submit" | "monitor" | null

interface OverlayContextType {
  overlayType: OverlayType
  showOverlay: (type: OverlayType) => void
  hideOverlay: () => void
  isOverlayVisible: boolean
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
  const isOverlayVisible = overlayType !== null

  const showOverlay = (type: OverlayType) => {
    setOverlayType(type)
    // Prevent scrolling on the body when overlay is open
    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden"
    }
  }

  const hideOverlay = () => {
    setOverlayType(null)
    // Re-enable scrolling when overlay is closed
    if (typeof document !== "undefined") {
      document.body.style.overflow = ""
    }
  }

  return (
    <OverlayContext.Provider value={{ overlayType, showOverlay, hideOverlay, isOverlayVisible }}>
      {children}
    </OverlayContext.Provider>
  )
} 