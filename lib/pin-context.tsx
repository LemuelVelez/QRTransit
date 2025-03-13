"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useRef } from "react"
import { AppState, type AppStateStatus } from "react-native"

type PinContextType = {
  isPinVerified: boolean
  setPinVerified: (value: boolean) => void
  clearPinVerification: () => void
}

const PinContext = createContext<PinContextType | undefined>(undefined)

export function PinProvider({ children }: { children: React.ReactNode }) {
  const [isPinVerified, setIsPinVerified] = useState<boolean>(false)
  const clearTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const setPinVerified = (value: boolean) => {
    setIsPinVerified(value)
  }

  const clearPinVerification = () => {
    setIsPinVerified(false)
  }

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // When app goes to background or inactive, set a timeout to clear PIN verification after 30 seconds
      if (nextAppState === "background" || nextAppState === "inactive") {
        console.log("App moved to background, will clear PIN verification in 30 seconds")

        // Clear any existing timeout to prevent multiple timeouts
        if (clearTimeoutRef.current) {
          clearTimeout(clearTimeoutRef.current)
        }

        // Set new timeout for 30 seconds
        clearTimeoutRef.current = setTimeout(() => {
          console.log("Clearing PIN verification after 30 second delay")
          clearPinVerification()
          clearTimeoutRef.current = null
        }, 30000) // 30 seconds in milliseconds
      } else if (nextAppState === "active") {
        // Optionally, if the app becomes active again before the timeout completes,
        // you might want to clear the timeout to prevent the PIN from being cleared
        if (clearTimeoutRef.current) {
          clearTimeout(clearTimeoutRef.current)
          clearTimeoutRef.current = null
          console.log("App returned to foreground, cancelled PIN verification timeout")
        }
      }
    }

    // Subscribe to app state changes
    const subscription = AppState.addEventListener("change", handleAppStateChange)

    // Clean up subscription and any pending timeout on unmount
    return () => {
      subscription.remove()
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current)
      }
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

