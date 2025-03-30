"use client"

import { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StatusBar,
  Alert,
  RefreshControl,
  Animated,
  Keyboard,
} from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { checkRoutePermission, getCurrentUser } from "@/lib/appwrite"
import { searchBusByNumber } from "@/lib/inspector-service"
import type { BusInfo } from "@/lib/types"

export default function InspectorScreen() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<BusInfo[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [inspectorId, setInspectorId] = useState("")
  const [inspectorName, setInspectorName] = useState("Inspector")
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [showEmptyState, setShowEmptyState] = useState(true)
  const fadeAnim = useState(new Animated.Value(0))[0]
  const router = useRouter()

  useEffect(() => {
    async function checkAccess() {
      try {
        // Check if user has inspector role specifically
        const hasPermission = await checkRoutePermission("inspector")

        if (!hasPermission) {
          Alert.alert("Access Denied", "You don't have permission to access this screen.")
          // Redirect to home
          router.replace("/")
          return
        }

        // Load inspector info
        try {
          const user = await getCurrentUser()
          if (user) {
            setInspectorId(user.$id || "")
            setInspectorName(
              user.firstname && user.lastname
                ? `${user.firstname} ${user.lastname}`
                : user.username || user.email || "Inspector",
            )
          }
        } catch (userError) {
          console.error("Error loading inspector data:", userError)
        }

        // Animate content in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start()

        setLoading(false)
      } catch (error) {
        console.error("Error checking access:", error)
        Alert.alert("Error", "Failed to verify access permissions.")
        router.replace("/")
      }
    }

    checkAccess()
  }, [])

  const handleSearch = async () => {
    // Reset any previous search errors
    setSearchError(null)

    if (!searchQuery.trim()) {
      Alert.alert("Error", "Please enter a bus number")
      return
    }

    Keyboard.dismiss()
    setIsSearching(true)
    setShowEmptyState(false)

    try {
      const results = await searchBusByNumber(searchQuery.trim())
      setSearchResults(results)

      // Save to recent searches if not already there
      if (!recentSearches.includes(searchQuery.trim())) {
        setRecentSearches((prev) => [searchQuery.trim(), ...prev.slice(0, 4)])
      }

      if (results.length === 0) {
        Alert.alert("No Results", "No buses found with this number")
      }
    } catch (error) {
      console.error("Search error:", error)
      setSearchError("Failed to search for buses. Please try again.")
      Alert.alert("Error", "Failed to search for buses")
    } finally {
      setIsSearching(false)
    }
  }

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    setSearchError(null)

    if (searchQuery.trim()) {
      await handleSearch()
    }
    setRefreshing(false)
  }, [searchQuery])

  const handleViewBusDetails = (bus: BusInfo) => {
    router.push({
      pathname: "/inspector/bus-details" as any,
      params: {
        busId: bus.id,
        busNumber: bus.busNumber,
        conductorId: bus.conductorId,
        conductorName: bus.conductorName,
        from: bus.from,
        to: bus.to,
      },
    })
  }

  const handleViewHistory = () => {
    router.push({
      pathname: "/inspector/history" as any,
    })
  }

  const handleViewProfile = () => {
    router.push({
      pathname: "/inspector/profile" as any,
    })
  }

  const handleRecentSearch = (query: string) => {
    setSearchQuery(query)
    setTimeout(() => {
      handleSearch()
    }, 100)
  }

  const handleClearSearch = () => {
    setSearchQuery("")
    setSearchResults([])
    setShowEmptyState(true)
    setSearchError(null)
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-blue-600">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <ActivityIndicator size="large" color="white" />
        <Text className="mt-4 text-white font-medium">Verifying access...</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-blue-600">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      <Animated.View className="flex-1 pt-16" style={{ opacity: fadeAnim }}>
        <View className="px-5">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-blue-100 text-base">Welcome,</Text>
              <Text className="text-white text-xl font-bold">{inspectorName}</Text>
            </View>
            <View className="flex-row">
              <TouchableOpacity
                className="mr-5 bg-blue-500 rounded-full p-2.5"
                onPress={handleViewHistory}
                accessibilityLabel="View inspection history"
              >
                <Ionicons name="time-outline" size={22} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-blue-500 rounded-full p-2.5"
                onPress={handleViewProfile}
                accessibilityLabel="View profile"
              >
                <Ionicons name="person-outline" size={22} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Box */}
          <View className="bg-white rounded-2xl p-4 mb-5 shadow-lg elevation-3">
            <Text className="text-gray-800 font-bold text-lg mb-3">Search Bus</Text>
            <View className="flex-row items-center">
              <TextInput
                className="flex-1 bg-gray-100 rounded-xl px-4 py-3.5 mr-3 text-base"
                placeholder="Enter bus number"
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                keyboardType="numeric"
                returnKeyType="search"
                accessibilityLabel="Bus number search field"
              />
              <TouchableOpacity
                className={`rounded-xl p-3.5 ${isSearching ? "bg-blue-400" : "bg-blue-600"}`}
                onPress={handleSearch}
                disabled={isSearching}
                accessibilityLabel="Search button"
                accessibilityHint="Searches for buses with the entered number"
              >
                {isSearching ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="search" size={22} color="white" />
                )}
              </TouchableOpacity>
            </View>

            {/* Search Error Message */}
            {searchError && (
              <View className="mt-2 bg-red-50 p-2 rounded-lg">
                <Text className="text-red-600 text-sm">{searchError}</Text>
              </View>
            )}

            {/* Recent Searches */}
            {recentSearches.length > 0 && showEmptyState && (
              <View className="mt-4">
                <Text className="text-gray-500 text-sm mb-2">Recent Searches</Text>
                <View className="flex-row flex-wrap">
                  {recentSearches.map((query, index) => (
                    <TouchableOpacity
                      key={index}
                      className="bg-gray-100 rounded-full px-3 py-1.5 mr-2 mb-2"
                      onPress={() => handleRecentSearch(query)}
                    >
                      <Text className="text-blue-600">{query}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Search Results */}
        <View className="flex-1 bg-gray-50 rounded-t-3xl px-5 pt-6 shadow-lg elevation-5">
          <Text className="text-gray-800 font-bold text-lg mb-4">
            {searchResults.length > 0 ? "Search Results" : "Recent Buses"}
          </Text>

          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="bg-white rounded-xl p-4 mb-4 border border-gray-100 shadow-sm elevation-1"
                onPress={() => handleViewBusDetails(item)}
                accessibilityLabel={`Bus ${item.busNumber} details`}
                accessibilityHint="Tap to view detailed information about this bus"
              >
                <View className="flex-row justify-between mb-2">
                  <Text className="font-bold text-blue-600 text-lg">Bus #{item.busNumber}</Text>
                  <View className={`px-3 py-1 rounded-full ${item.active ? "bg-green-100" : "bg-gray-100"}`}>
                    <Text className={`text-xs font-medium ${item.active ? "text-green-600" : "text-gray-600"}`}>
                      {item.active ? "Active" : "Inactive"}
                    </Text>
                  </View>
                </View>
                <Text className="text-gray-700 mb-1 text-base">Conductor: {item.conductorName}</Text>
                <Text className="text-gray-500 mb-2">
                  Route: {item.from} → {item.to}
                </Text>
                <View className="flex-row justify-between items-center mt-1 pt-2 border-t border-gray-100">
                  <Text className="text-xs text-blue-400">Tap for details</Text>
                  <Ionicons name="chevron-forward" size={16} color="#3b82f6" />
                </View>
              </TouchableOpacity>
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={["#3b82f6"]}
                tintColor="#3b82f6"
              />
            }
            ListEmptyComponent={
              <View className="items-center justify-center py-12">
                <Ionicons name="bus-outline" size={64} color="#d1d5db" />
                <Text className="text-gray-400 mt-4 text-center text-base">
                  {searchQuery.trim() && !showEmptyState
                    ? "No buses found with this number"
                    : "Search for a bus to begin inspection"}
                </Text>
                {searchQuery.trim() && !showEmptyState && (
                  <TouchableOpacity className="mt-4 bg-blue-50 px-4 py-2 rounded-lg" onPress={handleClearSearch}>
                    <Text className="text-blue-600">Clear search</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </View>
      </Animated.View>
    </View>
  )
}

