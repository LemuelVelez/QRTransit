"use client"

import { useState } from "react"
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, Alert } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { logoutUser } from "@/lib/appwrite"

interface ProfileDropdownProps {
  onLogoutStart?: () => void
  onLogoutEnd?: () => void
}

export default function ProfileDropdown({ onLogoutStart, onLogoutEnd }: ProfileDropdownProps) {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const router = useRouter()

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
            if (onLogoutStart) onLogoutStart()
            const { success } = await logoutUser()
            if (success) {
              router.replace("/sign-in")
            }
          } catch (error) {
            console.error("Logout failed:", error)
            Alert.alert("Logout Failed", "There was a problem logging out. Please try again.")
          } finally {
            if (onLogoutEnd) onLogoutEnd()
          }
        },
      },
    ])
    setShowProfileDropdown(false)
  }

  return (
    <>
      {showProfileDropdown && (
        <TouchableWithoutFeedback onPress={() => setShowProfileDropdown(false)}>
          <View className="absolute inset-0 z-10" />
        </TouchableWithoutFeedback>
      )}

      <View className="absolute top-12 right-4 z-20">
        <TouchableOpacity
          onPress={() => setShowProfileDropdown(!showProfileDropdown)}
          className="w-10 h-10 rounded-full bg-white justify-center items-center border-2 border-emerald-600"
        >
          <Ionicons name="person" size={20} color="#059669" />
        </TouchableOpacity>

        {showProfileDropdown && (
          <View className="absolute top-12 right-0 bg-emerald-800 rounded-md shadow-lg w-32 z-30">
            <TouchableOpacity className="p-3 border-b border-gray-100 flex-row items-center" onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color="white" />
              <Text className="ml-2 text-white">Logout</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  )
}

