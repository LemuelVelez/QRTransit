"use client"

import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
  RefreshControl,
  Animated,
  Image,
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { checkRoutePermission, getCurrentUser } from "@/lib/appwrite"
import { getBusPassengers, markBusAsCleared, subscribeToBusPassengers } from "@/lib/inspector-service"
import type { PassengerInfo } from "@/lib/types"
import LocationFilterModal from "@/components/location-filter-modal"
import InspectionClearanceModal from "@/components/inspection-clearance-modal"

const COMMON_ROUTE_STOPS = {
  Pagadian: ["Pagadian", "Buug", "Ipil"],
  Buug: ["Buug", "Pagadian", "Ipil"],
  Ipil: ["Ipil", "Buug", "Pagadian"],
}

export default function BusDetailsScreen() {
  const params = useLocalSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [passengers, setPassengers] = useState<PassengerInfo[]>([])
  const [filteredPassengers, setFilteredPassengers] = useState<PassengerInfo[]>([])
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [showClearanceModal, setShowClearanceModal] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [inspectorId, setInspectorId] = useState("")
  const [isClearing, setIsClearing] = useState(false)
  const [routeStops, setRouteStops] = useState<string[]>([])
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current

  const { busId, busNumber, conductorId, conductorName, from, to } = params

  useEffect(() => {
    async function checkAccess() {
      try {
        const hasPermission = await checkRoutePermission("inspector")
        if (!hasPermission) {
          Alert.alert("Access Denied", "You don't have permission to access this screen.")
          router.replace("/")
          return
        }

        try {
          const user = await getCurrentUser()
          if (user) setInspectorId(user.$id || "")
        } catch (userError) {
          console.error("Error loading inspector data:", userError)
        }

        setRouteStops(getRouteLocations(from as string, to as string))
        await loadPassengers()

        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start()
        setLoading(false)
      } catch (error) {
        console.error("Error checking access:", error)
        Alert.alert("Error", "Failed to verify access permissions.")
        router.replace("/")
      }
    }

    checkAccess()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busId, conductorId])

  // ✅ Realtime: subscribe to trips for this bus & conductor
  useEffect(() => {
    if (!busNumber || !conductorId) return
    const unsubscribe = subscribeToBusPassengers(String(busNumber), String(conductorId), async () => {
      await loadPassengers()
    })
    return () => {
      try { unsubscribe?.() } catch { }
    }
  }, [busNumber, conductorId])

  const loadPassengers = async () => {
    try {
      setLoading(true)
      if (!busId || !conductorId) {
        Alert.alert("Error", "Missing bus or conductor information")
        router.back()
        return
      }
      const passengerList = await getBusPassengers(busId as string, conductorId as string)
      setPassengers(passengerList)
      setFilteredPassengers(passengerList)
    } catch (error) {
      console.error("Error loading passengers:", error)
      Alert.alert("Error", "Failed to load passenger information")
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadPassengers()
    setRefreshing(false)
  }

  const handleFilter = (location: string | null) => {
    setActiveFilter(location)
    setShowFilterModal(false)
    if (!location) {
      setFilteredPassengers(passengers)
      return
    }
    const filtered = passengers.filter((p) => {
      const routeArray = getRouteLocations(from as string, to as string)
      const filterIdx = routeArray.indexOf(location)
      const fromIdx = routeArray.indexOf(p.from)
      const toIdx = routeArray.indexOf(p.to)
      return fromIdx >= filterIdx || toIdx > filterIdx
    })
    setFilteredPassengers(filtered)
  }

  const getRouteLocations = (fromLocation: string, toLocation: string): string[] => {
    for (const stops of Object.values(COMMON_ROUTE_STOPS)) {
      if (stops.includes(fromLocation) && stops.includes(toLocation)) {
        const start = stops.indexOf(fromLocation)
        const end = stops.indexOf(toLocation)
        if (start < end) return stops.slice(start, end + 1)
        return stops.slice(end, start + 1).reverse()
      }
    }
    return [fromLocation, toLocation]
  }

  const validateInspectionLocations = (inspectionFrom: string, inspectionTo: string): boolean => {
    const routeArray = getRouteLocations(from as string, to as string)
    const iFrom = routeArray.indexOf(inspectionFrom)
    const iTo = routeArray.indexOf(inspectionTo)
    return iFrom !== -1 && iTo !== -1 && iFrom <= iTo
  }

  const handleClearBus = async (inspectionFrom: string, inspectionTo: string) => {
    if (!validateInspectionLocations(inspectionFrom, inspectionTo)) {
      Alert.alert(
        "Invalid Inspection Route",
        "The inspection locations must be valid stops on the bus route and in the correct order.",
      )
      return
    }
    try {
      setIsClearing(true)
      const success = await markBusAsCleared(busId as string, inspectorId, inspectionFrom, inspectionTo)
      if (success) {
        Alert.alert("Bus Cleared", "The bus has been successfully marked as cleared.", [
          { text: "OK", onPress: () => router.back() },
        ])
      } else {
        Alert.alert("Error", "Failed to mark bus as cleared")
      }
    } catch (error) {
      console.error("Error clearing bus:", error)
      Alert.alert("Error", "Failed to mark bus as cleared")
    } finally {
      setIsClearing(false)
      setShowClearanceModal(false)
    }
  }

  if (loading) {
    return (
      <View className="items-center justify-center flex-1 bg-blue-600">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <ActivityIndicator size="large" color="white" />
        <Text className="mt-4 font-medium text-white">Loading passenger information...</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-blue-600">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-16">
        <TouchableOpacity onPress={() => router.back()} className="p-2 bg-blue-500 rounded-full" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white">Bus #{busNumber}</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Bus Info Card */}
      <Animated.View className="px-5 mt-4" style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <View className="p-5 bg-white shadow-lg rounded-xl elevation-3">
          <Text className="mb-3 text-lg font-bold text-gray-800">Bus Information</Text>

          <View className="flex-row mb-3">
            <Text className="w-24 text-gray-600">Conductor:</Text>
            <Text className="flex-1 font-medium text-gray-800">{conductorName}</Text>
          </View>

          <View className="mb-3">
            <Text className="mb-1 text-gray-600">Route:</Text>
            <View className="flex-row flex-wrap items-center">
              <View className="px-2 py-1 mb-1 mr-1 rounded-lg bg-blue-50">
                <Text className="text-blue-700">{from}</Text>
              </View>
              <Ionicons name="arrow-forward" size={14} color="#6b7280" style={{ marginHorizontal: 2 }} />
              <View className="px-2 py-1 mb-1 rounded-lg bg-blue-50">
                <Text className="text-blue-700">{to}</Text>
              </View>
            </View>
          </View>

          <View className="flex-row">
            <Text className="w-24 text-gray-600">Passengers:</Text>
            <Text className="flex-1 font-medium text-gray-800">{passengers.length}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Passenger List */}
      <Animated.View
        className="flex-1 px-5 pt-6 mt-5 shadow-lg bg-gray-50 rounded-t-3xl elevation-5"
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-bold text-gray-800">
            {activeFilter ? `Filtered Passengers (${filteredPassengers.length})` : `All Passengers (${passengers.length})`}
          </Text>
          <View className="flex-row">
            <TouchableOpacity
              className="mr-3 flex-row items-center bg-blue-50 px-3 py-1.5 rounded-full"
              onPress={() => setShowFilterModal(true)}
              accessibilityLabel="Filter passengers"
            >
              <Ionicons name="filter" size={16} color="#3b82f6" />
              <Text className="ml-1 font-medium text-blue-600">Filter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center bg-green-50 px-3 py-1.5 rounded-full"
              onPress={() => setShowClearanceModal(true)}
              accessibilityLabel="Clear bus inspection"
            >
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text className="ml-1 font-medium text-green-600">Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeFilter && (
          <View className="flex-row items-center justify-between p-3 mb-4 bg-blue-50 rounded-xl">
            <View className="flex-row items-center flex-1">
              <Ionicons name="information-circle" size={18} color="#3b82f6" className="mr-2" />
              <Text className="flex-1 text-blue-700">
                Filtered by: <Text className="font-bold">{activeFilter}</Text>
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleFilter(null)} accessibilityLabel="Clear filter">
              <Ionicons name="close-circle" size={20} color="#3b82f6" />
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#3b82f6"]} tintColor="#3b82f6" />}
          showsVerticalScrollIndicator={false}
        >
          {filteredPassengers.length === 0 ? (
            <View className="items-center justify-center py-12">
              <Ionicons name="people-outline" size={64} color="#d1d5db" />
              <Text className="mt-4 text-center text-gray-400">
                {activeFilter ? "No passengers match the current filter" : "No passengers found for this bus"}
              </Text>
              {activeFilter && (
                <TouchableOpacity className="px-4 py-2 mt-4 rounded-lg bg-blue-50" onPress={() => handleFilter(null)}>
                  <Text className="text-blue-600">Clear filter</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredPassengers.map((passenger, index) => (
              <View
                key={passenger.id || index}
                className="p-4 mb-3 bg-white border border-gray-100 shadow-sm rounded-xl elevation-1"
                accessibilityLabel={`Passenger ${passenger.name} information`}
              >
                <View className="flex-row">
                  {/* Photo */}
                  {passenger.passengerPhoto ? (
                    <View className="mr-3">
                      <Image
                        source={{ uri: passenger.passengerPhoto }}
                        className="w-16 h-16 rounded-lg"
                        style={{ borderWidth: 1, borderColor: "#e5e7eb" }}
                        accessibilityLabel={`Photo of ${passenger.name}`}
                      />
                      {passenger.passengerType && (
                        <View className="absolute bottom-0 right-0 bg-blue-500 px-1.5 py-0.5 rounded-bl-lg rounded-tr-lg">
                          <Text className="text-xs font-medium text-white">{passenger.passengerType}</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View className="items-center justify-center w-16 h-16 mr-3 bg-gray-100 rounded-lg">
                      <Ionicons name="person" size={24} color="#9ca3af" />
                      {passenger.passengerType && (
                        <View className="absolute bottom-0 right-0 bg-blue-500 px-1.5 py-0.5 rounded-bl-lg rounded-tr-lg">
                          <Text className="text-xs font-medium text-white">{passenger.passengerType}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Details */}
                  <View className="flex-1">
                    <View className="flex-row justify-between mb-2">
                      <Text className="flex-1 mr-2 text-base font-bold text-gray-800">{passenger.name}</Text>
                      <Text className="font-medium text-blue-600">{passenger.fare}</Text>
                    </View>

                    <View className="mb-1.5">
                      <Text className="text-gray-600 mb-0.5">From:</Text>
                      <View className="flex-row items-center">
                        <Ionicons name="location-outline" size={14} color="#3b82f6" className="mr-1" />
                        <Text className="flex-1 text-gray-800">{passenger.from}</Text>
                      </View>
                    </View>

                    <View>
                      <Text className="text-gray-600 mb-0.5">To:</Text>
                      <View className="flex-row items-center">
                        <Ionicons name="flag-outline" size={14} color="#3b82f6" className="mr-1" />
                        <Text className="flex-1 text-gray-800">{passenger.to}</Text>
                      </View>
                    </View>

                    {/* ✅ Visible payment method chip */}
                    <View className="flex-row justify-end pt-2 mt-2 border-gray-100 border-top">
                      <View
                        className={`rounded-full px-2 py-0.5 flex-row items-center ${passenger.paymentMethod === "QR" ? "bg-emerald-100" : "bg-gray-100"
                          }`}
                      >
                        <Ionicons name="card-outline" size={12} color={passenger.paymentMethod === "QR" ? "#059669" : "#6b7280"} />
                        <Text
                          className={`text-xs ml-1 ${passenger.paymentMethod === "QR" ? "text-emerald-700" : "text-gray-600"
                            }`}
                        >
                          {passenger.paymentMethod}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}

          <View className="h-8" />
        </ScrollView>
      </Animated.View>

      <LocationFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onSelectLocation={handleFilter}
        locations={routeStops}
        currentFilter={activeFilter}
      />

      <InspectionClearanceModal
        visible={showClearanceModal}
        onClose={() => setShowClearanceModal(false)}
        onSubmit={handleClearBus}
        isLoading={isClearing}
        routeFrom={from as string}
        routeTo={to as string}
        routeStops={routeStops}
      />
    </View>
  )
}
