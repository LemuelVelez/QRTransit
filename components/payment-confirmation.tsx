import { View, Text, TouchableOpacity, Modal, ActivityIndicator, Image } from "react-native"
import { Ionicons } from "@expo/vector-icons"

interface PaymentConfirmationProps {
  visible: boolean
  passengerName: string
  fare: string
  onConfirm: () => void
  onCancel: () => void
  isProcessing: boolean
  paymentMethod?: "QR" | "Cash"
  capturedImage?: string | null
}

export default function PaymentConfirmation({
  visible,
  passengerName,
  fare,
  onConfirm,
  onCancel,
  isProcessing,
  paymentMethod = "QR",
  capturedImage,
}: PaymentConfirmationProps) {
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
                <Text className="text-xl font-bold text-gray-800">
                  {paymentMethod === "QR" ? "Payment Confirmation" : "Cash Payment"}
                </Text>
                <TouchableOpacity onPress={onCancel} disabled={isProcessing}>
                  <Ionicons name="close" size={24} color="#059669" />
                </TouchableOpacity>
              </View>

              <View className="bg-emerald-50 p-4 rounded-lg mb-4">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-600">Passenger:</Text>
                  <Text className="font-medium text-gray-800">{passengerName}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Fare Amount:</Text>
                  <Text className="font-bold text-emerald-600">{fare}</Text>
                </View>
                <View className="flex-row justify-between mt-2">
                  <Text className="text-gray-600">Payment Method:</Text>
                  <View className="flex-row items-center">
                    <Ionicons
                      name={paymentMethod === "QR" ? "qr-code" : "cash"}
                      size={16}
                      color="#059669"
                      className="mr-1"
                    />
                    <Text className="font-medium text-gray-800">{paymentMethod}</Text>
                  </View>
                </View>
              </View>

              {paymentMethod === "Cash" && capturedImage && (
                <View className="mb-4">
                  <Text className="text-gray-600 mb-2">Passenger Photo:</Text>
                  <Image source={{ uri: capturedImage }} className="w-full h-48 rounded-lg" resizeMode="cover" />
                </View>
              )}

              <Text className="text-gray-600 mb-6 text-center">
                {paymentMethod === "QR"
                  ? "Confirm to deduct the fare amount from passenger's balance."
                  : "Confirm cash payment from passenger."}
              </Text>

              <View className="flex-row justify-between">
                <TouchableOpacity onPress={onCancel} className="flex-1 mr-2 py-3 bg-gray-200 rounded-lg items-center">
                  <Text className="font-medium text-gray-800">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onConfirm}
                  className="flex-1 ml-2 py-3 bg-emerald-500 rounded-lg items-center"
                >
                  <Text className="font-medium text-white">Confirm</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  )
}

