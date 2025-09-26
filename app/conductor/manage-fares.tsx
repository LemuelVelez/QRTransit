// app/conductor/manage-fares.tsx
"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { getCurrentUser, checkRoutePermission } from "@/lib/appwrite"
import {
  getFareConfigurations,
  type FareConfig,
} from "@/lib/fare-service"

// Simple vertical spacer to guarantee consistent spacing across RN Tailwind setups
function VSpace({ size = 12 }: { size?: number }) {
  return <View style={{ height: size }} />
}

export default function ManageFaresScreen() {
  const [loading, setLoading] = useState(true)
  const [allConfigs, setAllConfigs] = useState<FareConfig[]>([])
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()

  useEffect(() => {
    async function checkAccess() {
      try {
        const hasPermission = await checkRoutePermission("conductor")
        if (!hasPermission) {
          Alert.alert("Access Denied", "You don't have permission to access this screen.")
          router.replace("/")
          return
        }
        const user = await getCurrentUser()
        if (!user) {
          Alert.alert("Error", "Failed to verify current user.")
          router.replace("/")
          return
        }
        await loadAll()
      } catch (error) {
        console.error("Error checking access:", error)
        Alert.alert("Error", "Failed to verify access permissions.")
        router.replace("/")
      }
    }
    checkAccess()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadAll = async () => {
    try {
      setLoading(true)
      setError(null)
      const configs = await getFareConfigurations()
      const sorted = configs.sort(
        (a, b) => parseFloat(a.kilometer) - parseFloat(b.kilometer)
      )
      setAllConfigs(sorted)
      if (configs.length === 0) setError("No fare configurations found.")
    } catch (e) {
      console.error("Error loading fares:", e)
      setError("Failed to load fare configurations. Please check your Appwrite setup.")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View className="items-center justify-center flex-1 bg-emerald-400">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <ActivityIndicator size="large" color="white" />
        <Text className="mt-4 text-white">Loading fare configurations...</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-emerald-400">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View className="px-4 pt-16 pb-8">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center self-start">
          <Ionicons name="arrow-back" size={22} color="white" />
          <Text className="ml-2 text-white">Back</Text>
        </TouchableOpacity>

        <VSpace size={10} />

        <Text className="text-2xl font-bold text-center text-white">Manage Fares</Text>

        <VSpace size={12} />

        <TouchableOpacity
          onPress={loadAll}
          className="flex-row items-center justify-center w-full py-4 rounded-lg bg-emerald-600 active:opacity-90"
        >
          <Ionicons name="refresh" size={18} color="white" />
          <Text className="ml-2 font-medium text-white">Refresh</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View className="p-3 mx-4 mb-4 bg-red-500 rounded-lg">
          <Text className="text-white">{error}</Text>
        </View>
      )}

      <ScrollView
        className="flex-1 px-4"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        {/* Fare Configs Card (READ-ONLY) */}
        <View className="p-5 bg-white rounded-lg shadow-sm">
          <Text className="text-lg font-bold text-gray-800">
            Fare Configurations (Distance → Amount)
          </Text>

          <VSpace size={12} />

          {allConfigs.length === 0 ? (
            <>
              <Text className="italic text-gray-600">
                No fares available. Please tell the admin to create fare configurations.
              </Text>
            </>
          ) : (
            <>
              {allConfigs.map((fareConfig, idx) => (
                <View
                  key={fareConfig.id || `${fareConfig.kilometer}-${idx}`}
                  className="p-3 border border-gray-200 rounded-md"
                  style={{ marginBottom: idx === allConfigs.length - 1 ? 0 : 12 }}
                >
                  <View className="self-start px-3 py-1 rounded-full bg-emerald-100">
                    <Text className="text-xs text-emerald-600">Distance-Based</Text>
                  </View>

                  <VSpace size={12} />

                  <Text className="text-lg font-bold text-gray-800">
                    {fareConfig.kilometer} km → ₱{fareConfig.fare}
                  </Text>
                  <Text className="text-gray-600">
                    Base fare for trips up to {fareConfig.kilometer} kilometers
                  </Text>

                  <VSpace size={8} />
                  <Text className="text-gray-700">
                    Bus Type:{" "}
                    <Text className="font-semibold">
                      {(fareConfig.busType || "").trim() || "—"}
                    </Text>
                  </Text>
                </View>
              ))}
            </>
          )}
        </View>

        <VSpace size={16} />

        {/* Help Card (info only; no mention of uplifts/CRUD) */}
        <View className="p-5 bg-white rounded-lg shadow-sm">
          <Text className="text-lg font-bold text-gray-800">Notes</Text>

          <VSpace size={10} />

          <Text className="text-gray-600">• Configure fares per distance range.</Text>
          <VSpace size={6} />
          <Text className="text-gray-600">• The system finds the best matching range for each trip.</Text>
          <VSpace size={6} />
          <Text className="text-gray-600">
            • Passenger discounts and bus type labels come from their respective configurations.
          </Text>
        </View>

        <VSpace size={20} />
      </ScrollView>
    </View>
  )
}
