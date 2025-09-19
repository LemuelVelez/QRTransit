// components/passenger-payment-confirmation.tsx
import { useRef, useState } from "react"
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

  // Local “press” guard to avoid multiple taps & show instant spinner if parent is a bit late
  const pressedRef = useRef(false)
  const [localProcessing, setLocalProcessing] = useState(false)

  const confirmOnce = () => {
    if (pressedRef.current || isProcessing) return
    pressedRef.current = true
    setLocalProcessing(true)          // show spinner immediately
    try {
      onConfirm()
    } finally {
      // let parent own the final state; we keep spinner until modal unmounts/visible=false
      setTimeout(() => { pressedRef.current = false }, 1200)
    }
  }

  const canInteract = !(isProcessing || localProcessing)

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (canInteract) onCancel()
      }}
    >
      <View className="items-center justify-center flex-1 bg-black/50">
        <View className="bg-white w-[90%] max-w-md rounded-xl p-6">
          {isProcessing || localProcessing ? (
            <View className="items-center py-8">
              <ActivityIndicator size="large" color="#059669" />
              <Text className="mt-4 text-lg font-medium text-gray-800">Processing payment...</Text>
            </View>
          ) : (
            <>
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-xl font-bold text-gray-800">Payment Request</Text>
                <TouchableOpacity onPress={onCancel} disabled={!canInteract} accessibilityRole="button">
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

                {typeof ticketCount === "number" && ticketCount > 0 ? (
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
                <TouchableOpacity
                  onPress={canInteract ? onCancel : undefined}
                  disabled={!canInteract}
                  className={`items-center flex-1 py-3 mr-2 rounded-lg ${canInteract ? "bg-gray-200" : "bg-gray-200/70"}`}
                  accessibilityRole="button"
                >
                  <Text className="font-medium text-gray-800">Decline</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={confirmOnce}
                  disabled={!canInteract}
                  className={`items-center flex-1 py-3 ml-2 rounded-lg ${canInteract ? "bg-emerald-500" : "bg-emerald-500/60"}`}
                  accessibilityRole="button"
                  testID="authorize-button"
                  activeOpacity={0.85}
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
