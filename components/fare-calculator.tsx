// components/fare-calculator.tsx
"use client"

import { useState, useEffect } from "react"
import { View, Text, TextInput, ActivityIndicator, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { calculateDistance } from "@/lib/google-maps-service"
import { getDiscountPercentage, getBusTypeFareMultiplier } from "@/lib/discount-service"

interface FareCalculatorProps {
  from: string
  to: string
  kilometer: string
  fare: string
  passengerType: string
  busType?: string
  onKilometerChange: (value: string) => void
  onFareChange: (value: string) => void
}

export default function ModifiedFareCalculator({
  from,
  to,
  kilometer,
  fare,
  passengerType,
  busType = "Regular",
  onKilometerChange,
  onFareChange,
}: FareCalculatorProps) {
  const [calculating, setCalculating] = useState(false)
  const [manualInput, setManualInput] = useState(false)
  const [discountPercentage, setDiscountPercentage] = useState(0)
  const [busMultiplier, setBusMultiplier] = useState(1)

  useEffect(() => {
    if (from && to && !manualInput) {
      calculateDistanceAndSetKm()
    }
  }, [from, to])

  useEffect(() => {
    async function loadDiscountAndBusType() {
      const [pct, mult] = await Promise.all([
        getDiscountPercentage(passengerType, busType),
        getBusTypeFareMultiplier(busType),
      ])
      setDiscountPercentage(pct)
      setBusMultiplier(mult)
    }
    loadDiscountAndBusType()
  }, [passengerType, busType])

  useEffect(() => {
    if (kilometer) {
      calculateFare()
    }
  }, [kilometer, discountPercentage, busMultiplier])

  const calculateDistanceAndSetKm = async () => {
    if (!from || !to) return

    setCalculating(true)
    try {
      const result = await calculateDistance(from, to)

      if (result.status === "OK") {
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
    const flagDown = 10
    const rate = 2
    let base = flagDown + km * rate

    // Apply bus type uplift (multiplier), then discount
    base = base * (busMultiplier || 1)
    if (discountPercentage > 0) {
      base = base * (1 - discountPercentage / 100)
    }

    onFareChange(`₱${base.toFixed(2)}`)
  }

  const toggleInputMode = () => {
    setManualInput(!manualInput)
  }

  return (
    <>
      <View className="mb-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xl font-bold text-black">Kilometer</Text>
          <TouchableOpacity onPress={toggleInputMode} className="flex-row items-center">
            <Ionicons name={manualInput ? "navigate" : "create-outline"} size={20} color="black" />
            <Text className="ml-1 text-black">{manualInput ? "Auto Calculate" : "Manual Input"}</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center">
          {calculating ? (
            <View className="flex-row items-center justify-center w-1/2 p-4 bg-white rounded-md">
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
            <TouchableOpacity className="p-2 ml-2 rounded-md bg-emerald-600" onPress={calculateDistanceAndSetKm}>
              <Ionicons name="refresh" size={24} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View className="mb-8">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xl font-bold text-black">Fare</Text>
          {discountPercentage > 0 && (
            <View className="px-2 py-1 rounded-md bg-emerald-600">
              <Text className="text-xs text-white">{discountPercentage}% Discount Applied</Text>
            </View>
          )}
        </View>
        <View className="relative">
          <TextInput className="w-1/2 p-4 bg-white rounded-md" value={fare} editable={false} placeholder="₱0.00" />
          <Text className="absolute text-xl font-semibold text-center text-white top-28 left-4 right-4 opacity-90">
            Seamless Journey, One Scan Away
          </Text>
        </View>
      </View>
    </>
  )
}
