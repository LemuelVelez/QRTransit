"use client"

import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
  RefreshControl,
  Animated,
} from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { checkRoutePermission, getCurrentUser } from "@/lib/appwrite"
import { getInspectionHistory } from "@/lib/inspector-service"
import type { InspectionRecord } from "@/lib/types"
import DateRangePicker from "@/components/date-range-picker"

// Helper function to safely parse timestamps
const safeParseTimestamp = (timestamp: string | number): number => {
  if (typeof timestamp === "number") {
    return timestamp
  }

  try {
    return Number.parseInt(timestamp)
  } catch (error) {
    return Date.now() // Fallback to current time if parsing fails
  }
}

export default function InspectionHistoryScreen() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [inspections, setInspections] = useState<InspectionRecord[]>([])
  const [filteredInspections, setFilteredInspections] = useState<InspectionRecord[]>([])
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [inspectorId, setInspectorId] = useState("")
  const fadeAnim = useRef(new Animated.Value(0)).current
  const router = useRouter()

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
            await loadInspectionHistory(user.$id || "")
          }
        } catch (userError) {
          console.error("Error loading inspector data:", userError)
        }

        // Animate content in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start()
      } catch (error) {
        console.error("Error checking access:", error)
        Alert.alert("Error", "Failed to verify access permissions.")
        router.replace("/")
      }
    }

    checkAccess()
  }, [])

  useEffect(() => {
    if (startDate && endDate) {
      filterInspectionsByDate()
    } else {
      setFilteredInspections(inspections)
    }
  }, [startDate, endDate, inspections])

  const loadInspectionHistory = async (id: string) => {
    try {
      setLoading(true)
      const history = await getInspectionHistory(id)
      setInspections(history)
      setFilteredInspections(history)
    } catch (error) {
      console.error("Error loading inspection history:", error)
      Alert.alert("Error", "Failed to load inspection history.")
    } finally {
      setLoading(false)
    }
  }

  const filterInspectionsByDate = () => {
    if (!startDate || !endDate) return

    const filtered = inspections.filter((inspection) => {
      // Safely parse the timestamp
      const inspectionDate = new Date(safeParseTimestamp(inspection.timestamp))

      // Set end date to end of day for inclusive comparison
      const endOfDay = new Date(endDate)
      endOfDay.setHours(23, 59, 59, 999)

      return inspectionDate >= startDate && inspectionDate <= endOfDay
    })

    setFilteredInspections(filtered)
  }

  const clearFilters = () => {
    setStartDate(null)
    setEndDate(null)
    setFilteredInspections(inspections)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadInspectionHistory(inspectorId)
    setRefreshing(false)
  }

  const formatDate = (timestamp: string) => {
    // Safely parse the timestamp
    const date = new Date(safeParseTimestamp(timestamp))

    try {
      return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } catch (error) {
      return "Invalid Date"
    }
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-blue-600">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <ActivityIndicator size="large" color="white" />
        <Text className="mt-4 text-white font-medium">Loading inspection history...</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-blue-600">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-16 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-blue-500 rounded-full p-2"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Inspection History</Text>
        <View style={{ width: 32 }} />
      </View>

      <Animated.View className="px-5 flex-1" style={{ opacity: fadeAnim }}>
        {/* Date Filter */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-md elevation-2">
          <TouchableOpacity
            className="flex-row items-center justify-between mb-2"
            onPress={() => setShowDatePicker(true)}
            accessibilityLabel="Filter by date"
            accessibilityHint="Opens date picker to filter inspection records"
          >
            <Text className="text-gray-800 font-bold">Filter by Date</Text>
            <Ionicons name="calendar" size={22} color="#3b82f6" />
          </TouchableOpacity>

          {(startDate || endDate) && (
            <View className="flex-row justify-between items-center bg-blue-50 p-2 rounded-lg">
              <Text className="text-blue-700">
                {startDate ? startDate.toLocaleDateString() : "Any"} - {endDate ? endDate.toLocaleDateString() : "Any"}
              </Text>
              <TouchableOpacity onPress={clearFilters} accessibilityLabel="Clear date filter">
                <Ionicons name="close-circle" size={20} color="#3b82f6" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Inspection List */}
        <View className="flex-1 bg-gray-50 rounded-xl shadow-md elevation-2">
          {filteredInspections.length === 0 ? (
            <View className="p-8 items-center justify-center flex-1">
              <Ionicons name="document-text-outline" size={64} color="#3b82f6" />
              <Text className="text-gray-700 mt-4 text-center text-base">
                No inspections found for the selected period.
              </Text>
              {(startDate || endDate) && (
                <TouchableOpacity className="mt-4 bg-blue-50 px-4 py-2 rounded-lg" onPress={clearFilters}>
                  <Text className="text-blue-600">Clear filters</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={filteredInspections}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View
                  className="bg-white rounded-xl p-4 mx-3 my-1.5 shadow-sm elevation-1 border border-gray-100"
                  accessibilityLabel={`Inspection record for bus ${item.busNumber}`}
                >
                  <View className="flex-row justify-between mb-2">
                    <Text className="font-bold text-gray-800 text-base">Bus #{item.busNumber}</Text>
                    <Text className="text-gray-500 text-sm">{formatDate(item.timestamp)}</Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-600">Conductor:</Text>
                    <Text className="text-gray-800">{item.conductorName}</Text>
                  </View>

                  {/* Modified Inspection Route section - Changed to vertical layout */}
                  <View className="mb-2">
                    <Text className="text-gray-600 mb-1">Inspection Route:</Text>
                    <View className="bg-gray-50 p-2 rounded-lg">
                      <Text className="text-gray-800 mb-1">{item.inspectionFrom}</Text>
                      <View className="flex-row items-center justify-center my-1">
                        <Ionicons name="arrow-down" size={16} color="#3b82f6" />
                      </View>
                      <Text className="text-gray-800">{item.inspectionTo}</Text>
                    </View>
                  </View>

                  <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-600">Passenger Count:</Text>
                    <Text className="text-gray-800">{item.passengerCount}</Text>
                  </View>
                  <View className="mt-2 bg-green-100 rounded-lg p-2 flex-row items-center justify-center">
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" className="mr-1" />
                    <Text className="text-green-700 font-medium">Cleared</Text>
                  </View>
                </View>
              )}
              contentContainerStyle={{ padding: 12 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={["#3b82f6"]}
                  tintColor="#ffffff"
                />
              }
            />
          )}
        </View>
      </Animated.View>

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

