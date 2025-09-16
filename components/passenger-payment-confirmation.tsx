import { View, Text, TouchableOpacity, Modal, ActivityIndicator } from "react-native"
import { Ionicons } from "@expo/vector-icons"

interface PassengerPaymentConfirmationProps {
  visible: boolean
  conductorName: string
  fare: string                   // total fare (backward compatible)
  from: string
  to: string
  onConfirm: () => void
  onCancel: () => void
  isProcessing: boolean
  // NEW (optional for backward compatibility)
  ticketCount?: number
  farePerPassenger?: string
  totalFare?: string             // if provided, supersedes `fare`
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
  ticketCount,
  farePerPassenger,
  totalFare,
}: PassengerPaymentConfirmationProps) {
  const totalToShow = totalFare || fare
  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View className="items-center justify-center flex-1 bg-black/50">
        <View className="bg-white w-[90%] max-w-md rounded-xl p-6">
          {isProcessing ? (
            <View className="items-center py-8">
              <ActivityIndicator size="large" color="#059669" />
              <Text className="mt-4 text-lg font-medium text-gray-800">Processing payment...</Text>
            </View>
          ) : (
            <>
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-xl font-bold text-gray-800">Payment Request</Text>
                <TouchableOpacity onPress={onCancel} disabled={isProcessing}>
                  <Ionicons name="close" size={24} color="#059669" />
                </TouchableOpacity>
              </View>

              <View className="p-4 mb-4 rounded-lg bg-emerald-50">
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

                {ticketCount ? (
                  <>
                    <View className="flex-row justify-between mb-2">
                      <Text className="text-gray-600">Tickets:</Text>
                      <Text className="font-medium text-gray-800">{ticketCount}</Text>
                    </View>
                    {farePerPassenger ? (
                      <View className="flex-row justify-between mb-2">
                        <Text className="text-gray-600">Per-Person Fare:</Text>
                        <Text className="font-medium text-gray-800">{farePerPassenger}</Text>
                      </View>
                    ) : null}
                  </>
                ) : null}

                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Total to Pay:</Text>
                  <Text className="font-bold text-emerald-600">{totalToShow}</Text>
                </View>
              </View>

              <Text className="mb-6 text-center text-gray-600">
                Do you authorize this fare payment{ticketCount ? ` for ${ticketCount} ticket(s)` : ""} from your balance?
              </Text>

              <View className="flex-row justify-between">
                <TouchableOpacity onPress={onCancel} className="items-center flex-1 py-3 mr-2 bg-gray-200 rounded-lg">
                  <Text className="font-medium text-gray-800">Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onConfirm}
                  className="items-center flex-1 py-3 ml-2 rounded-lg bg-emerald-500"
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
