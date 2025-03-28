"use client"

import { useState, useEffect, useRef } from "react"
import { View, Text, ScrollView, Alert, ActivityIndicator, StatusBar, TouchableOpacity } from "react-native"
import { useCameraPermissions, type BarcodeScanningResult } from "expo-camera"
import { useRouter } from "expo-router"
import { checkRoutePermission } from "@/lib/appwrite"
import { getCurrentUser } from "@/lib/appwrite"
import { getActiveRoute } from "@/lib/route-service"
import { generateTransactionId, saveTransaction } from "@/lib/transaction-history-service"
import PassengerTypeSelector from "@/components/passenger-type-selector"
import LocationInput from "@/components/location-input"
import ModifiedFareCalculator from "@/components/fare-calculator"
import QRScanner from "@/components/qr-scanner"
import PaymentConfirmation from "@/components/payment-confirmation"
import { parseQRData, processPayment } from "@/lib/qr-payment-service"
import {
  createPaymentRequest,
  subscribeToPaymentRequests,
  updatePaymentRequestStatus,
  type PaymentRequest,
} from "@/lib/appwrite-payment-service"
import { Ionicons } from "@expo/vector-icons"
import CameraCapture from "@/components/camera-capture"

export default function ConductorScreen() {
  const [passengerType, setPassengerType] = useState("Regular")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [kilometer, setKilometer] = useState("")
  const [fare, setFare] = useState("")
  const [showQrScanner, setShowQrScanner] = useState(false)
  const [showCameraCapture, setShowCameraCapture] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [scanned, setScanned] = useState(false)
  const [loading, setLoading] = useState(true)
  const [conductorId, setConductorId] = useState("")
  const [conductorName, setConductorName] = useState("Conductor")
  const [paymentMethod, setPaymentMethod] = useState<"QR" | "Cash">("QR")
  const [routeInfo, setRouteInfo] = useState<{ from: string; to: string; busNumber: string } | null>(null)

  // Payment confirmation state
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false)
  const [passengerData, setPassengerData] = useState<{ userId: string; name: string } | null>(null)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [currentPaymentRequest, setCurrentPaymentRequest] = useState<PaymentRequest | null>(null)

  // Subscription reference
  const subscriptionRef = useRef<(() => void) | null>(null)

  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const router = useRouter()

  useEffect(() => {
    async function checkAccess() {
      try {
        // Check if user has conductor role specifically
        const hasPermission = await checkRoutePermission("conductor")

        if (!hasPermission) {
          Alert.alert("Access Denied", "You don't have permission to access this screen.")
          // Redirect to home
          router.replace("/")
          return
        }

        // Load conductor info
        try {
          const user = await getCurrentUser()
          if (user) {
            setConductorId(user.$id || "")
            setConductorName(
              user.firstname && user.lastname
                ? `${user.firstname} ${user.lastname}`
                : user.username || user.email || "Conductor",
            )

            // Load active route
            const activeRoute = await getActiveRoute(user.$id || "")
            if (activeRoute) {
              setRouteInfo({
                from: activeRoute.from,
                to: activeRoute.to,
                busNumber: activeRoute.busNumber,
              })
              setFrom(activeRoute.from)
              setTo(activeRoute.to)
            } else {
              // No active route, redirect to route setup
              router.replace({
                pathname: "/conductor/route-setup" as any,
              })
              return
            }
          }
        } catch (userError) {
          console.error("Error loading conductor data:", userError)
        }

        setLoading(false)
      } catch (error) {
        console.error("Error checking access:", error)
        Alert.alert("Error", "Failed to verify access permissions.")
        router.replace("/")
      }
    }

    checkAccess()

    // Clean up subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current()
      }
    }
  }, [])

  // Set up payment response listener when conductorId is available
  useEffect(() => {
    if (!conductorId) return

    // Subscribe to payment requests for this conductor
    const unsubscribe = subscribeToPaymentRequests(conductorId, "conductor", (request) => {
      // Only handle updates to the current payment request
      if (currentPaymentRequest && currentPaymentRequest.id === request.id) {
        // Update the current payment request
        setCurrentPaymentRequest(request)

        // Handle status changes
        if (request.status === "approved") {
          // Process the payment
          handleProcessPayment(request)
        } else if (request.status === "declined") {
          // Payment was declined by passenger
          setIsProcessingPayment(false)
          setShowPaymentConfirmation(false)
          Alert.alert("Payment Declined", "The passenger declined the payment request.")
          setCurrentPaymentRequest(null)
        }
      }
    })

    // Store the unsubscribe function
    subscriptionRef.current = unsubscribe

    return () => {
      unsubscribe()
    }
  }, [conductorId, currentPaymentRequest])

  useEffect(() => {
    ; (async () => {
      if (!cameraPermission?.granted) {
        await requestCameraPermission()
      }
    })()
  }, [cameraPermission, requestCameraPermission])

  useEffect(() => {
    if (kilometer) {
      const km = Number.parseFloat(kilometer)
      let baseFare = 10 + km * 2 // ₱10 flag down rate + ₱2 per km

      switch (passengerType) {
        case "Student":
        case "Senior citizen":
        case "Person's with Disabilities":
          baseFare = baseFare * 0.8 // 20% discount
          break
        default:
          break
      }

      setFare(`₱${baseFare.toFixed(2)}`)
    } else {
      setFare("")
    }
  }, [kilometer, passengerType])

  const handleBarCodeScanned = ({ type, data }: BarcodeScanningResult) => {
    setScanned(true)

    // Parse QR code data
    const parsedData = parseQRData(data)

    if (!parsedData) {
      Alert.alert("Invalid QR Code", "The scanned QR code doesn't contain valid passenger information.", [
        {
          text: "OK",
          onPress: () => {
            setScanned(false)
            setShowQrScanner(false)
          },
        },
      ])
      return
    }

    // Check if fare is set
    if (!fare || fare === "₱0.00") {
      Alert.alert("Fare Not Set", "Please set the kilometer and fare before scanning.", [
        {
          text: "OK",
          onPress: () => {
            setScanned(false)
            setShowQrScanner(false)
          },
        },
      ])
      return
    }

    // Store passenger data and show confirmation
    setPassengerData(parsedData)
    setShowQrScanner(false)
    setShowPaymentConfirmation(true)
  }

  const handleCaptureImage = (uri: string) => {
    setCapturedImage(uri)
    setShowCameraCapture(false)

    // For cash payment, create a dummy passenger
    setPassengerData({
      userId: "cash_passenger_" + Date.now(),
      name: "Cash Customer",
    })
    setShowPaymentConfirmation(true)
  }

  // Send payment request to passenger
  const handleConfirmPayment = async () => {
    if (!passengerData || !fare || !conductorId) return

    setIsProcessingPayment(true)

    try {
      if (paymentMethod === "QR") {
        // Create payment request in Appwrite
        const request = await createPaymentRequest(
          conductorId,
          conductorName,
          passengerData.userId,
          passengerData.name,
          fare,
          from || "Unknown",
          to || "Unknown",
        )

        // Store the current payment request
        setCurrentPaymentRequest(request)
      } else {
        // For cash payment, process directly
        const transactionId = generateTransactionId()

        // Save the transaction to the database
        const transaction = {
          passengerName: passengerData.name,
          fare: fare,
          from: from || "Unknown",
          to: to || "Unknown",
          timestamp: Date.now(),
          paymentMethod: "Cash",
          transactionId: transactionId,
          conductorId: conductorId,
          passengerPhoto: capturedImage || undefined,
          passengerType: passengerType,
          kilometer: kilometer,
        }

        const savedTransactionId = await saveTransaction(transaction)

        // Close confirmation dialog
        setShowPaymentConfirmation(false)
        setIsProcessingPayment(false)

        // Navigate to receipt screen
        router.push({
          pathname: "/receipt" as any,
          params: {
            receiptId: savedTransactionId || "cash_" + transactionId,
            passengerName: passengerData.name,
            fare: fare,
            from: from,
            to: to,
            timestamp: new Date().toLocaleString(),
            passengerType: passengerType,
            paymentMethod: "Cash",
          },
        })
      }
    } catch (error) {
      console.error("Error creating payment request:", error)
      setIsProcessingPayment(false)
      Alert.alert("Error", "Failed to send payment request. Please try again.")
    }
  }

  // Process payment after passenger approval
  const handleProcessPayment = async (request: PaymentRequest) => {
    if (!request || !passengerData) return

    try {
      // Extract numeric value from fare string (remove ₱ symbol)
      const fareAmount = Number.parseFloat(request.fare.replace("₱", ""))

      // Process payment
      const result = await processPayment(
        request.passengerId,
        fareAmount,
        `Fare payment from ${request.from} to ${request.to}`,
      )

      if (result.success) {
        // Generate transaction ID
        const transactionId = generateTransactionId()

        // Save the transaction to the database
        const transaction = {
          passengerName: passengerData.name,
          fare: request.fare,
          from: request.from,
          to: request.to,
          timestamp: Date.now(),
          paymentMethod: "QR",
          transactionId: transactionId,
          conductorId: conductorId,
          passengerType: passengerType,
          kilometer: kilometer,
        }

        const savedTransactionId = await saveTransaction(transaction)

        // Update payment request status to completed with transaction ID
        await updatePaymentRequestStatus(request.id, "completed", savedTransactionId || result.transactionId)

        // Close confirmation dialog
        setShowPaymentConfirmation(false)
        setIsProcessingPayment(false)
        setCurrentPaymentRequest(null)

        // Navigate to receipt screen
        router.push({
          pathname: "/receipt" as any,
          params: {
            receiptId: savedTransactionId || result.transactionId,
            passengerName: passengerData.name,
            fare: request.fare,
            from: request.from,
            to: request.to,
            timestamp: new Date().toLocaleString(),
            passengerType: passengerType,
            paymentMethod: "QR",
          },
        })
      } else {
        // Show error
        setIsProcessingPayment(false)
        setCurrentPaymentRequest(null)
        Alert.alert("Payment Failed", result.error || "Failed to process payment")
      }
    } catch (error) {
      setIsProcessingPayment(false)
      setCurrentPaymentRequest(null)
      console.error("Payment error:", error)
      Alert.alert("Payment Error", "An unexpected error occurred while processing payment")
    }
  }

  const handleCancelPayment = () => {
    setShowPaymentConfirmation(false)
    setPassengerData(null)
    setScanned(false)
    setCurrentPaymentRequest(null)
    setCapturedImage(null)
  }

  const handlePaymentMethodChange = (method: "QR" | "Cash") => {
    setPaymentMethod(method)

    if (method === "QR") {
      setShowQrScanner(true)
    } else {
      setShowCameraCapture(true)
    }
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-emerald-400">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <ActivityIndicator size="large" color="white" />
        <Text className="mt-4 text-white">Verifying access...</Text>
      </View>
    )
  }

  if (showQrScanner) {
    return (
      <QRScanner
        onScan={handleBarCodeScanned}
        onClose={() => {
          setScanned(false)
          setShowQrScanner(false)
        }}
        scanned={scanned}
      />
    )
  }

  if (showCameraCapture) {
    return (
      <CameraCapture
        onCapture={handleCaptureImage}
        onClose={() => {
          setShowCameraCapture(false)
        }}
      />
    )
  }

  return (
    <View className="flex-1 bg-emerald-400">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      <ScrollView className="flex-1 p-4">
        <View className="mt-16">
          {/* Route Info Banner */}
          {routeInfo && (
            <View className="bg-emerald-700 rounded-lg p-3 mb-4 flex-row justify-between items-center">
              <View className="flex-1">
                <Text className="text-white font-bold">
                  {routeInfo.from} → {routeInfo.to}
                </Text>
                <Text className="text-white opacity-80">Bus #{routeInfo.busNumber}</Text>
              </View>
              <View className="flex-row">
                <TouchableOpacity
                  className="mr-2"
                  onPress={() =>
                    router.push({
                      pathname: "/conductor/history" as any,
                    })
                  }
                >
                  <Ionicons name="document-text-outline" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  className="mr-2"
                  onPress={() =>
                    router.push({
                      pathname: "/conductor/manage-routes" as any,
                    })
                  }
                >
                  <Ionicons name="map-outline" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/conductor/profile" as any,
                    })
                  }
                >
                  <Ionicons name="person-outline" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <PassengerTypeSelector value={passengerType} onChange={setPassengerType} />

          <LocationInput label="From" value={from} onChange={setFrom} placeholder="Enter starting point" />

          <LocationInput label="To" value={to} onChange={setTo} placeholder="Enter destination" />

          <ModifiedFareCalculator
            from={from}
            to={to}
            kilometer={kilometer}
            fare={fare}
            onKilometerChange={setKilometer}
          />
        </View>
      </ScrollView>

      {/* Payment Method Buttons */}
      <View className="flex-row justify-center mb-12">
        <TouchableOpacity
          className="bg-emerald-700 p-4 rounded-l-lg flex-row items-center"
          onPress={() => handlePaymentMethodChange("QR")}
        >
          <Ionicons name="qr-code" size={24} color="white" className="mr-2" />
          <Text className="text-white font-bold">QR Payment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-emerald-600 p-4 rounded-r-lg flex-row items-center"
          onPress={() => handlePaymentMethodChange("Cash")}
        >
          <Ionicons name="cash" size={24} color="white" className="mr-2" />
          <Text className="text-white font-bold">Cash Payment</Text>
        </TouchableOpacity>
      </View>

      {/* Payment Confirmation Dialog */}
      {showPaymentConfirmation && passengerData && (
        <PaymentConfirmation
          visible={showPaymentConfirmation}
          passengerName={passengerData.name}
          fare={fare}
          onConfirm={handleConfirmPayment}
          onCancel={handleCancelPayment}
          isProcessing={isProcessingPayment}
          paymentMethod={paymentMethod}
          capturedImage={capturedImage}
        />
      )}
    </View>
  )
}

