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
    <View className="bg-white p-4 rounded-lg shadow-sm mb-4">
      <Text className="text-lg font-bold mb-2">Bus Information</Text>
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
      <View className="flex-row justify-between">
        <Text className="text-gray-600">Conductor:</Text>
        <Text className="font-medium">{conductorName}</Text>
      </View>
    </View>
  )
}

export default BusInformation

