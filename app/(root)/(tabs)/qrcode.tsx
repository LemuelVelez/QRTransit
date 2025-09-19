// app/(root)/(tabs)/qrcode.tsx
"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Vibration,
  ScrollView,
  RefreshControl,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import QRCode from "react-native-qrcode-svg"
import { useNavigation } from "@react-navigation/native"
import { useRouter } from "expo-router"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { getCurrentUser } from "@/lib/appwrite"
import { getCurrentUserBalance } from "@/lib/transaction-service"
import {
  subscribeToPaymentRequests,
  updatePaymentRequestStatus,
  getPaymentRequests,
  getPaymentRequest,
  type PaymentRequest,
} from "@/lib/appwrite-payment-service"
import PassengerPaymentConfirmation from "@/components/passenger-payment-confirmation"

const LAST_TX_KEY = "qr:lastHandledTxId"

export default function QRCodeDisplay() {
  const navigation = useNavigation()
  const router = useRouter()
  const [userName, setUserName] = useState("Loading...")
  const [userId, setUserId] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userBalance, setUserBalance] = useState<number | null>(null)

  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null)
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false)

  // We only keep "processing" while request is APPROVED and not yet COMPLETED/DECLINED/EXPIRED
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  const [qrTick, setQrTick] = useState(0)

  const subscriptionRef = useRef<(() => void) | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)          // processing poll
  const idlePollRef = useRef<NodeJS.Timeout | null>(null)      // idle pending poll

  const activeRequestIdRef = useRef<string | null>(null)
  const lastHandledTxIdRef = useRef<string | null>(null)
  const completedRequestIdRef = useRef<string | null>(null)     // dedupe per request

  // Refs to avoid stale state inside listeners
  const isProcessingRef = useRef(false)
  const showDialogRef = useRef(false)
  useEffect(() => {
    isProcessingRef.current = isProcessingPayment
  }, [isProcessingPayment])
  useEffect(() => {
    showDialogRef.current = showPaymentConfirmation
  }, [showPaymentConfirmation])

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(LAST_TX_KEY)
        if (saved) lastHandledTxIdRef.current = saved
      } catch { }
    })()
  }, [])

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
          const uid = user.$id || ""
          setUserId(uid)

          try {
            const balance = await getCurrentUserBalance()
            setUserBalance(balance)
          } catch (balanceError) {
            console.error("Error loading balance:", balanceError)
          }

          // Initial fetch for pending
          try {
            const pendings = await getPaymentRequests(uid, "passenger", "pending")
            if (pendings?.length) {
              const newest = pendings.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]
              activeRequestIdRef.current = newest.id
              completedRequestIdRef.current = null
              setPaymentRequest(newest)
              setShowPaymentConfirmation(true)
              Vibration.vibrate([0, 500, 200, 500])
            }
          } catch { }
        }
      } catch (error) {
        console.error("Error loading user data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadUserData()

    return () => {
      if (subscriptionRef.current) subscriptionRef.current()
      if (pollRef.current) clearInterval(pollRef.current)
      if (idlePollRef.current) clearInterval(idlePollRef.current)
    }
  }, [])

  // Idle poll for pending (only when no dialog and not processing)
  useEffect(() => {
    if (!userId) return

    const shouldPoll =
      !showPaymentConfirmation && !isProcessingPayment && !activeRequestIdRef.current
    if (!shouldPoll) {
      if (idlePollRef.current) {
        clearInterval(idlePollRef.current)
        idlePollRef.current = null
      }
      return
    }

    if (idlePollRef.current) clearInterval(idlePollRef.current)

    idlePollRef.current = setInterval(async () => {
      try {
        const pendings = await getPaymentRequests(userId, "passenger", "pending")
        if (pendings?.length) {
          const newest = pendings.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]
          // If we're already processing or already showing, don't re-open
          if (isProcessingRef.current || showDialogRef.current) return
          activeRequestIdRef.current = newest.id
          completedRequestIdRef.current = null
          setPaymentRequest(newest)
          setShowPaymentConfirmation(true)
          Vibration.vibrate([0, 500, 200, 500])
          if (idlePollRef.current) {
            clearInterval(idlePollRef.current)
            idlePollRef.current = null
          }
        }
      } catch { }
    }, 2000)

    return () => {
      if (idlePollRef.current) {
        clearInterval(idlePollRef.current)
        idlePollRef.current = null
      }
    }
  }, [userId, showPaymentConfirmation, isProcessingPayment])

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    if (!userId) return
    setRefreshing(true)
    try {
      try {
        const balance = await getCurrentUserBalance()
        setUserBalance(balance)
      } catch { }

      setQrTick((t) => t + 1)

      if (!showPaymentConfirmation && !isProcessingPayment && !activeRequestIdRef.current) {
        try {
          const pendings = await getPaymentRequests(userId, "passenger", "pending")
          if (pendings?.length) {
            const newest = pendings.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]
            if (isProcessingRef.current || showDialogRef.current) return
            activeRequestIdRef.current = newest.id
            completedRequestIdRef.current = null
            setPaymentRequest(newest)
            setShowPaymentConfirmation(true)
            Vibration.vibrate([0, 500, 200, 500])
          }
        } catch { }
      }
    } finally {
      setRefreshing(false)
    }
  }, [userId, showPaymentConfirmation, isProcessingPayment])

  // Realtime subscription
  useEffect(() => {
    if (!userId) return

    if (subscriptionRef.current) {
      subscriptionRef.current()
      subscriptionRef.current = null
    }

    const unsubscribe = subscribeToPaymentRequests(userId, "passenger", (request) => {
      setPaymentRequest((prev) => (prev?.id === request.id ? request : request))

      // Show dialog when a pending request arrives for this passenger
      if (request.status === "pending") {
        // Ignore if we're already working on this request or processing anything
        if (
          isProcessingRef.current ||
          activeRequestIdRef.current === request.id ||
          completedRequestIdRef.current === request.id
        ) {
          return
        }
        activeRequestIdRef.current = request.id
        completedRequestIdRef.current = null
        Vibration.vibrate([0, 500, 200, 500])
        setShowPaymentConfirmation(true)
        // ensure processing flag reset
        setIsProcessingPayment(false)
        return
      }

      const isActive =
        !!activeRequestIdRef.current && activeRequestIdRef.current === request.id
      if (!isActive) return

      if (request.status === "approved") {
        // Keep processing until COMPLETED; hide the dialog while processing.
        setIsProcessingPayment(true)
        setShowPaymentConfirmation(false)
      } else if (request.status === "declined") {
        setIsProcessingPayment(false)
        setShowPaymentConfirmation(false)
        completedRequestIdRef.current = request.id
        activeRequestIdRef.current = null
        Alert.alert("Payment Declined", "You declined the payment request.")
      } else if (request.status === "expired") {
        setIsProcessingPayment(false)
        setShowPaymentConfirmation(false)
        completedRequestIdRef.current = request.id
        activeRequestIdRef.current = null
        Alert.alert("Payment Expired", "The payment request expired.")
      } else if (request.status === "completed" && request.transactionId) {
        if (completedRequestIdRef.current !== request.id) {
          completedRequestIdRef.current = request.id
          handleCompleted(request)
        }
      }
    })

    subscriptionRef.current = unsubscribe
    return () => unsubscribe()
  }, [userId])

  // Processing poll: keep spinning while APPROVED; stop only when COMPLETED/DECLINED/EXPIRED
  useEffect(() => {
    if (!isProcessingPayment || !activeRequestIdRef.current) {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
      return
    }

    if (pollRef.current) clearInterval(pollRef.current)

    pollRef.current = setInterval(async () => {
      try {
        const id = activeRequestIdRef.current
        if (!id) return
        const latest = await getPaymentRequest(id)
        if (!latest) return

        setPaymentRequest(latest as PaymentRequest)

        if (latest.status === "completed" && latest.transactionId) {
          if (completedRequestIdRef.current !== id) {
            completedRequestIdRef.current = id
            clearInterval(pollRef.current as NodeJS.Timeout)
            pollRef.current = null
            handleCompleted(latest)
          }
        } else if (latest.status === "declined") {
          clearInterval(pollRef.current as NodeJS.Timeout)
          pollRef.current = null
          setIsProcessingPayment(false)
          setShowPaymentConfirmation(false)
          completedRequestIdRef.current = id
          activeRequestIdRef.current = null
          Alert.alert("Payment Declined", "The payment request was declined.")
        } else if (latest.status === "expired") {
          clearInterval(pollRef.current as NodeJS.Timeout)
          pollRef.current = null
          setIsProcessingPayment(false)
          setShowPaymentConfirmation(false)
          completedRequestIdRef.current = id
          activeRequestIdRef.current = null
          Alert.alert("Payment Expired", "The payment request expired.")
        }
        // else if approved: keep processing
      } catch { }
    }, 1200)

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [isProcessingPayment])

  const persistLastTx = async (txId: string) => {
    try {
      lastHandledTxIdRef.current = txId
      await AsyncStorage.setItem(LAST_TX_KEY, txId)
    } catch { }
  }

  const handleCompleted = (request: PaymentRequest) => {
    // Stop processing & clear active markers
    setIsProcessingPayment(false)
    setShowPaymentConfirmation(false)
    if (pollRef.current) clearInterval(pollRef.current)
    activeRequestIdRef.current = null

    if (request.transactionId) {
      persistLastTx(request.transactionId)
    }

    // Optimistic local balance update (authoritative balance still from server)
    if (userBalance !== null) {
      const fareAmount =
        Number(String(request.totalFare || request.fare).replace(/[^\d.]/g, "")) || 0
      setUserBalance((prev) => (prev === null ? prev : prev - fareAmount))
    }

    // Only mark as "viewed" AFTER the dialog (per requirement).
    const markViewed = async () => {
      try {
        await updatePaymentRequestStatus(request.id, "viewed")
      } catch { }
    }

    Alert.alert(
      "Payment Successful",
      `Your payment of ${request.totalFare || request.fare} has been processed.`,
      [
        {
          text: "View Receipt",
          onPress: async () => {
            await markViewed()
            router.push({
              pathname: "/receipt-passenger",
              params: {
                receiptId: request.transactionId,
                transactionId: request.transactionId,
                passengerName: userName,
                fare: request.totalFare || request.fare,
                from: request.from,
                to: request.to,
                timestamp: new Date().toLocaleString(),
                /** ✅ use the actual passenger type coming from the request */
                passengerType: request.passengerType || "Regular",
                busNumber: request.busNumber ?? "",
                busType: request.busType ?? "Regular",
                paymentMethod: "QR",
              },
            })
          },
        },
        {
          text: "Close",
          onPress: () => {
            markViewed()
          },
          style: "cancel",
        },
      ],
    )
  }

  const qrValue = JSON.stringify({
    userId,
    name: userName,
    timestamp: new Date().toISOString(),
    v: qrTick,
  })

  const handleConfirmPayment = async () => {
    if (!paymentRequest) return
    // Begin processing (debounce taps and stop idle poll from re-opening)
    setIsProcessingPayment(true)
    activeRequestIdRef.current = paymentRequest.id
    completedRequestIdRef.current = null
    setShowPaymentConfirmation(false)

    // Check balance locally to early-decline if needed
    if (userBalance !== null) {
      const needed =
        Number(String(paymentRequest.totalFare || paymentRequest.fare).replace(/[^\d.]/g, "")) || 0
      if (userBalance < needed) {
        Alert.alert(
          "Insufficient Balance",
          `Your current balance (₱${userBalance.toFixed(2)}) is not enough for this fare (${paymentRequest.totalFare || paymentRequest.fare}).`,
          [
            {
              text: "OK",
              onPress: () => {
                setIsProcessingPayment(false)
                setShowPaymentConfirmation(false)
                updatePaymentRequestStatus(paymentRequest.id, "declined").catch(() => { })
                setPaymentRequest(null)
                activeRequestIdRef.current = null
                completedRequestIdRef.current = null
              },
            },
          ],
        )
        return
      }
    }

    try {
      // Passenger approves; conductor will charge and set COMPLETED later.
      await updatePaymentRequestStatus(paymentRequest.id, "approved")
      // Keep processing; we stop only on completed/declined/expired.
    } catch (error) {
      console.error("Error approving payment:", error)
      setIsProcessingPayment(false)
      Alert.alert("Error", "Failed to approve payment. Please try again.")
    }
  }

  const handleCancelPayment = async () => {
    if (!paymentRequest) return
    try {
      await updatePaymentRequestStatus(paymentRequest.id, "declined")
      setShowPaymentConfirmation(false)
      setPaymentRequest(null)
      completedRequestIdRef.current = paymentRequest.id
      activeRequestIdRef.current = null
      if (pollRef.current) clearInterval(pollRef.current)
    } catch (error) {
      console.error("Error declining payment:", error)
      Alert.alert("Error", "Failed to decline payment. Please try again.")
    } finally {
      setIsProcessingPayment(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-emerald-400">
      <View className="px-4 mb-4 mt-9">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1">
          <MaterialIcons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#059669"]} tintColor="#059669" />
        }
      >
        <View className="items-center flex-1 mt-24 mb-16">
          <View className="w-full max-w-[320px] relative">
            <View className="absolute top-[-58px] left-1/2 transform -translate-x-12 w-28 h-28 bg-white rounded-full z-10 items-center justify-center shadow-lg">
              <View className="items-center justify-center rounded-full shadow-lg w-18 h-18 bg-emerald-400">
                <MaterialIcons name="account-circle" size={77} color="#ffffff" />
              </View>
            </View>

            <View className="items-center p-6 pt-12 bg-white shadow-lg rounded-3xl">
              <View className="mb-4">
                <Text className="text-xl font-semibold text-center text-gray-900">{userName}</Text>
                {userBalance !== null && (
                  <Text className="mt-1 font-medium text-center text-emerald-600">
                    Balance: ₱{userBalance.toFixed(2)}
                  </Text>
                )}
              </View>
              {loading ? (
                <View className="items-center justify-center w-64 h-64">
                  <Text>Loading QR code...</Text>
                </View>
              ) : (
                <QRCode value={qrValue} size={256} quietZone={16} />
              )}
              <Text className="mt-4 text-sm text-center text-gray-500">Pull down to refresh your QR & balance</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {showPaymentConfirmation && paymentRequest && (
        <PassengerPaymentConfirmation
          visible={showPaymentConfirmation}
          conductorName={paymentRequest.conductorName}
          fare={paymentRequest.fare}
          from={paymentRequest.from}
          to={paymentRequest.to}
          onConfirm={handleConfirmPayment}
          onCancel={handleCancelPayment}
          // now wired to real processing state so buttons disable immediately
          isProcessing={isProcessingPayment}
          ticketCount={Number(paymentRequest.ticketCount || "1")}
          farePerPassenger={paymentRequest.farePerPassenger}
          totalFare={paymentRequest.totalFare || paymentRequest.fare}
        />
      )}
    </SafeAreaView>
  )
}
