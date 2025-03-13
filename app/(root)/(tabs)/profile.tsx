"use client"

import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, Image } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { useState, useEffect } from "react"
import { logoutUser, getCurrentUser } from "@/lib/appwrite"

// Define your stack navigator types
type RootStackParamList = {
  "sign-in": undefined
  settings: undefined
}

// Define user type based on the getCurrentUser function return
type User = {
  $id: string
  firstname?: string
  lastname?: string
  username?: string
  email?: string
  phonenumber?: string
  avatar: string
  name: string
} | null

const Profile = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [user, setUser] = useState<User>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true)
        const userData = await getCurrentUser()
        setUser(userData)
      } catch (error) {
        console.error("Error fetching user data:", error)
        Alert.alert("Error", "Failed to load user profile. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [])

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await logoutUser()
      // Navigate to sign-in screen after successful logout
      navigation.navigate("sign-in")
    } catch (error) {
      console.error("Logout failed:", error)
      // Show error alert
      Alert.alert("Logout Failed", "There was a problem logging out. Please try again.", [{ text: "OK" }])
    } finally {
      setIsLoggingOut(false)
    }
  }

  const navigateToSettings = () => {
    navigation.navigate("settings")
  }

  // Display user's full name or username if available
  const displayName = user
    ? user.firstname && user.lastname
      ? `${user.firstname} ${user.lastname}`
      : user.username || user.name || "User"
    : "Loading..."

  // Display user's phone number if available
  const displayPhone = user?.phonenumber || "No phone number"

  // Check if avatar is a URL
  const isAvatarUrl =
    user?.avatar &&
    (user.avatar.startsWith("http://") || user.avatar.startsWith("https://") || user.avatar.startsWith("data:image/"))

  return (
    <SafeAreaView className="flex-1 bg bg-emerald-600">
      {/* Profile Section */}
      <View className="bg-emerald-600 p-4 mt-9">
        {isLoading ? (
          <ActivityIndicator size="large" color="white" />
        ) : (
          <View className="flex-row items-center gap-3">
            <View className="w-16 h-16 bg-white rounded-full items-center justify-center overflow-hidden">
              {isAvatarUrl ? (
                <Image source={{ uri: user?.avatar }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <Text className="text-2xl">{user?.avatar?.charAt(0) || "👤"}</Text>
              )}
            </View>
            <View>
              <Text className="text-white font-medium">{displayName}</Text>
              <Text className="text-white text-xs">{displayPhone}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Settings Section */}
      <View className="bg-[#3FE693] flex-1 p-4">
        {/* Settings Button */}
        <TouchableOpacity
          className="flex-row items-center justify-between py-3 border-b border-[#4aff9b]"
          onPress={navigateToSettings}
        >
          <View className="flex-row items-center gap-3">
            <Icon name="settings" size={20} color="black" />
            <Text className="text-base">Settings</Text>
          </View>
          <Icon name="chevron-right" size={20} color="black" />
        </TouchableOpacity>

        {/* Logout Button - Positioned right after Settings button */}
        <TouchableOpacity
          className="flex-row items-center justify-between py-3 border-b border-[#4aff9b] mt-30"
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          <View className="flex-row items-center gap-3">
            <Icon name="exit-to-app" size={20} color="black" />
            <Text className="text-base">Log Out</Text>
          </View>
          {isLoggingOut ? (
            <ActivityIndicator size="small" color="black" />
          ) : (
            <Icon name="chevron-right" size={20} color="black" />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

export default Profile

