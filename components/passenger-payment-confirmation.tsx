import { View, Text, TouchableOpacity, Modal, ActivityIndicator } from "react-native"
import { Ionicons } from "@expo/vector-icons"

interface PassengerPaymentConfirmationProps {
  visible: boolean
  conductorName: string
  fare: string
  from: string
  to: string
  onConfirm: () => void
  onCancel: () => void
  isProcessing: boolean
}

export default function PassengerPaymentConfirmation({
  visible,
  conductorName,
  fare,
  from,
  to,
  onConfirm,
  onCancel,
  isProcessing,
}: PassengerPaymentConfirmationProps) {
  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white w-[90%] max-w-md rounded-xl p-6">
          {isProcessing ? (
            <View className="items-center py-8">
              <ActivityIndicator size="large" color="#059669" />
              <Text className="mt-4 text-lg font-medium text-gray-800">Processing payment...</Text>
            </View>
          ) : (
            <>
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-gray-800">Payment Request</Text>
                <TouchableOpacity onPress={onCancel} disabled={isProcessing}>
                  <Ionicons name="close" size={24} color="#059669" />
                </TouchableOpacity>
              </View>

              <View className="bg-emerald-50 p-4 rounded-lg mb-4">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-600">Conductor:</Text>
                  <Text className="font-medium text-gray-800">{conductorName}</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-600">From:</Text>
                  <Text className="font-medium text-gray-800">{from}</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-600">To:</Text>
                  <Text className="font-medium text-gray-800">{to}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Fare Amount:</Text>
                  <Text className="font-bold text-emerald-600">{fare}</Text>
                </View>
              </View>

              <Text className="text-gray-600 mb-6 text-center">
                Do you authorize this fare payment from your balance?
              </Text>

              <View className="flex-row justify-between">
                <TouchableOpacity onPress={onCancel} className="flex-1 mr-2 py-3 bg-gray-200 rounded-lg items-center">
                  <Text className="font-medium text-gray-800">Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onConfirm}
                  className="flex-1 ml-2 py-3 bg-emerald-500 rounded-lg items-center"
                >
                  <Text className="font-medium text-white">Authorize</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  )
}

