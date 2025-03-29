"use client"

import { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
  RefreshControl,
} from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { checkRoutePermission, getCurrentUser, logoutUser } from "@/lib/appwrite"
import { getUserStats } from "@/lib/conductor-service"

interface ConductorStats {
  totalTrips: string
  totalPassengers: string
  totalRevenue: string
  lastActive: string
}

export default function ConductorProfileScreen() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<ConductorStats>({
    totalTrips: "0",
    totalPassengers: "0",
    totalRevenue: "0.00",
    lastActive: "-",
  })
  const router = useRouter()

  const loadProfile = async () => {
    try {
      // Check if user has conductor role specifically
      const hasPermission = await checkRoutePermission("conductor")

      if (!hasPermission) {
        Alert.alert("Access Denied", "You don't have permission to access this screen.")
        router.replace("/")
        return
      }

      // Load conductor info
      const currentUser = await getCurrentUser()
      if (currentUser) {
        setUser(currentUser)

        // Load conductor stats
        const conductorStats = await getUserStats(currentUser.$id)
        setStats(conductorStats)
      }
    } catch (error) {
      console.error("Error loading profile:", error)
      Alert.alert("Error", "Failed to load profile information.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadProfile()
    setRefreshing(false)
  }, [])

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        onPress: async () => {
          try {
            setLoading(true)
            const { success } = await logoutUser()
            if (success) {
              router.replace("/sign-in")
            }
          } catch (error) {
            console.error("Logout failed:", error)
            Alert.alert("Logout Failed", "There was a problem logging out. Please try again.")
          } finally {
            setLoading(false)
          }
        },
      },
    ])
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-emerald-400">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <ActivityIndicator size="large" color="white" />
        <Text className="mt-4 text-white">Loading profile...</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-emerald-400">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Header */}
      <View className="pt-16 px-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Profile</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#059669"]} tintColor="#ffffff" />
        }
      >
        {/* Profile Card */}
        <View className="bg-white rounded-lg p-6 mb-4 items-center">
          <View className="w-24 h-24 bg-emerald-100 rounded-full justify-center items-center mb-4">
            {user?.profileImage ? (
              <Image source={{ uri: user.profileImage }} className="w-24 h-24 rounded-full" />
            ) : (
              <Ionicons name="person" size={48} color="#059669" />
            )}
          </View>

          <Text className="text-2xl font-bold text-gray-800 mb-1">
            {user?.firstname && user?.lastname ? `${user.firstname} ${user.lastname}` : user?.username || "Conductor"}
          </Text>

          <Text className="text-gray-500 mb-4">Conductor ID: {user?.$id?.substring(0, 8) || "N/A"}</Text>

          {user?.email && (
            <View className="flex-row items-center mb-2">
              <Ionicons name="mail-outline" size={16} color="#059669" className="mr-2" />
              <Text className="text-gray-600">{user.email}</Text>
            </View>
          )}

          {user?.phone && (
            <View className="flex-row items-center">
              <Ionicons name="call-outline" size={16} color="#059669" className="mr-2" />
              <Text className="text-gray-600">{user.phone}</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View className="bg-white rounded-lg p-6 mb-4">
          <Text className="text-lg font-bold text-gray-800 mb-4">Activity Summary</Text>

          <View className="flex-row justify-between mb-4">
            <View className="items-center">
              <Text className="text-2xl font-bold text-emerald-600">{stats.totalTrips}</Text>
              <Text className="text-gray-500">Total Trips</Text>
            </View>

            <View className="items-center">
              <Text className="text-2xl font-bold text-emerald-600">{stats.totalPassengers}</Text>
              <Text className="text-gray-500">Passengers</Text>
            </View>

            <View className="items-center">
              <Text className="text-2xl font-bold text-emerald-600">₱{stats.totalRevenue}</Text>
              <Text className="text-gray-500">Revenue</Text>
            </View>
          </View>

          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={16} color="#059669" className="mr-2" />
            <Text className="text-gray-600">Last active: {stats.lastActive}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="bg-white rounded-lg p-6">
          <Text className="text-lg font-bold text-gray-800 mb-4">Quick Actions</Text>

          <TouchableOpacity
            className="flex-row items-center py-3 border-b border-gray-100"
            onPress={() => router.push("/conductor/history")}
          >
            <Ionicons name="document-text-outline" size={20} color="#059669" className="mr-4" />
            <Text className="text-gray-700">View Transaction History</Text>
            <Ionicons name="chevron-forward" size={20} color="#059669" className="ml-auto" />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center py-3 border-b border-gray-100"
            onPress={() => router.push("/conductor/route-setup")}
          >
            <Ionicons name="map-outline" size={20} color="#059669" className="mr-4" />
            <Text className="text-gray-700">Set Up New Route</Text>
            <Ionicons name="chevron-forward" size={20} color="#059669" className="ml-auto" />
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center py-3 border-b border-gray-100"
            onPress={() => {
              const router = useRouter()
              router.push("/conductor/manage-discounts")
            }}
          >
            <Ionicons name="cash-outline" size={20} color="#059669" className="mr-4" />
            <Text className="text-gray-700">Manage Discounts</Text>
            <Ionicons name="chevron-forward" size={20} color="#059669" className="ml-auto" />
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center py-3"
            onPress={() => Alert.alert("Help", "Contact support at support@quickride.com")}
          >
            <Ionicons name="help-circle-outline" size={20} color="#059669" className="mr-4" />
            <Text className="text-gray-700">Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#059669" className="ml-auto" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

