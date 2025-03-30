"use client"

import { useState, useEffect } from "react"
import { View, Text, TextInput, ActivityIndicator, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { calculateDistance } from "@/lib/google-maps-service"
import { getDiscountPercentage } from "@/lib/discount-service"

interface FareCalculatorProps {
  from: string
  to: string
  kilometer: string
  fare: string
  passengerType: string
  onKilometerChange: (value: string) => void
  onFareChange: (value: string) => void
}

export default function ModifiedFareCalculator({
  from,
  to,
  kilometer,
  fare,
  passengerType,
  onKilometerChange,
  onFareChange,
}: FareCalculatorProps) {
  const [calculating, setCalculating] = useState(false)
  const [manualInput, setManualInput] = useState(false)
  const [discountPercentage, setDiscountPercentage] = useState(0)

  useEffect(() => {
    // Auto-calculate distance when both from and to are set
    if (from && to && !manualInput) {
      calculateDistanceAndSetKm()
    }
  }, [from, to])

  useEffect(() => {
    // Load discount percentage when passenger type changes
    async function loadDiscount() {
      const percentage = await getDiscountPercentage(passengerType)
      setDiscountPercentage(percentage)
    }

    loadDiscount()
  }, [passengerType])

  useEffect(() => {
    // Calculate fare when kilometer or discount changes
    if (kilometer) {
      calculateFare()
    }
  }, [kilometer, discountPercentage])

  const calculateDistanceAndSetKm = async () => {
    if (!from || !to) return

    setCalculating(true)
    try {
      const result = await calculateDistance(from, to)

      if (result.status === "OK") {
        // Round to 1 decimal place
        const km = Math.round(result.distance * 10) / 10
        onKilometerChange(km.toString())
      }
    } catch (error) {
      console.error("Error calculating distance:", error)
    } finally {
      setCalculating(false)
    }
  }

  const calculateFare = () => {
    const km = Number.parseFloat(kilometer)
    let baseFare = 10 + km * 2 // ₱10 flag down rate + ₱2 per km

    // Apply discount if applicable
    if (discountPercentage > 0) {
      baseFare = baseFare * (1 - discountPercentage / 100)
    }

    onFareChange(`₱${baseFare.toFixed(2)}`)
  }

  const toggleInputMode = () => {
    setManualInput(!manualInput)
  }

  return (
    <>
      <View className="mb-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-black text-xl font-bold">Kilometer</Text>
          <TouchableOpacity onPress={toggleInputMode} className="flex-row items-center">
            <Ionicons name={manualInput ? "navigate" : "create-outline"} size={20} color="black" />
            <Text className="text-black ml-1">{manualInput ? "Auto Calculate" : "Manual Input"}</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center">
          {calculating ? (
            <View className="w-1/2 p-4 bg-white rounded-md flex-row items-center justify-center">
              <ActivityIndicator size="small" color="#059669" />
              <Text className="ml-2">Calculating...</Text>
            </View>
          ) : (
            <TextInput
              className="w-1/2 p-4 bg-white rounded-md"
              value={kilometer}
              onChangeText={(text) => {
                onKilometerChange(text)
                setManualInput(true)
              }}
              placeholder="Enter km"
              keyboardType="numeric"
              editable={manualInput}
            />
          )}

          {!manualInput && !calculating && (
            <TouchableOpacity className="ml-2 p-2 bg-emerald-600 rounded-md" onPress={calculateDistanceAndSetKm}>
              <Ionicons name="refresh" size={24} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View className="mb-8">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-black text-xl font-bold">Fare</Text>
          {discountPercentage > 0 && (
            <View className="bg-emerald-600 px-2 py-1 rounded-md">
              <Text className="text-white text-xs">{discountPercentage}% Discount Applied</Text>
            </View>
          )}
        </View>
        <View className="relative">
          <TextInput className="w-1/2 p-4 bg-white rounded-md" value={fare} editable={false} placeholder="₱0.00" />
          <Text className="absolute top-28 left-4 right-4 text-center text-xl text-white opacity-90 font-semibold">
            Seamless Journey, One Scan Away
          </Text>
        </View>
      </View>
    </>
  )
}

