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
import Icon from "react-native-vector-icons/MaterialIcons" // Use MaterialIcons
import { useNavigation } from "@react-navigation/native" // Import navigation hook
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { loginUser } from "@/lib/appwrite" // Import the loginUser function

// Define the navigation types directly within this file
type RootStackParamList = {
  register: undefined
  pin: undefined
}

const SignIn = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isUsernameFocused, setIsUsernameFocused] = useState(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Please enter both username and password")
      return
    }

    try {
      setIsLoading(true)
      setError("")

      const user = await loginUser(username, password)

      if (user) {
        // Login successful, navigate to pin screen
        navigation.navigate("pin")
      } else {
        setError("Login failed. Please try again.")
      }
    } catch (error) {
      console.error("Login error:", error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError("An unexpected error occurred. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-green-400 justify-center items-center p-4">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      <View className="w-full max-w-sm items-center mb-8">
        {/* Logo Circle */}
        <View className="w-48 h-48 bg-green-700 rounded-full justify-center items-center overflow-hidden">
          <Image
            source={require("../assets/images/QuickRide.png")} // Updated image path
            className="w-48 h-48 object-contain"
          />
        </View>
      </View>

      {/* Form Fields */}
      <View className="w-full">
        {/* Error message */}
        {error ? (
          <View className="mb-4 p-3 bg-red-100 rounded-lg">
            <Text className="text-red-600 text-center">{error}</Text>
          </View>
        ) : null}

        {/* Username Input */}
        <View className="relative mb-4">
          <TextInput
            className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-800"
            placeholder=""
            value={username}
            onChangeText={setUsername}
            onFocus={() => setIsUsernameFocused(true)}
            onBlur={() => setIsUsernameFocused(false)}
            autoCapitalize="none"
          />
          <Text
            className={`absolute left-4 transition-all text-sm ${isUsernameFocused || username ? "-top-2.5 text-gray-600" : "top-3.5 text-gray-400"
              }`}
          >
            Username
          </Text>
        </View>

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
            className={`absolute left-4 transition-all text-sm ${isPasswordFocused || password ? "-top-2.5 text-gray-600" : "top-3.5 text-gray-400"
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

        {/* Buttons */}
        <TouchableOpacity
          className={`w-full ${isLoading ? "bg-blue-400" : "bg-blue-600"} py-3 rounded-lg hover:bg-blue-700 transition-colors mb-4`}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white text-center text-lg">Log In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="w-full bg-white text-gray-800 py-3 rounded-lg hover:bg-gray-50 transition-colors"
          onPress={() => navigation.navigate("register")}
          disabled={isLoading}
        >
          <Text className="text-gray-800 text-center text-lg">
            Don't have an account? <Text className="underline">Register</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

export default SignIn

