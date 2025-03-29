"use client"

import { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, ActivityIndicator } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { getDiscountConfigurations } from "@/lib/discount-service"

interface PassengerTypeSelectorProps {
  value: string
  onChange: (type: string) => void
}

export default function PassengerTypeSelector({ value, onChange }: PassengerTypeSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [passengerTypes, setPassengerTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch passenger types from discounts
  useEffect(() => {
    async function fetchPassengerTypes() {
      try {
        setLoading(true)
        setError(null)

        // Get all discount configurations
        const discounts = await getDiscountConfigurations()

        // Filter active discounts and extract passenger types
        const types = discounts.filter((discount) => discount.active).map((discount) => discount.passengerType)

        // Add "Regular" as default option if not already included
        if (!types.includes("Regular")) {
          types.unshift("Regular")
        }

        setPassengerTypes(types)

        // If current value is not in the list and we have types, update the value
        if (types.length > 0 && !types.includes(value)) {
          onChange(types[0])
        }
      } catch (err) {
        console.error("Error fetching passenger types:", err)
        setError("Failed to load passenger types")
        // Fallback to default types
        const defaultTypes = ["Regular", "Student", "Senior citizen", "Person's with Disabilities"]
        setPassengerTypes(defaultTypes)
      } finally {
        setLoading(false)
      }
    }

    fetchPassengerTypes()
  }, [value, onChange])

  const handleSelect = (type: string) => {
    onChange(type)
    setShowDropdown(false)
  }

  return (
    <View className="mb-4 relative">
      {showDropdown && (
        <TouchableWithoutFeedback onPress={() => setShowDropdown(false)}>
          <View className="absolute inset-0 z-10" style={{ top: -100, height: 1000 }} />
        </TouchableWithoutFeedback>
      )}

      <Text className="text-black text-xl font-bold mb-2">Passenger</Text>

      {loading ? (
        <View className="flex-row items-center justify-between w-full bg-white p-4 rounded-t-md">
          <Text>Loading passenger types...</Text>
          <ActivityIndicator size="small" color="#10b981" />
        </View>
      ) : error ? (
        <View className="flex-row items-center justify-between w-full bg-white p-4 rounded-t-md">
          <Text className="text-red-500">{error}</Text>
          <TouchableOpacity onPress={() => setShowDropdown(!showDropdown)}>
            <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={24} color="black" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          className="flex-row items-center justify-between w-full bg-white p-4 rounded-t-md"
          onPress={() => setShowDropdown(!showDropdown)}
        >
          <Text>{value}</Text>
          <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={24} color="black" />
        </TouchableOpacity>
      )}

      {showDropdown && passengerTypes.length > 0 && (
        <View className="absolute top-full w-full z-20">
          {passengerTypes.map((type) => (
            <TouchableOpacity
              key={type}
              className="w-full p-4 bg-white border-t border-gray-200"
              onPress={() => handleSelect(type)}
            >
              <Text>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {showDropdown && passengerTypes.length === 0 && (
        <View className="absolute top-full w-full z-20">
          <View className="w-full p-4 bg-white border-t border-gray-200">
            <Text className="text-gray-500 italic">No passenger types available. Please create discounts first.</Text>
          </View>
        </View>
      )}
    </View>
  )
}

