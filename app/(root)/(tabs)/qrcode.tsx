"use client"

import { useEffect, useState, useRef } from "react"
import { View, Text, TouchableOpacity, SafeAreaView, Alert, Vibration } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import QRCode from "react-native-qrcode-svg"
import { useNavigation } from "@react-navigation/native"
import { useRouter } from "expo-router"
import { getCurrentUser } from "@/lib/appwrite"
import { getCurrentUserBalance } from "@/lib/transaction-service"
import {
  subscribeToPaymentRequests,
  updatePaymentRequestStatus,
  type PaymentRequest,
} from "@/lib/appwrite-payment-service"
import PassengerPaymentConfirmation from "@/components/passenger-payment-confirmation"

export default function QRCodeDisplay() {
  const navigation = useNavigation()
  const router = useRouter()
  const [userName, setUserName] = useState("Loading...")
  const [userId, setUserId] = useState("")
  const [loading, setLoading] = useState(true)
  const [userBalance, setUserBalance] = useState<number | null>(null)

  // Payment request state
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null)
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  // Subscription reference
  const subscriptionRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    async function loadUserData() {
      try {
        const user = await getCurrentUser()
        if (user) {
          const displayName =
            user.firstname && user.lastname
              ? `${user.firstname} ${user.lastname}`
              : user.username || user.email || "User"

          setUserName(displayName)
          setUserId(user.$id || "")

          // Load user balance
          try {
            const balance = await getCurrentUserBalance()
            setUserBalance(balance)
          } catch (balanceError) {
            console.error("Error loading balance:", balanceError)
          }
        }
      } catch (error) {
        console.error("Error loading user data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadUserData()

    // Clean up subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current()
      }
    }
  }, [])

  // Set up payment request listener when userId is available
  useEffect(() => {
    if (!userId) return

    // Subscribe to payment requests for this passenger
    const unsubscribe = subscribeToPaymentRequests(userId, "passenger", (request) => {
      // Only handle new pending requests or status updates to existing requests
      if (request.status === "pending" && (!paymentRequest || paymentRequest.id !== request.id)) {
        // Vibrate to alert the user
        Vibration.vibrate([0, 500, 200, 500])

        // Set payment request data
        setPaymentRequest(request)

        // Show confirmation dialog
        setShowPaymentConfirmation(true)
      } else if (paymentRequest && paymentRequest.id === request.id) {
        // Update the current payment request status
        setPaymentRequest(request)

        // If the payment was completed, close the dialog and show receipt
        if (request.status === "completed" && request.transactionId) {
          setIsProcessingPayment(false)
          setShowPaymentConfirmation(false)

          // Update balance (in a real app, this would come from the server)
          if (userBalance !== null) {
            const fareAmount = Number.parseFloat(request.fare.replace("₱", ""))
            const newBalance = userBalance - fareAmount
            setUserBalance(newBalance)
          }

          // Show success message
          Alert.alert("Payment Successful", `Your payment of ${request.fare} has been processed successfully.`, [
            {
              text: "View Receipt",
              onPress: () => {
                // Navigate to receipt screen with params
                router.push({
                  pathname: "/receipt",
                  params: {
                    transactionId: request.transactionId,
                    passengerName: userName,
                    fare: request.fare,
                    from: request.from,
                    to: request.to,
                    timestamp: new Date().toLocaleString(),
                    passengerType: "Regular", // This would come from user profile in a real app
                  },
                })
              },
            },
            { text: "Close" },
          ])
        }
      }
    })

    // Store the unsubscribe function
    subscriptionRef.current = unsubscribe

    return () => {
      unsubscribe()
    }
  }, [userId, paymentRequest, userBalance])

  // Generate QR code data with user information
  const qrValue = JSON.stringify({
    userId: userId,
    name: userName,
    timestamp: Date.now(),
  })

  // Handle payment confirmation
  const handleConfirmPayment = async () => {
    if (!paymentRequest) return

    setIsProcessingPayment(true)

    // Check if user has sufficient balance
    if (userBalance !== null && userBalance < Number.parseFloat(paymentRequest.fare.replace("₱", ""))) {
      Alert.alert(
        "Insufficient Balance",
        `Your current balance (₱${userBalance.toFixed(2)}) is not enough for this fare (${paymentRequest.fare}).`,
        [
          {
            text: "OK",
            onPress: () => {
              setIsProcessingPayment(false)
              setShowPaymentConfirmation(false)

              // Update payment request status to declined
              updatePaymentRequestStatus(paymentRequest.id, "declined").catch((error) =>
                console.error("Error updating payment status:", error),
              )

              setPaymentRequest(null)
            },
          },
        ],
      )
      return
    }

    try {
      // Update payment request status to approved
      await updatePaymentRequestStatus(paymentRequest.id, "approved")

      // The conductor will handle the actual payment processing
      // and update the status to "completed" with a transaction ID

      // We keep the dialog open with the processing state until we receive
      // the "completed" status update via the subscription
    } catch (error) {
      console.error("Error approving payment:", error)
      setIsProcessingPayment(false)
      Alert.alert("Error", "Failed to approve payment. Please try again.")
    }
  }

  // Handle payment cancellation
  const handleCancelPayment = async () => {
    if (!paymentRequest) return

    try {
      // Update payment request status to declined
      await updatePaymentRequestStatus(paymentRequest.id, "declined")

      setShowPaymentConfirmation(false)
      setPaymentRequest(null)
    } catch (error) {
      console.error("Error declining payment:", error)
      Alert.alert("Error", "Failed to decline payment. Please try again.")
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-emerald-400 p-4">
      {/* Navigation */}
      <View className="mb-4 mt-9">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1">
          <MaterialIcons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View className="flex-1 items-center mt-32">
        <View className="w-full max-w-[320px] relative">
          {/* Profile Icon with Material Icon */}
          <View className="absolute top-[-58px] left-1/2 transform -translate-x-12 w-28 h-28 bg-white rounded-full z-10 items-center justify-center shadow-lg">
            <View className="w-18 h-18 bg-emerald-400 rounded-full items-center justify-center shadow-lg">
              <MaterialIcons name="account-circle" size={77} color="#ffffff" />
            </View>
          </View>

          {/* Card Content */}
          <View className="bg-white rounded-3xl p-6 pt-12 items-center shadow-lg">
            <View className="mb-4">
              <Text className="text-xl font-semibold text-gray-900">{userName}</Text>
              {userBalance !== null && (
                <Text className="text-center text-emerald-600 font-medium mt-1">
                  Balance: ₱{userBalance.toFixed(2)}
                </Text>
              )}
            </View>
            {loading ? (
              <View className="w-64 h-64 items-center justify-center">
                <Text>Loading QR code...</Text>
              </View>
            ) : (
              <QRCode value={qrValue} size={256} quietZone={16} />
            )}
            <Text className="mt-4 text-sm text-gray-500">Scan to pay for your fare</Text>
          </View>
        </View>
      </View>

      {/* Payment Confirmation Dialog */}
      {showPaymentConfirmation && paymentRequest && (
        <PassengerPaymentConfirmation
          visible={showPaymentConfirmation}
          conductorName={paymentRequest.conductorName}
          fare={paymentRequest.fare}
          from={paymentRequest.from}
          to={paymentRequest.to}
          onConfirm={handleConfirmPayment}
          onCancel={handleCancelPayment}
          isProcessing={isProcessingPayment}
        />
      )}
    </SafeAreaView>
  )
}

