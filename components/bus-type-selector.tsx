"use client"

import { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, ActivityIndicator } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { getBusTypeConfigurations } from "@/lib/discount-service"

interface BusTypeSelectorProps {
    value: string
    onChange: (type: string) => void
}

export default function BusTypeSelector({ value, onChange }: BusTypeSelectorProps) {
    const [showDropdown, setShowDropdown] = useState(false)
    const [busTypes, setBusTypes] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Fetch bus types from discounts
    useEffect(() => {
        async function fetchBusTypes() {
            try {
                setLoading(true)
                setError(null)

                // Get all bus type configurations
                const busTypeConfigs = await getBusTypeConfigurations()

                // Filter active bus types and extract types
                const types = busTypeConfigs.filter((config) => config.active).map((config) => config.busType)

                // Add "Regular" as default option if not already included
                if (!types.includes("Regular")) {
                    types.unshift("Regular")
                }

                setBusTypes(types)

                // If current value is not in the list and we have types, update the value
                if (types.length > 0 && !types.includes(value)) {
                    onChange(types[0])
                }
            } catch (err) {
                console.error("Error fetching bus types:", err)
                setError("Failed to load bus types")
                // Fallback to default types
                const defaultTypes = ["Regular", "Aircon", "Deluxe", "Premium"]
                setBusTypes(defaultTypes)
            } finally {
                setLoading(false)
            }
        }

        fetchBusTypes()
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

            <Text className="mb-1 font-medium text-gray-700">Bus Type</Text>

            {loading ? (
                <View className="flex-row items-center justify-between w-full p-3 border border-gray-300 rounded-md bg-gray-50">
                    <Text>Loading bus types...</Text>
                    <ActivityIndicator size="small" color="#10b981" />
                </View>
            ) : error ? (
                <View className="flex-row items-center justify-between w-full p-3 border border-gray-300 rounded-md bg-gray-50">
                    <Text className="text-red-500">{error}</Text>
                    <TouchableOpacity onPress={() => setShowDropdown(!showDropdown)}>
                        <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={24} color="black" />
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity
                    className="flex-row items-center justify-between w-full p-3 border border-gray-300 rounded-md bg-gray-50"
                    onPress={() => setShowDropdown(!showDropdown)}
                >
                    <View className="flex-row items-center">
                        <Ionicons name="bus-outline" size={20} color="#059669" className="mr-2" />
                        <Text>{value}</Text>
                    </View>
                    <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={24} color="black" />
                </TouchableOpacity>
            )}

            {showDropdown && busTypes.length > 0 && (
                <View className="absolute z-20 w-full bg-white border border-gray-300 shadow-lg top-full rounded-b-md">
                    {busTypes.map((type, index) => (
                        <TouchableOpacity
                            key={type}
                            className={`w-full p-3 ${index < busTypes.length - 1 ? "border-b border-gray-200" : ""}`}
                            onPress={() => handleSelect(type)}
                        >
                            <View className="flex-row items-center">
                                <Ionicons name="bus-outline" size={20} color="#059669" className="mr-2" />
                                <Text>{type}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {showDropdown && busTypes.length === 0 && (
                <View className="absolute z-20 w-full bg-white border border-gray-300 shadow-lg top-full rounded-b-md">
                    <View className="w-full p-3">
                        <Text className="italic text-gray-500">
                            No bus types available. Please create bus type configurations first.
                        </Text>
                    </View>
                </View>
            )}
        </View>
    )
}
