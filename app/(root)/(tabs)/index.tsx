"use client"

import { usePinVerification } from "@/lib/pin-context"
import { useRouter } from "expo-router"
import { useEffect, useState, useCallback } from "react"
import {
  View,
  Text,
  Image,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { getCurrentUserBalance } from "@/lib/transaction-service"

export default function WalletInterface() {
  const { isPinVerified } = usePinVerification()
  const router = useRouter()
  const [balance, setBalance] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // If PIN is not verified, redirect to PIN entry screen
  useEffect(() => {
    if (!isPinVerified) {
      router.replace("/pin")
    }
  }, [isPinVerified, router])

  // Function to fetch user balance
  const fetchBalance = useCallback(async () => {
    if (isPinVerified) {
      try {
        setIsLoading(true)
        const currentBalance = await getCurrentUserBalance()
        setBalance(currentBalance)
      } catch (error) {
        console.error("Error fetching balance:", error)
      } finally {
        setIsLoading(false)
        setRefreshing(false)
      }
    }
  }, [isPinVerified])

  // Fetch user balance when component mounts and PIN is verified
  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchBalance()
  }, [fetchBalance])

  // If PIN is not verified, show nothing while redirecting
  if (!isPinVerified) {
    return null
  }

  const handleSendMoney = () => {
    router.push("/send-money")
  }

  const handleCashIn = () => {
    router.push("/cash-in")
  }

  // Format balance with peso sign and thousand separators
  const formattedBalance = `₱${balance.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

  return (
    <SafeAreaView className="flex-1 bg-emerald-400">
      {/* Main Container */}
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#047857"]} // emerald-700
            tintColor="#047857"
          />
        }
      >
        <View className="flex-1 mt-6">
          {/* Header with logo */}
          <View className="mx-4 my-4">
            <View className="flex-row items-center gap-3 my-5">
              <View className="h-20 w-20 overflow-hidden rounded-full bg-emerald-900/10">
                <Image
                  source={require("../../../assets/images/QuickRide.png")}
                  className="h-20 w-20"
                  resizeMode="cover"
                />
              </View>
              <Text className="text-lg font-medium text-emerald-900">QR-Coded Bus Ticketing System</Text>
            </View>
          </View>

          {/* Wallet Card Container */}
          <View className="mx-4">
            <View className="overflow-hidden rounded-3xl bg-emerald-400">
              {/* Wallet Label */}
              <View className="flex-row">
                <View className="w-1/2 rounded-tr-xl rounded-tl-xl bg-emerald-600 px-4 py-3">
                  <Text className="text-lg font-medium text-white">Wallet</Text>
                </View>
              </View>

              {/* Balance Section */}
              <View className="bg-emerald-600 px-4 py-3">
                <View className="gap-1">
                  <Text className="text-sm text-emerald-100">Available balance</Text>
                  {isLoading ? (
                    <View className="flex-row items-center">
                      <ActivityIndicator size="small" color="#ffffff" />
                      <Text className="text-3xl font-semibold text-white ml-2">Loading...</Text>
                    </View>
                  ) : (
                    <Text className="text-3xl font-semibold text-white">{formattedBalance}</Text>
                  )}
                </View>
              </View>

              {/* Action Buttons Section */}
              <View className="p-4 bg-emerald-200">
                <View className="flex-row justify-around">
                  {/* Send Money Button */}
                  <TouchableOpacity className="items-center" onPress={handleSendMoney} activeOpacity={0.7}>
                    <View className="h-20 w-20 items-center justify-center mb-2">
                      <Image
                        source={require("../../../assets/images/Peso.png")}
                        className="h-20 w-20"
                        resizeMode="contain"
                      />
                    </View>
                    <Text className="text-sm font-medium text-emerald-800">Send Money</Text>
                  </TouchableOpacity>

                  {/* Cash In Button */}
                  <TouchableOpacity className="items-center" onPress={handleCashIn} activeOpacity={0.7}>
                    <View className="h-20 w-20 bg-emerald-500 rounded-full items-center justify-center mb-2">
                      <MaterialCommunityIcons name="cash-plus" size={32} color="white" />
                    </View>
                    <Text className="text-sm font-medium text-emerald-800">Cash In</Text>
                  </TouchableOpacity>
                </View>

                {/* Additional content can go here */}
                <View className="h-64 mt-4">{/* Placeholder for transaction history or other features */}</View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

