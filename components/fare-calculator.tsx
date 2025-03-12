import { View, Text, TextInput } from "react-native"
import { Ionicons } from "@expo/vector-icons"

interface FareCalculatorProps {
  kilometer: string
  fare: string
  onKilometerChange: (value: string) => void
}

export default function FareCalculator({ kilometer, fare, onKilometerChange }: FareCalculatorProps) {
  return (
    <>
      <View className="mb-4">
        <View className="flex-row items-center mb-2">
          <Text className="text-black text-xl font-bold">Kilometer</Text>
          <Ionicons name="bus-outline" size={24} color="black" className="ml-4" />
        </View>
        <TextInput
          className="w-1/2 p-4 bg-white rounded-md"
          value={kilometer}
          onChangeText={onKilometerChange}
          placeholder="Enter km"
          keyboardType="numeric"
        />
      </View>

      <View className="mb-8">
        <Text className="text-black text-xl font-bold mb-2">Fare</Text>
        <View className="relative">
          <TextInput className="w-1/2 p-4 bg-white rounded-md" value={fare} editable={false} placeholder="₱0.00" />
          <Text className="absolute bottom-[-96] left-4 right-4 text-center text-xl text-white opacity-90 font-semibold">
            Seamless Journey, One Scan Away
          </Text>
        </View>
      </View>
    </>
  )
}

