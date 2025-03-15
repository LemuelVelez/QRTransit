"use client"

import { Redirect, Slot } from "expo-router"
import { ActivityIndicator, StatusBar, Image, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useEffect, useState } from "react"
import { getCurrentSession } from "@/lib/appwrite"

export default function AppLayout() {
  const [isLogged, setIsLogged] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    async function checkSession() {
      try {
        // Check if user is logged in
        const session = await getCurrentSession()
        setIsLogged(!!session)
        setIsLoading(false)
      } catch (error) {
        console.error("Error checking session:", error)
        setIsLogged(false)
        setIsLoading(false)
      }
    }

    checkSession()
  }, [])

  // Still loading - session check in progress
  if (isLoading) {
    return (
      <SafeAreaView className="bg-transparent h-full flex justify-center items-center">
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
        <View className="items-center">
          <Image
            source={require("../../assets/images/QuickRide.png")}
            style={{ width: 300, height: 160, resizeMode: "contain", marginBottom: 24 }}
            accessibilityLabel="QuickRide Logo"
          />
          <ActivityIndicator className="text-primary-300" size="large" />
        </View>
      </SafeAreaView>
    )
  }

  // No session found - redirect to sign-in
  if (!isLogged) {
    return <Redirect href="/sign-in" />
  }

  // Session exists - always render the Slot (which will include the PIN check)
  return <Slot />
}

