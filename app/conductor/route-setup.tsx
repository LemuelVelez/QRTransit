"use client"

import { useState, useEffect } from "react"
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StatusBar, Alert } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { checkRoutePermission, getCurrentUser } from "@/lib/appwrite"
import ProfileDropdown from "@/components/profile-dropdown"
import { saveRouteInfo } from "@/lib/route-service"
import LocationInput from "@/components/location-input"

export default function RouteSetupScreen() {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [busNumber, setBusNumber] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [conductorId, setConductorId] = useState("")
  const [conductorName, setConductorName] = useState("Conductor")
  const router = useRouter()

  useEffect(() => {
    async function checkAccess() {
      try {
        // Check if user has conductor role specifically
        const hasPermission = await checkRoutePermission("conductor")

        if (!hasPermission) {
          Alert.alert("Access Denied", "You don't have permission to access this screen.")
          // Redirect to home
          router.replace("/")
          return
        }

        // Load conductor info
        try {
          const user = await getCurrentUser()
          if (user) {
            setConductorId(user.$id || "")
            setConductorName(
              user.firstname && user.lastname
                ? `${user.firstname} ${user.lastname}`
                : user.username || user.email || "Conductor",
            )
          }
        } catch (userError) {
          console.error("Error loading conductor data:", userError)
        }

        setLoading(false)
      } catch (error) {
        console.error("Error checking access:", error)
        Alert.alert("Error", "Failed to verify access permissions.")
        router.replace("/")
      }
    }

    checkAccess()
  }, [])

  const handleSubmit = async () => {
    if (!from || !to || !busNumber) {
      Alert.alert("Missing Information", "Please fill in all fields before continuing.")
      return
    }

    setSubmitting(true)
    try {
      // Save route information
      await saveRouteInfo(conductorId, {
        from,
        to,
        busNumber,
        timestamp: Date.now(),
      })

      // Navigate to conductor main screen
      router.push("/conductor")
    } catch (error) {
      console.error("Error saving route info:", error)
      Alert.alert("Error", "Failed to save route information. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-emerald-400">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <ActivityIndicator size="large" color="white" />
        <Text className="mt-4 text-white">Verifying access...</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-emerald-400">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      <ProfileDropdown onLogoutStart={() => setLoading(true)} onLogoutEnd={() => setLoading(false)} />

      <ScrollView className="flex-1 p-4">
        <View className="mt-16">
          <Text className="text-white text-2xl font-bold mb-6 text-center">Route Setup</Text>

          <LocationInput label="From" value={from} onChange={setFrom} placeholder="Enter starting point" />

          <LocationInput label="To" value={to} onChange={setTo} placeholder="Enter destination" />

          <View className="mb-8">
            <Text className="text-black text-xl font-bold mb-2">Bus Number</Text>
            <View className="flex-row items-center">
              <Ionicons name="bus" size={24} color="black" className="mr-2" />
              <TextInput
                className="flex-1 p-4 bg-white rounded-md"
                value={busNumber}
                onChangeText={setBusNumber}
                placeholder="Enter bus number"
                keyboardType="numeric"
              />
            </View>
          </View>

          <TouchableOpacity
            className={`w-full ${submitting ? "bg-emerald-600" : "bg-emerald-700"} py-4 rounded-lg items-center mb-4`}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-lg font-bold">Start Trip</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

