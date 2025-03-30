"use client"

import { useState } from "react"
import {
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { registerPin } from "@/lib/appwrite"

type RootStackParamList = {
  pin: undefined
}

export default function ForgotPINScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [password, setPassword] = useState("")
  const [newPIN, setNewPIN] = useState("")
  const [confirmPIN, setConfirmPIN] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)
  const [isNewPINFocused, setIsNewPINFocused] = useState(false)
  const [isConfirmPINFocused, setIsConfirmPINFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleResetPIN = async () => {
    if (!password) {
      setError("Please enter your password")
      return
    }

    if (!newPIN || newPIN.length !== 4) {
      setError("PIN must be 4 digits")
      return
    }

    if (newPIN !== confirmPIN) {
      setError("PINs do not match")
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Register the new PIN
      await registerPin(newPIN)

      Alert.alert("Success", "Your PIN has been reset successfully", [
        {
          text: "OK",
          onPress: () => navigation.navigate("pin"),
        },
      ])
    } catch (err) {
      console.error("PIN reset error:", err)
      setError("Failed to reset PIN. Please check your password and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-green-400 justify-center items-center p-4">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      <View className="w-full max-w-sm items-center mb-8">
        {/* Logo Circle */}
        <View className="w-24 h-24 bg-green-700 rounded-full justify-center items-center overflow-hidden">
          <Image source={require("../assets/images/QuickRide.png")} className="w-24 h-24 object-contain" />
        </View>
      </View>

      {/* Form Fields */}
      <View className="w-full">
        {/* Error message */}
        {error && (
          <View className="mb-4 p-3 bg-red-100 rounded-lg">
            <Text className="text-red-600 text-center">{error}</Text>
          </View>
        )}

        <Text className="text-white text-xl font-bold mb-4 text-center">Reset PIN</Text>
        <Text className="text-white mb-6 text-center">Enter your password and a new PIN to reset your PIN.</Text>

        {/* Password Input */}
        <View className="relative mb-4">
          <TextInput
            className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-800 pr-12"
            placeholder=""
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            onFocus={() => setIsPasswordFocused(true)}
            onBlur={() => setIsPasswordFocused(false)}
          />
          <Text
            className={`absolute left-4 transition-all text-sm ${
              isPasswordFocused || password ? "-top-2.5 text-gray-600" : "top-3.5 text-gray-400"
            }`}
          >
            Password
          </Text>
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            {showPassword ? (
              <Icon name="visibility-off" size={24} color="#6B7280" />
            ) : (
              <Icon name="visibility" size={24} color="#6B7280" />
            )}
          </TouchableOpacity>
        </View>

        {/* New PIN Input */}
        <View className="relative mb-4">
          <TextInput
            className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-800"
            placeholder=""
            value={newPIN}
            onChangeText={(text) => setNewPIN(text.replace(/[^0-9]/g, "").slice(0, 4))}
            onFocus={() => setIsNewPINFocused(true)}
            onBlur={() => setIsNewPINFocused(false)}
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
          />
          <Text
            className={`absolute left-4 transition-all text-sm ${
              isNewPINFocused || newPIN ? "-top-2.5 text-gray-600" : "top-3.5 text-gray-400"
            }`}
          >
            New PIN (4 digits)
          </Text>
        </View>

        {/* Confirm PIN Input */}
        <View className="relative mb-4">
          <TextInput
            className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-800"
            placeholder=""
            value={confirmPIN}
            onChangeText={(text) => setConfirmPIN(text.replace(/[^0-9]/g, "").slice(0, 4))}
            onFocus={() => setIsConfirmPINFocused(true)}
            onBlur={() => setIsConfirmPINFocused(false)}
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
          />
          <Text
            className={`absolute left-4 transition-all text-sm ${
              isConfirmPINFocused || confirmPIN ? "-top-2.5 text-gray-600" : "top-3.5 text-gray-400"
            }`}
          >
            Confirm PIN
          </Text>
        </View>

        {/* Reset Button */}
        <TouchableOpacity
          className={`w-full ${
            isLoading ? "bg-blue-400" : "bg-blue-600"
          } py-3 rounded-lg hover:bg-blue-700 transition-colors mb-4`}
          onPress={handleResetPIN}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white text-center text-lg">Reset PIN</Text>
          )}
        </TouchableOpacity>

        {/* Back to PIN Entry */}
        <TouchableOpacity
          className="w-full bg-white text-gray-800 py-3 rounded-lg hover:bg-gray-50 transition-colors"
          onPress={() => navigation.navigate("pin")}
          disabled={isLoading}
        >
          <Text className="text-gray-800 text-center text-lg">Back to PIN Entry</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

