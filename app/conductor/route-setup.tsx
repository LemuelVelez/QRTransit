"use client"

import { useState, useEffect } from "react"
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StatusBar, Switch } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { getCurrentUser } from "@/lib/appwrite"
import { saveRouteInfo } from "@/lib/route-service"
import LocationInput from "@/components/location-input"

export default function RouteSetupScreen() {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [busNumber, setBusNumber] = useState("")
  const [active, setActive] = useState(false) // Default to inactive
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [conductorId, setConductorId] = useState("")

  const router = useRouter()

  useEffect(() => {
    async function loadUser() {
      try {
        const user = await getCurrentUser()

        if (!user) {
          Alert.alert("Error", "Failed to get user information")
          router.replace("/")
          return
        }

        setConductorId(user.$id || "")
        setInitialLoading(false)
      } catch (error) {
        console.error("Error loading user:", error)
        Alert.alert("Error", "Failed to load user information")
        router.replace("/")
      }
    }

    loadUser()
  }, [])

  const handleSaveRoute = async () => {
    if (!from || !to || !busNumber) {
      Alert.alert("Missing Information", "Please fill in all fields")
      return
    }

    setLoading(true)

    try {
      const routeInfo = {
        from,
        to,
        busNumber,
        timestamp: Date.now(),
        active: active, // Use the active state
      }

      await saveRouteInfo(conductorId, routeInfo)

      Alert.alert("Route Saved", "Your route has been set up successfully", [
        {
          text: "OK",
          onPress: () => router.replace("/conductor" as any),
        },
      ])
    } catch (error) {
      console.error("Error saving route:", error)
      Alert.alert("Error", "Failed to save route information")
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-emerald-400">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <ActivityIndicator size="large" color="white" />
        <Text className="mt-4 text-white">Loading...</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-emerald-400">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      <View className="flex-row items-center justify-between px-4 pt-16 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Set Up Route</Text>
        <View style={{ width: 32 }} />
      </View>

      <View className="flex-1 p-4">
        <View className="bg-white rounded-lg p-6 shadow-sm">
          <Text className="text-xl font-bold text-gray-800 mb-6">Route Information</Text>

          <LocationInput label="From" value={from} onChange={setFrom} placeholder="Starting point" />

          <LocationInput label="To" value={to} onChange={setTo} placeholder="Destination" />

          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">Bus Number</Text>
            <View className="flex-row items-center">
              <Ionicons name="bus-outline" size={24} color="#059669" className="mr-2" />
              <TextInput
                className="flex-1 border border-gray-300 rounded-md p-3 bg-gray-50"
                value={busNumber}
                onChangeText={setBusNumber}
                placeholder="Bus number"
                editable={!loading}
              />
            </View>
          </View>

          <View className="mb-6 flex-row justify-between items-center">
            <Text className="text-gray-700 font-medium">Activate Route</Text>
            <Switch
              value={active}
              onValueChange={setActive}
              trackColor={{ false: "#d1d5db", true: "#10b981" }}
              thumbColor="#ffffff"
              disabled={loading}
            />
          </View>

          <TouchableOpacity
            className="bg-emerald-500 py-4 rounded-lg items-center"
            onPress={handleSaveRoute}
            disabled={loading || !from || !to || !busNumber}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">Save Route</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

