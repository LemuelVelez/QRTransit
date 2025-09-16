// app/(root)/(tabs)/index.tsx
"use client"

import { usePinVerification } from "@/lib/pin-context"
import { useRouter } from "expo-router"
import React, { useEffect, useState, useCallback, useRef } from "react"
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
import { getCurrentUserBalance, getAuthUserId } from "@/lib/transaction-service"
import { subscribeToPaymentRequests, type PaymentRequest } from "@/lib/appwrite-payment-service"
import { useFocusEffect } from "@react-navigation/native"

export default function WalletInterface() {
  const { isPinVerified } = usePinVerification()
  const router = useRouter()
  const [balance, setBalance] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Keep a ref to the realtime unsubscribe so we can clean it up
  const paymentUnsubRef = useRef<(() => void) | null>(null)

  // Redirect to PIN screen if not verified
  useEffect(() => {
    if (!isPinVerified) {
      router.replace("/pin")
    }
  }, [isPinVerified, router])

  // Fetch user balance
  const fetchBalance = useCallback(async () => {
    if (!isPinVerified) return
    try {
      if (!refreshing) setIsLoading(true)
      const currentBalance = await getCurrentUserBalance()
      setBalance(Number.isFinite(currentBalance) ? currentBalance : 0)
    } catch (error) {
      console.error("Error fetching balance:", error)
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }, [isPinVerified, refreshing])

  // Initial load
  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  // Refetch whenever this tab comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchBalance()
    }, [fetchBalance]),
  )

  // Subscribe to payment requests for this passenger; when a request completes, refresh balance
  useEffect(() => {
    let mounted = true

    const setup = async () => {
      if (!isPinVerified) return
      try {
        const userId = await getAuthUserId()

        // Clean any prior subscription
        if (paymentUnsubRef.current) {
          paymentUnsubRef.current()
          paymentUnsubRef.current = null
        }

        const unsub = subscribeToPaymentRequests(userId, "passenger", (req: PaymentRequest) => {
          if (!mounted) return
          if (req.status === "completed") {
            // A fare was charged successfully – pull the latest server-side balance
            fetchBalance()
          }
        })

        paymentUnsubRef.current = unsub
      } catch (e) {
        console.error("Payment subscription error:", e)
      }
    }

    setup()

    return () => {
      mounted = false
      if (paymentUnsubRef.current) {
        paymentUnsubRef.current()
        paymentUnsubRef.current = null
      }
    }
  }, [isPinVerified, fetchBalance])

  // Pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchBalance()
  }, [fetchBalance])

  if (!isPinVerified) return null

  const formattedBalance = `₱${balance.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

  const handleSendMoney = () => router.push("/send-money")
  const handleCashIn = () => router.push("/cash-in")

  return (
    <SafeAreaView className="flex-1 bg-emerald-400">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#047857"]}
            tintColor="#047857"
          />
        }
      >
        <View className="flex-1 mt-6">
          {/* Header with logo */}
          <View className="mx-4 my-4">
            <View className="flex-row items-center gap-3 my-5">
              <View className="w-20 h-20 overflow-hidden rounded-full bg-emerald-900/10">
                <Image
                  source={require("../../../assets/images/QuickRide.png")}
                  className="w-20 h-20"
                  resizeMode="cover"
                />
              </View>
              <Text className="text-lg font-medium text-emerald-900">QR-Coded Bus Ticketing System</Text>
            </View>
          </View>

          {/* Wallet Card */}
          <View className="mx-4">
            <View className="overflow-hidden rounded-3xl bg-emerald-400">
              <View className="flex-row">
                <View className="w-1/2 px-4 py-3 rounded-tr-xl rounded-tl-xl bg-emerald-600">
                  <Text className="text-lg font-medium text-white">Wallet</Text>
                </View>
              </View>

              {/* Balance */}
              <View className="px-4 py-3 bg-emerald-600">
                <View className="gap-1">
                  <Text className="text-sm text-emerald-100">Available balance</Text>
                  {isLoading ? (
                    <View className="flex-row items-center">
                      <ActivityIndicator size="small" color="#ffffff" />
                      <Text className="ml-2 text-3xl font-semibold text-white">Loading...</Text>
                    </View>
                  ) : (
                    <Text className="text-3xl font-semibold text-white">{formattedBalance}</Text>
                  )}
                </View>
              </View>

              {/* Actions */}
              <View className="p-4 bg-emerald-200">
                <View className="flex-row justify-around">
                  <TouchableOpacity className="items-center" onPress={handleSendMoney} activeOpacity={0.7}>
                    <View className="items-center justify-center w-20 h-20 mb-2">
                      <Image
                        source={require("../../../assets/images/Peso.png")}
                        className="w-20 h-20"
                        resizeMode="contain"
                      />
                    </View>
                    <Text className="text-sm font-medium text-emerald-800">Send Money</Text>
                  </TouchableOpacity>

                  <TouchableOpacity className="items-center" onPress={handleCashIn} activeOpacity={0.7}>
                    <View className="items-center justify-center w-20 h-20 mb-2 rounded-full bg-emerald-500">
                      <MaterialCommunityIcons name="cash-plus" size={32} color="white" />
                    </View>
                    <Text className="text-sm font-medium text-emerald-800">Cash In</Text>
                  </TouchableOpacity>
                </View>

                <View className="h-64 mt-4">{/* placeholder for history section */}</View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
