"use client"

import { useState, useEffect } from "react"
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, StatusBar } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { checkRoutePermission } from "@/lib/appwrite"
import { getTransactionDetails } from "@/lib/transaction-history-service"

export default function TransactionDetailsScreen() {
  const params = useLocalSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [transaction, setTransaction] = useState<any>(null)

  const { id } = params

  useEffect(() => {
    async function checkAccess() {
      try {
        // Check if user has conductor role specifically
        const hasPermission = await checkRoutePermission("conductor")

        if (!hasPermission) {
          router.replace("/")
          return
        }

        // Load transaction details
        if (id) {
          const details = await getTransactionDetails(id as string)
          if (details) {
            setTransaction(details)
          } else {
            // If transaction not found, use params as fallback
            setTransaction(params)
          }
        } else {
          setTransaction(params)
        }

        setLoading(false)
      } catch (error) {
        console.error("Error checking access:", error)
        router.replace("/")
      }
    }

    checkAccess()
  }, [id])

  const formatDate = (timestampStr: string) => {
    const timestamp = Number(timestampStr)
    if (isNaN(timestamp)) {
      return timestampStr
    }
    const date = new Date(timestamp)
    return date.toLocaleDateString() + " " + date.toLocaleTimeString()
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-emerald-400">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <ActivityIndicator size="large" color="white" />
      </View>
    )
  }

  const { passengerName, fare, from, to, timestamp, paymentMethod, transactionId, passengerPhoto } = transaction

  return (
    <View className="flex-1 bg-emerald-400">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Header */}
      <View className="pt-16 px-4 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Transaction Details</Text>
      </View>

      <ScrollView className="flex-1 p-4">
        <View className="bg-white rounded-lg p-6 mb-4">
          <View className="items-center mb-4">
            <Text className="text-2xl font-bold text-emerald-700">{fare}</Text>
            <Text className="text-gray-500">Transaction #{transactionId}</Text>
          </View>

          <View className="border-t border-gray-200 pt-4 mb-4">
            <View className="flex-row justify-between mb-3">
              <Text className="text-gray-600">Date & Time</Text>
              <Text className="text-black font-medium">{formatDate(timestamp as string)}</Text>
            </View>

            <View className="flex-row justify-between mb-3">
              <Text className="text-gray-600">Payment Method</Text>
              <View className="flex-row items-center">
                <Ionicons
                  name={paymentMethod === "QR" ? "qr-code" : "cash"}
                  size={16}
                  color="#059669"
                  className="mr-1"
                />
                <Text className="text-black font-medium">{paymentMethod}</Text>
              </View>
            </View>

            <View className="flex-row justify-between mb-3">
              <Text className="text-gray-600">Passenger</Text>
              <Text className="text-black font-medium">{passengerName}</Text>
            </View>
          </View>

          <View className="bg-gray-100 p-4 rounded-lg mb-4">
            <Text className="text-gray-600 mb-2">Route</Text>
            <View className="flex-row items-center mb-2">
              <Ionicons name="location" size={20} color="#059669" className="mr-2" />
              <Text className="text-black font-medium">{from}</Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="location-outline" size={20} color="#059669" className="mr-2" />
              <Text className="text-black font-medium">{to}</Text>
            </View>
          </View>

          {/* Passenger Photo (for cash payments) */}
          {paymentMethod === "Cash" && passengerPhoto && (
            <View className="mb-4">
              <Text className="text-gray-600 mb-2">Passenger Photo</Text>
              <View className="bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  source={{ uri: passengerPhoto }}
                  className="w-full h-48 object-cover"
                  defaultSource={require("@/assets/images/QuickRide.png")}
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

