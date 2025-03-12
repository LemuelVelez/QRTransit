import { View, TouchableOpacity } from "react-native"

interface QRButtonProps {
  onPress: () => void
}

export default function QRButton({ onPress }: QRButtonProps) {
  return (
    <View className="p-4">
      <TouchableOpacity
        className="mb-20 w-16 h-16 mx-auto border-2 border-black rounded-md items-center justify-center"
        onPress={onPress}
      >
        <View className="w-12 h-12 relative">
          <View className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-black" />
          <View className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-black" />
          <View className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-black" />
          <View className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-black" />
          <View className="absolute top-1/2 left-0 right-0 h-0.5 bg-black" />
        </View>
      </TouchableOpacity>
    </View>
  )
}

