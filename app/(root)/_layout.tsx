"use client"

import { Redirect, Slot } from "expo-router"
import { ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useEffect, useState } from "react"
import { getCurrentSession } from "../../lib/appwrite"

export default function AppLayout() {
  const [isLogged, setIsLogged] = useState<boolean | null>(null)

  useEffect(() => {
    async function checkSession() {
      const session = await getCurrentSession()
      setIsLogged(!!session)
    }

    checkSession()
  }, [])

  // Still loading - session check in progress
  if (isLogged === null) {
    return (
      <SafeAreaView className="bg-transparent h-full flex justify-center items-center">
        <ActivityIndicator className="text-primary-300" size="large" />
      </SafeAreaView>
    )
  }

  // No session found - redirect to sign-in
  if (!isLogged) {
    return <Redirect href="/sign-in" />
  }

  // Session exists - render the app
  return <Slot />
}

