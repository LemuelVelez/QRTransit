"use client"

import { useState } from "react"
import { View, Text, TouchableOpacity, TouchableWithoutFeedback } from "react-native"
import { Ionicons } from "@expo/vector-icons"

interface PassengerTypeSelectorProps {
  value: string
  onChange: (type: string) => void
}

export default function PassengerTypeSelector({ value, onChange }: PassengerTypeSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const passengerTypes = ["Regular", "Student", "Senior citizen", "Person's with Disabilities"]

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
      <TouchableOpacity
        className="flex-row items-center justify-between w-full bg-white p-4 rounded-t-md"
        onPress={() => setShowDropdown(!showDropdown)}
      >
        <Text>{value}</Text>
        <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={24} color="black" />
      </TouchableOpacity>

      {showDropdown && (
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
    </View>
  )
}

