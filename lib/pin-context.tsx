"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { AppState, AppStateStatus } from "react-native"

type PinContextType = {
  isPinVerified: boolean
  setPinVerified: (value: boolean) => void
  clearPinVerification: () => void
}

const PinContext = createContext<PinContextType | undefined>(undefined)

export function PinProvider({ children }: { children: React.ReactNode }) {
  const [isPinVerified, setIsPinVerified] = useState<boolean>(false)

  const setPinVerified = (value: boolean) => {
    setIsPinVerified(value)
  }

  const clearPinVerification = () => {
    setIsPinVerified(false)
  }

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // When app goes to background or inactive, clear PIN verification
      if (nextAppState === "background" || nextAppState === "inactive") {
        console.log("App moved to background, clearing PIN verification")
        clearPinVerification()
      }
    }

    // Subscribe to app state changes
    const subscription = AppState.addEventListener("change", handleAppStateChange)

    // Clean up subscription on unmount
    return () => {
      subscription.remove()
    }
  }, [])

  return (
    <PinContext.Provider value={{ isPinVerified, setPinVerified, clearPinVerification }}>
      {children}
    </PinContext.Provider>
  )
}

export function usePinVerification() {
  const context = useContext(PinContext)
  if (context === undefined) {
    throw new Error("usePinVerification must be used within a PinProvider")
  }
  return context
}
