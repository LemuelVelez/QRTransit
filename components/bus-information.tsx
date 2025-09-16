// components/bus-information.tsx
"use client"

import { useEffect, useState } from "react"
import { View, Text } from "react-native"
import { getConductorName } from "@/lib/conductor-service"

interface BusInformationProps {
  route: {
    from: string
    to: string
    busNumber: string
    conductorId: string
    busType?: string
  }
}

const BusInformation = ({ route }: BusInformationProps) => {
  const [conductorName, setConductorName] = useState<string>("Loading...")

  useEffect(() => {
    async function loadConductorName() {
      if (route.conductorId) {
        try {
          const name = await getConductorName(route.conductorId)
          setConductorName(name)
        } catch (error) {
          console.error("Error loading conductor name:", error)
          setConductorName("Unknown Conductor")
        }
      } else {
        setConductorName("Unknown Conductor")
      }
    }

    loadConductorName()
  }, [route.conductorId])

  return (
    <View className="p-4 mb-4 bg-white rounded-lg shadow-sm">
      <Text className="mb-2 text-lg font-bold">Bus Information</Text>
      <View className="flex-row justify-between mb-1">
        <Text className="text-gray-600">Route:</Text>
        <Text className="font-medium">
          {route.from} → {route.to}
        </Text>
      </View>
      <View className="flex-row justify-between mb-1">
        <Text className="text-gray-600">Bus Number:</Text>
        <Text className="font-medium">{route.busNumber}</Text>
      </View>
      <View className="flex-row justify-between mb-1">
        <Text className="text-gray-600">Bus Type:</Text>
        <Text className="font-medium">{route.busType || "Regular"}</Text>
      </View>
      <View className="flex-row justify-between">
        <Text className="text-gray-600">Conductor:</Text>
        <Text className="font-medium">{conductorName}</Text>
      </View>
    </View>
  )
}

export default BusInformation
