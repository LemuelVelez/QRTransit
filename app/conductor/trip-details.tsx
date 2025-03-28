"use client"

import { useState, useEffect } from "react"
import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { getTripDetails } from "@/lib/trips-service"

export default function TripDetailsScreen() {
  const params = useLocalSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tripDetails, setTripDetails] = useState<any>(null)

  useEffect(() => {
    async function loadTripDetails() {
      if (params.id) {
        try {
          setLoading(true)
          const details = await getTripDetails(params.id as string)

          if (details) {
            setTripDetails(details)
          } else {
            // If no details found in the database, use the params
            setTripDetails({
              id: params.id,
              passengerName: params.passengerName,
              fare: params.fare,
              from: params.from,
              to: params.to,
              timestamp: Number(params.timestamp),
              paymentMethod: params.paymentMethod,
              transactionId: params.transactionId,
              passengerPhoto: params.passengerPhoto,
              passengerType: params.passengerType,
              kilometer: params.kilometer,
            })
          }
        } catch (error) {
          console.error("Error loading trip details:", error)
          // Use params as fallback
          setTripDetails({
            id: params.id,
            passengerName: params.passengerName,
            fare: params.fare,
            from: params.from,
            to: params.to,
            timestamp: Number(params.timestamp),
            paymentMethod: params.paymentMethod,
            transactionId: params.transactionId,
            passengerPhoto: params.passengerPhoto,
            passengerType: params.passengerType,
            kilometer: params.kilometer,
          })
        } finally {
          setLoading(false)
        }
      }
    }

    loadTripDetails()
  }, [params])

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString() + " " + date.toLocaleTimeString()
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-emerald-400">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <ActivityIndicator size="large" color="white" />
        <Text className="mt-4 text-white">Loading trip details...</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-emerald-400">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Header with back button */}
      <View className="flex-row items-center justify-between px-4 pt-16 pb-2">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Trip Details</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView className="flex-1 px-4 pt-2">
        <View className="bg-white rounded-lg p-6 mb-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-2xl font-bold text-gray-800">{tripDetails.passengerName}</Text>
            <Text className="text-xl font-bold text-emerald-600">{tripDetails.fare}</Text>
          </View>

          <View className="mb-4">
            <Text className="text-gray-500 mb-1">Transaction ID</Text>
            <Text className="text-gray-800 font-medium">{tripDetails.transactionId}</Text>
          </View>

          <View className="mb-4">
            <Text className="text-gray-500 mb-1">Date & Time</Text>
            <Text className="text-gray-800 font-medium">{formatDate(tripDetails.timestamp)}</Text>
          </View>

          <View className="flex-row mb-4">
            <View className="flex-1 mr-2">
              <Text className="text-gray-500 mb-1">From</Text>
              <Text className="text-gray-800 font-medium">{tripDetails.from}</Text>
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-gray-500 mb-1">To</Text>
              <Text className="text-gray-800 font-medium">{tripDetails.to}</Text>
            </View>
          </View>

          <View className="flex-row mb-4">
            <View className="flex-1 mr-2">
              <Text className="text-gray-500 mb-1">Payment Method</Text>
              <View className="flex-row items-center">
                <Ionicons
                  name={tripDetails.paymentMethod === "QR" ? "qr-code" : "cash"}
                  size={16}
                  color="#059669"
                  className="mr-1"
                />
                <Text className="text-gray-800 font-medium">{tripDetails.paymentMethod}</Text>
              </View>
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-gray-500 mb-1">Passenger Type</Text>
              <Text className="text-gray-800 font-medium">{tripDetails.passengerType || "Regular"}</Text>
            </View>
          </View>

          {tripDetails.kilometer && (
            <View className="mb-4">
              <Text className="text-gray-500 mb-1">Distance</Text>
              <Text className="text-gray-800 font-medium">{tripDetails.kilometer} km</Text>
            </View>
          )}

          {tripDetails.passengerPhoto && (
            <View className="mt-2">
              <Text className="text-gray-500 mb-2">Passenger Photo</Text>
              <Image
                source={{ uri: tripDetails.passengerPhoto }}
                className="w-full h-48 rounded-lg"
                resizeMode="cover"
              />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

