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
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { checkRoutePermission, getCurrentUser } from "@/lib/appwrite"
import { getBusPassengers, markBusAsCleared } from "@/lib/inspector-service"
import type { PassengerInfo } from "@/lib/types"
import LocationFilterModal from "@/components/location-filter-modal"
import InspectionClearanceModal from "@/components/inspection-clearance-modal"

// Common route stops - this could be fetched from a database in a real app
const COMMON_ROUTE_STOPS = {
  Pagadian: ["Pagadian", "Buug", "Ipil"],
  Buug: ["Buug", "Pagadian", "Ipil"],
  Ipil: ["Ipil", "Buug", "Pagadian"],
  // Add more routes as needed
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
        // Check if user has inspector role specifically
        const hasPermission = await checkRoutePermission("inspector")

        if (!hasPermission) {
          Alert.alert("Access Denied", "You don't have permission to access this screen.")
          router.replace("/")
          return
        }

        // Load inspector info
        try {
          const user = await getCurrentUser()
          if (user) {
            setInspectorId(user.$id || "")
          }
        } catch (userError) {
          console.error("Error loading inspector data:", userError)
        }

        // Set route stops
        setRouteStops(getRouteLocations(from as string, to as string))

        await loadPassengers()

        // Animate content in
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start()
      } catch (error) {
        console.error("Error checking access:", error)
        Alert.alert("Error", "Failed to verify access permissions.")
        router.replace("/")
      }
    }

    checkAccess()
  }, [busId, conductorId])

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
      // Clear filter
      setFilteredPassengers(passengers)
      return
    }

    // Apply filter - show only passengers who boarded from the selected location onward
    // or those heading toward areas beyond the selected location
    const filtered = passengers.filter((passenger) => {
      // Get the route as an array of locations
      const routeArray = getRouteLocations(from as string, to as string)

      // Find indices of relevant locations
      const filterLocationIndex = routeArray.indexOf(location)
      const passengerFromIndex = routeArray.indexOf(passenger.from)
      const passengerToIndex = routeArray.indexOf(passenger.to)

      // Include passenger if they boarded at or after filter location
      // OR if they're going to a destination after the filter location
      return passengerFromIndex >= filterLocationIndex || passengerToIndex > filterLocationIndex
    })

    setFilteredPassengers(filtered)
  }

  // Helper function to get route locations as an array
  const getRouteLocations = (fromLocation: string, toLocation: string): string[] => {
    // Check if we have a predefined route
    for (const [key, stops] of Object.entries(COMMON_ROUTE_STOPS)) {
      if (stops.includes(fromLocation) && stops.includes(toLocation)) {
        // Get the slice of the route between from and to (inclusive)
        const startIndex = stops.indexOf(fromLocation)
        const endIndex = stops.indexOf(toLocation)

        if (startIndex !== -1 && endIndex !== -1) {
          // If from comes before to in the array
          if (startIndex < endIndex) {
            return stops.slice(startIndex, endIndex + 1)
          }
          // If to comes before from in the array (reverse direction)
          else {
            return stops.slice(endIndex, startIndex + 1).reverse()
          }
        }
      }
    }

    // If no predefined route is found, create a simple route with just from and to
    return [fromLocation, toLocation]
  }

  const validateInspectionLocations = (inspectionFrom: string, inspectionTo: string): boolean => {
    const routeArray = getRouteLocations(from as string, to as string)

    // Check if both locations are in the route
    const fromIndex = routeArray.indexOf(inspectionFrom)
    const toIndex = routeArray.indexOf(inspectionTo)

    // Both locations must be in the route and in the correct order
    return fromIndex !== -1 && toIndex !== -1 && fromIndex <= toIndex
  }

  const handleClearBus = async (inspectionFrom: string, inspectionTo: string) => {
    // Validate inspection locations
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
          {
            text: "OK",
            onPress: () => router.back(),
          },
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
      <View className="flex-1 justify-center items-center bg-blue-600">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <ActivityIndicator size="large" color="white" />
        <Text className="mt-4 text-white font-medium">Loading passenger information...</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-blue-600">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Header */}
      <View className="pt-16 px-5 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-blue-500 rounded-full p-2"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Bus #{busNumber}</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Bus Info Card */}
      <Animated.View className="px-5 mt-4" style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <View className="bg-white rounded-xl p-5 shadow-lg elevation-3">
          <Text className="text-gray-800 font-bold text-lg mb-3">Bus Information</Text>

          {/* Conductor Row */}
          <View className="flex-row mb-3">
            <Text className="text-gray-600 w-24">Conductor:</Text>
            <Text className="text-gray-800 font-medium flex-1">{conductorName}</Text>
          </View>

          {/* Route Row - Redesigned to handle long text */}
          <View className="mb-3">
            <Text className="text-gray-600 mb-1">Route:</Text>
            <View className="flex-row items-center flex-wrap">
              <View className="bg-blue-50 rounded-lg px-2 py-1 mr-1 mb-1">
                <Text className="text-blue-700">{from}</Text>
              </View>
              <Ionicons name="arrow-forward" size={14} color="#6b7280" style={{ marginHorizontal: 2 }} />
              <View className="bg-blue-50 rounded-lg px-2 py-1 mb-1">
                <Text className="text-blue-700">{to}</Text>
              </View>
            </View>
          </View>

          {/* Passengers Row */}
          <View className="flex-row">
            <Text className="text-gray-600 w-24">Passengers:</Text>
            <Text className="text-gray-800 font-medium flex-1">{passengers.length}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Passenger List */}
      <Animated.View
        className="flex-1 bg-gray-50 rounded-t-3xl mt-5 px-5 pt-6 shadow-lg elevation-5"
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-gray-800 font-bold text-lg">
            {activeFilter
              ? `Filtered Passengers (${filteredPassengers.length})`
              : `All Passengers (${passengers.length})`}
          </Text>
          <View className="flex-row">
            <TouchableOpacity
              className="mr-3 flex-row items-center bg-blue-50 px-3 py-1.5 rounded-full"
              onPress={() => setShowFilterModal(true)}
              accessibilityLabel="Filter passengers"
            >
              <Ionicons name="filter" size={16} color="#3b82f6" />
              <Text className="text-blue-600 ml-1 font-medium">Filter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center bg-green-50 px-3 py-1.5 rounded-full"
              onPress={() => setShowClearanceModal(true)}
              accessibilityLabel="Clear bus inspection"
            >
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text className="text-green-600 ml-1 font-medium">Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeFilter && (
          <View className="bg-blue-50 rounded-xl p-3 mb-4 flex-row justify-between items-center">
            <View className="flex-row items-center flex-1">
              <Ionicons name="information-circle" size={18} color="#3b82f6" className="mr-2" />
              <Text className="text-blue-700 flex-1">
                Filtered by: <Text className="font-bold">{activeFilter}</Text>
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleFilter(null)} accessibilityLabel="Clear filter">
              <Ionicons name="close-circle" size={20} color="#3b82f6" />
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#3b82f6"]}
              tintColor="#3b82f6"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {filteredPassengers.length === 0 ? (
            <View className="items-center justify-center py-12">
              <Ionicons name="people-outline" size={64} color="#d1d5db" />
              <Text className="text-gray-400 mt-4 text-center">
                {activeFilter ? "No passengers match the current filter" : "No passengers found for this bus"}
              </Text>
              {activeFilter && (
                <TouchableOpacity className="mt-4 bg-blue-50 px-4 py-2 rounded-lg" onPress={() => handleFilter(null)}>
                  <Text className="text-blue-600">Clear filter</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredPassengers.map((passenger, index) => (
              <View
                key={passenger.id || index}
                className="bg-white rounded-xl p-4 mb-3 border border-gray-100 shadow-sm elevation-1"
                accessibilityLabel={`Passenger ${passenger.name} information`}
              >
                <View className="flex-row justify-between mb-2">
                  <Text className="font-bold text-gray-800 text-base flex-1 mr-2">{passenger.name}</Text>
                  <Text className="text-blue-600 font-medium">{passenger.fare}</Text>
                </View>

                {/* From location - redesigned to handle long text */}
                <View className="mb-1.5">
                  <Text className="text-gray-600 mb-0.5">From:</Text>
                  <View className="flex-row items-center">
                    <Ionicons name="location-outline" size={14} color="#3b82f6" className="mr-1" />
                    <Text className="text-gray-800 flex-1">{passenger.from}</Text>
                  </View>
                </View>

                {/* To location - redesigned to handle long text */}
                <View>
                  <Text className="text-gray-600 mb-0.5">To:</Text>
                  <View className="flex-row items-center">
                    <Ionicons name="flag-outline" size={14} color="#3b82f6" className="mr-1" />
                    <Text className="text-gray-800 flex-1">{passenger.to}</Text>
                  </View>
                </View>

                <View className="mt-2 pt-2 border-t border-gray-100 flex-row justify-end">
                  <View className="bg-gray-100 rounded-full px-2 py-0.5 flex-row items-center">
                    <Ionicons name="card-outline" size={12} color="#6b7280" className="mr-1" />
                    <Text className="text-xs text-gray-500">{passenger.paymentMethod}</Text>
                  </View>
                </View>
              </View>
            ))
          )}

          {/* Add some padding at the bottom for better scrolling */}
          <View className="h-8" />
        </ScrollView>
      </Animated.View>

      {/* Filter Modal */}
      <LocationFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onSelectLocation={handleFilter}
        locations={routeStops}
        currentFilter={activeFilter}
      />

      {/* Clearance Modal */}
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

