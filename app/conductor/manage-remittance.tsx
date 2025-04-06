"use client"

import { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
  RefreshControl,
} from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { checkRoutePermission, getCurrentUser } from "@/lib/appwrite"
import { getAllRoutes } from "@/lib/route-service"
import {
  getRemittanceStatus,
  getPendingRemittances,
  hasUnremittedRevenue,
  getConductorRevenue,
} from "@/lib/cash-remittance-service"
import RemittanceModal from "@/components/remittance-modal"

interface BusWithRevenue {
  id: string
  busNumber: string
  from: string
  to: string
  active: boolean
  cashRevenue: number
  status: "pending" | "remitted" | "none" | "can_remit" // Changed from remittanceStatus to status
  remittanceAmount?: string
  remittanceTimestamp?: string
  verificationTimestamp?: string
}

export default function ManageRemittanceScreen() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [buses, setBuses] = useState<BusWithRevenue[]>([])
  const [conductorId, setConductorId] = useState("")
  const [conductorName, setConductorName] = useState("")
  const [showRemittanceModal, setShowRemittanceModal] = useState(false)
  const [selectedBus, setSelectedBus] = useState<BusWithRevenue | null>(null)
  const [totalRevenue, setTotalRevenue] = useState(0)
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

            // Set conductor name from firstname and lastname
            if (user.firstname && user.lastname) {
              setConductorName(`${user.firstname} ${user.lastname}`)
            } else if (user.username) {
              setConductorName(user.username)
            } else if (user.email) {
              setConductorName(user.email)
            } else {
              setConductorName("Conductor")
            }

            // Get the correct total revenue
            const revenue = await getConductorRevenue(user.$id || "")
            setTotalRevenue(revenue)

            await loadBuses(user.$id || "")
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

  // Updated to use the correct revenue value
  const loadBuses = async (id: string) => {
    try {
      setLoading(true)

      // Get all routes for this conductor
      const routes = await getAllRoutes(id)

      // Get pending remittances
      const pendingRemittances = await getPendingRemittances(id)

      // Get the correct total revenue
      const revenue = await getConductorRevenue(id)
      setTotalRevenue(revenue)

      // Calculate revenue per bus (divide total revenue by number of buses)
      const revenuePerBus = routes.length > 0 ? revenue / routes.length : 0

      // Transform routes to include revenue and remittance status
      const busesWithRevenue: BusWithRevenue[] = await Promise.all(
        routes.map(async (route) => {
          // Check remittance status for this bus
          const remittance = await getRemittanceStatus(route.id || "", id)

          // Check if bus has unremitted revenue (can create new remittance)
          const canRemit = await hasUnremittedRevenue(route.id || "", id)

          // Determine the remittance status
          let status: "pending" | "remitted" | "none" | "can_remit" = "none"

          if (remittance) {
            if (remittance.status === "pending") {
              status = "pending"
            } else if (remittance.status === "remitted" && canRemit) {
              // If remitted but has new unremitted revenue
              status = "can_remit"
            } else if (remittance.status === "remitted") {
              status = "remitted"
            }
          } else if (canRemit) {
            status = "can_remit"
          }

          return {
            id: route.id || "",
            busNumber: route.busNumber,
            from: route.from,
            to: route.to,
            active: route.active === true,
            cashRevenue: revenuePerBus, // Use calculated revenue per bus
            status: status, // Changed from remittanceStatus to status
            remittanceAmount: remittance?.amount,
            remittanceTimestamp: remittance?.timestamp,
            verificationTimestamp: remittance?.verificationTimestamp,
          }
        }),
      )

      setBuses(busesWithRevenue)
    } catch (error) {
      console.error("Error loading buses:", error)
      Alert.alert("Error", "Failed to load bus information.")
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    if (conductorId) {
      await loadBuses(conductorId)
    }
    setRefreshing(false)
  }, [conductorId])

  const handleRemit = (bus: BusWithRevenue) => {
    setSelectedBus(bus)
    setShowRemittanceModal(true)
  }

  const handleRemittanceSuccess = async () => {
    setShowRemittanceModal(false)
    setSelectedBus(null)
    await loadBuses(conductorId)
  }

  const formatDate = (timestamp?: string) => {
    if (!timestamp) return "N/A"

    const date = new Date(Number(timestamp))
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const handleViewHistory = () => {
    router.push("/conductor/remittance-history" as any)
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-emerald-400">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <ActivityIndicator size="large" color="white" />
        <Text className="mt-4 text-white">Loading buses...</Text>
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
        <Text className="text-white text-xl font-bold">Manage Remittance</Text>
        <TouchableOpacity onPress={handleViewHistory} className="p-2">
          <Ionicons name="time-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Total Revenue Card */}
      <View className="mx-4 mb-4">
        <View className="bg-emerald-700 rounded-lg p-4">
          <Text className="text-white text-sm">Total Revenue</Text>
          <Text className="text-white text-2xl font-bold">₱{totalRevenue.toFixed(2)}</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-2"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#059669"]} tintColor="#ffffff" />
        }
      >
        {buses.length === 0 ? (
          <View className="bg-white rounded-lg p-6 items-center justify-center my-4">
            <Ionicons name="bus-outline" size={48} color="#059669" />
            <Text className="text-gray-700 text-lg mt-4 text-center">You don't have any buses to manage</Text>
            <TouchableOpacity
              className="mt-4 bg-emerald-500 py-3 px-6 rounded-lg"
              onPress={() => router.push("/conductor/route-setup" as any)}
            >
              <Text className="text-white font-bold">Set Up a Route</Text>
            </TouchableOpacity>
          </View>
        ) : (
          buses.map((bus) => (
            <View key={bus.id} className="bg-white rounded-lg p-4 mb-4 shadow-sm">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-lg font-bold text-gray-800">Bus #{bus.busNumber}</Text>
                <View className={`px-2 py-1 rounded-full ${bus.active ? "bg-green-100" : "bg-gray-100"}`}>
                  <Text className={`text-xs ${bus.active ? "text-green-600" : "text-gray-600"}`}>
                    {bus.active ? "Active" : "Inactive"}
                  </Text>
                </View>
              </View>

              <Text className="text-gray-600 mb-2">
                Route: {bus.from} → {bus.to}
              </Text>

              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-600">Cash Revenue:</Text>
                <Text className="font-bold text-emerald-600">₱{bus.cashRevenue.toFixed(2)}</Text>
              </View>

              <View className="flex-row justify-between mb-3">
                <Text className="text-gray-600">Status:</Text>
                <View
                  className={`px-2 py-1 rounded-full ${bus.status === "remitted"
                    ? "bg-green-100"
                    : bus.status === "pending"
                      ? "bg-yellow-100"
                      : bus.status === "can_remit"
                        ? "bg-blue-100"
                        : "bg-gray-100"
                    }`}
                >
                  <Text
                    className={`text-xs ${bus.status === "remitted"
                      ? "text-green-600"
                      : bus.status === "pending"
                        ? "text-yellow-600"
                        : bus.status === "can_remit"
                          ? "text-blue-600"
                          : "text-gray-600"
                      }`}
                  >
                    {bus.status === "remitted"
                      ? "Remitted"
                      : bus.status === "pending"
                        ? "Awaiting Verification"
                        : bus.status === "can_remit"
                          ? "New Revenue to Remit"
                          : "Not Remitted"}
                  </Text>
                </View>
              </View>

              {bus.status === "remitted" && (
                <View className="mb-3">
                  <Text className="text-gray-600">Last Remitted:</Text>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-gray-500">{formatDate(bus.verificationTimestamp)}</Text>
                    <Text className="text-emerald-600 font-medium">₱{bus.remittanceAmount}</Text>
                  </View>
                </View>
              )}

              {bus.status === "pending" ? (
                <View className="bg-yellow-50 p-3 rounded-lg mb-3 border border-yellow-200">
                  <Text className="text-yellow-700 text-center">
                    Your remittance has been submitted and is awaiting admin verification
                  </Text>
                </View>
              ) : bus.status === "can_remit" ? (
                <View className="bg-blue-50 p-3 rounded-lg mb-3 border border-blue-200">
                  <Text className="text-blue-700 text-center">
                    New revenue collected! Please submit a new remittance.
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                className={`py-2 px-4 rounded-lg ${bus.status === "pending"
                  ? "bg-gray-200"
                  : bus.status === "can_remit" || bus.status === "none"
                    ? "bg-emerald-500"
                    : "bg-blue-500"
                  }`}
                onPress={() => handleRemit(bus)}
                disabled={bus.status === "pending"}
              >
                <Text className={`text-center ${bus.status === "pending" ? "text-gray-600" : "text-white font-bold"}`}>
                  {bus.status === "pending"
                    ? "Awaiting Verification"
                    : bus.status === "remitted"
                      ? "Submit New Remittance"
                      : "Submit Remittance"}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Remittance Modal */}
      {selectedBus && (
        <RemittanceModal
          visible={showRemittanceModal}
          busId={selectedBus.id}
          busNumber={selectedBus.busNumber}
          conductorId={conductorId}
          conductorName={conductorName}
          cashRevenue={selectedBus.cashRevenue}
          onClose={() => {
            setShowRemittanceModal(false)
            setSelectedBus(null)
          }}
          onSuccess={handleRemittanceSuccess}
        />
      )}
    </View>
  )
}

