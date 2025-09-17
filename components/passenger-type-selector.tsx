// components/passenger-type-selector.tsx
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

  // Fetch passenger types from discounts (passenger-only, no bus type dependency)
  useEffect(() => {
    let isMounted = true

    async function fetchPassengerTypes() {
      try {
        setLoading(true)
        setError(null)

        const discounts = await getDiscountConfigurations()

        // Keep only active passenger discounts (exclude bus-type rules which have busType present)
        const types = discounts
          .filter((d: any) => d?.active && !d?.busType)
          .map((d: any) => String(d?.passengerType || "").trim())
          .filter((t: string) => t.length > 0)

        // Deduplicate
        const unique = Array.from(new Set(types))

        // Ensure "Regular" exists and is shown first
        if (!unique.includes("Regular")) unique.unshift("Regular")

        // Optional: sort remaining alphabetically, keeping "Regular" on top
        const sorted = ["Regular", ...unique.filter((t) => t !== "Regular").sort((a, b) => a.localeCompare(b))]

        if (!isMounted) return
        setPassengerTypes(sorted)

        // If current value is not in the list and we have types, update the value
        if (sorted.length > 0 && !sorted.includes(value)) {
          onChange(sorted[0])
        }
      } catch (err) {
        console.error("Error fetching passenger types:", err)
        if (!isMounted) return
        setError("Failed to load passenger types")

        // Fallback types
        const fallback = ["Regular", "Student", "Senior citizen", "Person's with Disabilities"]
        setPassengerTypes(fallback)

        if (!fallback.includes(value)) {
          onChange(fallback[0])
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchPassengerTypes()
    return () => {
      isMounted = false
    }
    // We intentionally depend only on `value` and `onChange`.
    // The parent will force a re-mount via changing `key` when it needs a refresh.
  }, [value, onChange])

  const handleSelect = (type: string) => {
    onChange(type)
    setShowDropdown(false)
  }

  return (
    <View className="relative mb-4">
      {showDropdown && (
        <TouchableWithoutFeedback onPress={() => setShowDropdown(false)}>
          <View className="absolute inset-0 z-10" style={{ top: -100, height: 1000 }} />
        </TouchableWithoutFeedback>
      )}

      <Text className="mb-2 text-xl font-bold text-black">Passenger</Text>

      {loading ? (
        <View className="flex-row items-center justify-between w-full p-4 bg-white rounded-t-md">
          <Text>Loading passenger types...</Text>
          <ActivityIndicator size="small" color="#10b981" />
        </View>
      ) : (
        <TouchableOpacity
          className="flex-row items-center justify-between w-full p-4 bg-white rounded-t-md"
          onPress={() => setShowDropdown(!showDropdown)}
        >
          <Text>{value}</Text>
          <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={24} color="black" />
        </TouchableOpacity>
      )}

      {error && !loading && (
        <View className="w-full p-3 bg-red-50">
          <Text className="text-sm text-red-500">{error}</Text>
        </View>
      )}

      {showDropdown && passengerTypes.length > 0 && (
        <View className="absolute z-20 w-full top-full">
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

      {showDropdown && !loading && passengerTypes.length === 0 && (
        <View className="absolute z-20 w-full top-full">
          <View className="w-full p-4 bg-white border-t border-gray-200">
            <Text className="italic text-gray-500">No passenger types available. Please create discounts first.</Text>
          </View>
        </View>
      )}
    </View>
  )
}
