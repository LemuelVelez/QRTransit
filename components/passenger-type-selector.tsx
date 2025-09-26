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

        // Deduplicate and sort
        const uniqueSorted = Array.from(new Set(types)).sort((a, b) => a.localeCompare(b))

        if (!isMounted) return
        setPassengerTypes(uniqueSorted)

        // Auto-select first only when there is real data and current value is not present
        if (uniqueSorted.length > 0 && !uniqueSorted.includes(value)) {
          onChange(uniqueSorted[0])
        }
        // If none, keep current value (likely empty)
      } catch (err) {
        console.error("Error fetching passenger types:", err)
        if (!isMounted) return
        setError("Failed to load passenger types")
        setPassengerTypes([]) // ⛔ no mock fallback
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchPassengerTypes()
    return () => {
      isMounted = false
    }
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

      <Text className="mb-2 text-xl font-bold text-white">Passenger</Text>

      {loading ? (
        <View className="flex-row items-center justify-between w-full p-4 bg-white rounded-t-md">
          <Text>Loading passenger types...</Text>
          <ActivityIndicator size="small" color="#10b981" />
        </View>
      ) : passengerTypes.length === 0 ? (
        <View className="w-full p-4 bg-white rounded-md">
          <Text className="italic text-gray-600">
            No available passenger types — contact the admin to create.
          </Text>
        </View>
      ) : (
        <>
          <TouchableOpacity
            className="flex-row items-center justify-between w-full p-4 bg-white rounded-t-md"
            onPress={() => setShowDropdown(!showDropdown)}
          >
            <Text>{value || "Select passenger type"}</Text>
            <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={24} color="black" />
          </TouchableOpacity>

          {error && (
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
        </>
      )}
    </View>
  )
}
