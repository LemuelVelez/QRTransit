"use client"

import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, ScrollView, TouchableWithoutFeedback } from "react-native"

interface LocationInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  locations: string[]
}

export default function LocationInput({ label, value, onChange, placeholder, locations }: LocationInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState(false)

  const filterLocations = (input: string): string[] => {
    return locations.filter((location) => location.toLowerCase().includes(input.toLowerCase()))
  }

  const handleChange = (text: string) => {
    onChange(text)
    if (text.length > 0) {
      setSuggestions(filterLocations(text))
      setShowDropdown(true)
    } else {
      setShowDropdown(false)
    }
  }

  const handleSelect = (location: string) => {
    onChange(location)
    setShowDropdown(false)
  }

  return (
    <View className="mb-4 relative">
      {showDropdown && (
        <TouchableWithoutFeedback onPress={() => setShowDropdown(false)}>
          <View className="absolute inset-0 z-10" style={{ top: -100, height: 1000 }} />
        </TouchableWithoutFeedback>
      )}

      <Text className="text-black text-xl font-bold mb-2">{label}</Text>
      <TextInput
        className="w-full p-4 bg-white rounded-md"
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
      />
      {showDropdown && suggestions.length > 0 && (
        <View className="absolute top-full w-full z-20 mt-1 bg-white rounded-md shadow-lg max-h-60">
          <ScrollView>
            {suggestions.map((location, index) => (
              <TouchableOpacity
                key={index}
                className="w-full p-3 border-b border-gray-100"
                onPress={() => handleSelect(location)}
              >
                <Text>{location}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  )
}

