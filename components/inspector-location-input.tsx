"use client"

import { View, Text, TextInput } from "react-native"
import { Ionicons } from "@expo/vector-icons"

interface InspectorLocationInputProps {
    label: string
    value: string
    onChange: (value: string) => void
    placeholder: string
    iconName?: "location-outline" | "flag-outline" | "map-outline" | "navigate-outline" | "pin-outline"
}

export default function InspectorLocationInput({
    label,
    value,
    onChange,
    placeholder,
    iconName = "location-outline",
}: InspectorLocationInputProps) {
    return (
        <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-1.5">{label}</Text>
            <View className="flex-row items-center bg-gray-100 rounded-lg px-3 border border-gray-200">
                <Ionicons name={iconName} size={18} color="#3b82f6" />
                <TextInput
                    className="flex-1 py-3 px-2 text-base text-gray-800"
                    value={value}
                    onChangeText={onChange}
                    placeholder={placeholder}
                    placeholderTextColor="#9ca3af"
                />
            </View>
        </View>
    )
}

