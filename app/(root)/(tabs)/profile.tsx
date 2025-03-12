"use client"

import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { useState } from "react"
import { logoutUser } from "@/lib/appwrite"

// Define your stack navigator types
type RootStackParamList = {
  "sign-in": undefined
}

const Profile = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

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

  return (
    <SafeAreaView className="flex-1 bg bg-emerald-600">
      {/* Profile Section */}
      <View className="bg-emerald-600 p-4 mt-9">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 bg-white rounded-full items-center justify-center">
            <Text className="text-2xl">👤</Text>
          </View>
          <View>
            <Text className="text-white font-medium">Jagdish Berondo</Text>
            <Text className="text-white text-xs">09876543210</Text>
          </View>
        </View>
      </View>

      {/* Settings Section */}
      <View className="bg-[#3FE693] flex-1 p-4">
        {/* Settings Button */}
        <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-[#4aff9b]">
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

