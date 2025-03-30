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
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { account } from "@/lib/appwrite"

type RootStackParamList = {
  "sign-in": undefined
}

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [email, setEmail] = useState("")
  const [isEmailFocused, setIsEmailFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError("Please enter your email address")
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Use Appwrite's password recovery
      await account.createRecovery(email, `${process.env.EXPO_PUBLIC_APP_URL}/reset-password`)

      setSuccess(true)
    } catch (err) {
      console.error("Password reset error:", err)
      setError("Failed to send password reset email. Please check your email and try again.")
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
        {success ? (
          <View className="bg-green-100 p-4 rounded-lg mb-4">
            <Text className="text-green-800 text-center">
              Password reset email sent! Please check your inbox and follow the instructions to reset your password.
            </Text>
          </View>
        ) : (
          <>
            {/* Error message */}
            {error && (
              <View className="mb-4 p-3 bg-red-100 rounded-lg">
                <Text className="text-red-600 text-center">{error}</Text>
              </View>
            )}

            <Text className="text-white text-xl font-bold mb-4 text-center">Forgot Password</Text>
            <Text className="text-white mb-6 text-center">
              Enter your email address and we'll send you a link to reset your password.
            </Text>

            {/* Email Input */}
            <View className="relative mb-4">
              <TextInput
                className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-800"
                placeholder=""
                value={email}
                onChangeText={setEmail}
                onFocus={() => setIsEmailFocused(true)}
                onBlur={() => setIsEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text
                className={`absolute left-4 transition-all text-sm ${
                  isEmailFocused || email ? "-top-2.5 text-gray-600" : "top-3.5 text-gray-400"
                }`}
              >
                Email
              </Text>
            </View>

            {/* Reset Button */}
            <TouchableOpacity
              className={`w-full ${
                isLoading ? "bg-blue-400" : "bg-blue-600"
              } py-3 rounded-lg hover:bg-blue-700 transition-colors mb-4`}
              onPress={handleResetPassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white text-center text-lg">Reset Password</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Back to Login */}
        <TouchableOpacity
          className="w-full bg-white text-gray-800 py-3 rounded-lg hover:bg-gray-50 transition-colors"
          onPress={() => navigation.navigate("sign-in")}
          disabled={isLoading}
        >
          <Text className="text-gray-800 text-center text-lg">Back to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

