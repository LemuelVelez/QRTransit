"use client"

import { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StatusBar,
  Alert,
  RefreshControl,
} from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { checkRoutePermission, getCurrentUser } from "@/lib/appwrite"
import DateRangePicker from "@/components/date-range-picker"
import { getTripHistory, getTripsByDateRange, type Trip } from "@/lib/trips-service"

export default function TripHistoryScreen() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [trips, setTrips] = useState<Trip[]>([])
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([])
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [conductorId, setConductorId] = useState("")
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

            // Load trip history
            await loadTrips(user.$id || "")
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

  useEffect(() => {
    if (startDate && endDate && conductorId) {
      filterTripsByDate()
    } else {
      setFilteredTrips(trips)
    }
  }, [startDate, endDate, trips])

  const loadTrips = async (id: string) => {
    try {
      setLoading(true)
      const history = await getTripHistory(id)
      setTrips(history)
      setFilteredTrips(history)
    } catch (error) {
      console.error("Error loading trip history:", error)
      Alert.alert("Error", "Failed to load trip history.")
    } finally {
      setLoading(false)
    }
  }

  const filterTripsByDate = async () => {
    if (!startDate || !endDate || !conductorId) return

    try {
      setLoading(true)
      const filtered = await getTripsByDateRange(conductorId, startDate, endDate)
      setFilteredTrips(filtered)
    } catch (error) {
      console.error("Error filtering trips:", error)
      Alert.alert("Error", "Failed to filter trips.")
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setStartDate(null)
    setEndDate(null)
    setFilteredTrips(trips)
  }

  const handleViewDetails = (trip: Trip) => {
    router.push({
      pathname: "/conductor/trip-details" as any,
      params: {
        id: trip.id,
        passengerName: trip.passengerName,
        fare: trip.fare,
        from: trip.from,
        to: trip.to,
        timestamp: trip.timestamp.toString(),
        paymentMethod: trip.paymentMethod,
        transactionId: trip.transactionId,
        passengerPhoto: trip.passengerPhoto,
        passengerType: trip.passengerType || "Regular",
        kilometer: trip.kilometer || "0",
      },
    })
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    if (conductorId) {
      await loadTrips(conductorId)
    }
    setRefreshing(false)
  }, [conductorId])

  if (loading) {
    return (
      <View className="items-center justify-center flex-1 bg-emerald-400">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <ActivityIndicator size="large" color="white" />
        <Text className="mt-4 text-white">Loading trips...</Text>
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
        <Text className="text-xl font-bold text-white">Trip History</Text>
        <View style={{ width: 32 }} />
      </View>

      <View className="flex-1 px-4">
        {/* Date Filter */}
        <View className="p-4 mb-4 bg-white rounded-lg">
          <TouchableOpacity
            className="flex-row items-center justify-between mb-2"
            onPress={() => setShowDatePicker(true)}
          >
            <Text className="font-bold text-black">Filter by Date</Text>
            <Ionicons name="calendar" size={24} color="#059669" />
          </TouchableOpacity>

          {(startDate || endDate) && (
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-700">
                {startDate ? startDate.toLocaleDateString() : "Any"} - {endDate ? endDate.toLocaleDateString() : "Any"}
              </Text>
              <TouchableOpacity onPress={clearFilters}>
                <Ionicons name="close-circle" size={20} color="#059669" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Trip List */}
        {filteredTrips.length === 0 ? (
          <View className="items-center justify-center p-8 bg-white rounded-lg">
            <Ionicons name="document-text-outline" size={48} color="#059669" />
            <Text className="mt-4 text-center text-gray-700">No trips found for the selected period.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredTrips}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="p-4 mb-3 bg-white rounded-lg"
                onPress={() => handleViewDetails(item)}
                activeOpacity={0.7}
              >
                <View className="flex-row justify-between mb-2">
                  <Text className="font-bold text-black">{item.passengerName}</Text>
                  <Text className="font-bold text-emerald-600">{item.fare}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-500">{formatDate(item.timestamp)}</Text>
                  <View className="flex-row items-center">
                    <Ionicons name={item.paymentMethod === "QR" ? "qr-code" : "cash"} size={16} color="#059669" />
                    <Text className="ml-1 text-gray-500">{item.paymentMethod}</Text>
                  </View>
                </View>
                <View className="flex-row items-center justify-between mt-2">
                  <Text className="text-xs text-gray-400">Tap for details</Text>
                  <Ionicons name="chevron-forward" size={16} color="#059669" />
                </View>
              </TouchableOpacity>
            )}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#059669"]} tintColor="#ffffff" />
            }
          />
        )}
      </View>

      {/* Date Range Picker Modal */}
      <DateRangePicker
        visible={showDatePicker}
        startDate={startDate}
        endDate={endDate}
        onSelectDates={(start, end) => {
          setStartDate(start)
          setEndDate(end)
          setShowDatePicker(false)
        }}
        onCancel={() => setShowDatePicker(false)}
      />
    </View>
  )
}

