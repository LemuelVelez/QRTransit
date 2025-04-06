"use client"

import { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
  RefreshControl,
} from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { checkRoutePermission, getCurrentUser } from "@/lib/appwrite"
import { getRemittanceHistory, getTotalRemittedAmount, type CashRemittance } from "@/lib/cash-remittance-service"
import { getUserStats } from "@/lib/conductor-service"

export default function RemittanceHistoryScreen() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [remittances, setRemittances] = useState<CashRemittance[]>([])
  const [totalRemitted, setTotalRemitted] = useState("0.00")
  const [totalRevenue, setTotalRevenue] = useState("0.00")
  const [conductorId, setConductorId] = useState("")
  const router = useRouter()

  useEffect(() => {
    async function checkAccess() {
      try {
        // Check if user has conductor role specifically
        const hasPermission = await checkRoutePermission("conductor")

        if (!hasPermission) {
          Alert.alert("Access Denied", "You don't have permission to access this screen.")
          router.replace("/")
          return
        }

        // Load conductor info
        try {
          const user = await getCurrentUser()
          if (user) {
            setConductorId(user.$id || "")
            await loadRemittances(user.$id || "")

            // Get total revenue from the same source as profile.tsx
            const stats = await getUserStats(user.$id || "")
            setTotalRevenue(stats.totalRevenue)
          }
        } catch (userError) {
          console.error("Error loading conductor data:", userError)
        }
      } catch (error) {
        console.error("Error checking access:", error)
        Alert.alert("Error", "Failed to verify access permissions.")
        router.replace("/")
      }
    }

    checkAccess()
  }, [])

  const loadRemittances = async (id: string) => {
    try {
      setLoading(true)
      const history = await getRemittanceHistory(id)
      setRemittances(history)

      // Get total remitted amount
      const total = await getTotalRemittedAmount(id)
      setTotalRemitted(total)

      // Get updated total revenue
      const stats = await getUserStats(id)
      setTotalRevenue(stats.totalRevenue)
    } catch (error) {
      console.error("Error loading remittance history:", error)
      Alert.alert("Error", "Failed to load remittance history.")
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    if (conductorId) {
      await loadRemittances(conductorId)
    }
    setRefreshing(false)
  }, [conductorId])

  const formatDate = (timestamp: string) => {
    const date = new Date(Number(timestamp))
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-emerald-400">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <ActivityIndicator size="large" color="white" />
        <Text className="mt-4 text-white">Loading remittance history...</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-emerald-400">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Header with back button */}
      <View className="flex-row items-center justify-between px-4 pt-16 pb-2">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Remittance History</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Revenue and Remittance Cards */}
      <View className="mx-4 mb-4 flex-row space-x-2">
        <View className="bg-emerald-700 rounded-lg p-4 flex-1">
          <Text className="text-white text-sm">Total Revenue</Text>
          <Text className="text-white text-2xl font-bold">₱{totalRevenue}</Text>
        </View>

        <View className="bg-emerald-600 rounded-lg p-4 flex-1">
          <Text className="text-white text-sm">Total Remitted</Text>
          <Text className="text-white text-2xl font-bold">₱{totalRemitted}</Text>
        </View>
      </View>

      <View className="flex-1 bg-gray-50 rounded-t-3xl px-4 pt-6">
        {remittances.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="cash-outline" size={64} color="#059669" />
            <Text className="text-gray-500 mt-4 text-center">No remittance records found</Text>
          </View>
        ) : (
          <FlatList
            data={remittances}
            keyExtractor={(item) => item.id || item.timestamp}
            renderItem={({ item }) => (
              <View className="bg-white rounded-lg p-4 mb-3 shadow-sm">
                <View className="flex-row justify-between mb-2">
                  <Text className="font-bold text-gray-800">Bus #{item.busNumber}</Text>
                  <Text className="font-bold text-emerald-600">₱{item.amount}</Text>
                </View>

                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-500">{formatDate(item.timestamp)}</Text>
                  <View
                    className={`px-2 py-1 rounded-full ${item.status === "remitted" ? "bg-green-100" : "bg-yellow-100"}`}
                  >
                    <Text className={`text-xs ${item.status === "remitted" ? "text-green-600" : "text-yellow-600"}`}>
                      {item.status === "remitted" ? "Remitted" : "Awaiting Verification"}
                    </Text>
                  </View>
                </View>

                {item.revenueId && (
                  <View className="flex-row justify-between items-center">
                    <Text className="text-gray-500 text-xs">Revenue Cycle: {item.revenueId.substring(0, 10)}...</Text>
                  </View>
                )}

                {item.notes && (
                  <View className="mt-2 pt-2 border-t border-gray-100">
                    <Text className="text-gray-500 text-sm">{item.notes}</Text>
                  </View>
                )}
              </View>
            )}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#059669"]} tintColor="#ffffff" />
            }
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    </View>
  )
}

