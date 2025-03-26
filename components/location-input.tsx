"use client"

import { useState, useEffect, useRef } from "react"
import { View, Text, TextInput, TouchableOpacity, ScrollView, TouchableWithoutFeedback } from "react-native"
import { Ionicons } from "@expo/vector-icons"

interface LocationInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  locations?: string[] // Make locations optional
}

export default function LocationInput({ label, value, onChange, placeholder, locations = [] }: LocationInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState(false)

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current)
      }
    }
  }, [])

  const fetchLocationSuggestions = async (input: string): Promise<string[]> => {
    if (!input || input.length < 2) return []

    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        console.error("Google Maps API key is missing")
        return []
      }

      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=geocode&key=${apiKey}`
      const response = await fetch(url)
      const data = await response.json()

      if (data.status === "OK") {
        return data.predictions.map((prediction: any) => prediction.description)
      } else {
        console.error("Error in Google Maps API response:", data)
        return []
      }
    } catch (error) {
      console.error("Error fetching location suggestions:", error)
      return []
    }
  }

  const handleChange = (text: string) => {
    onChange(text)

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current)
    }

    if (text.length > 1) {
      debounceTimeout.current = setTimeout(() => {
        setShowDropdown(true)
        fetchLocationSuggestions(text).then(setSuggestions)
      }, 300)
    } else {
      setShowDropdown(false)
      setSuggestions([])
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
      <View className="flex-row items-center">
        <Ionicons name={label === "From" ? "location" : "location-outline"} size={24} color="black" className="mr-2" />
        <TextInput
          className="flex-1 p-4 bg-white rounded-md"
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder}
        />
      </View>

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

