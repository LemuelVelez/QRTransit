"use client"

import { useState, useEffect, useRef } from "react"
import { View, Text, ScrollView, Alert, ActivityIndicator, StatusBar } from "react-native"
import { useCameraPermissions, type BarcodeScanningResult } from "expo-camera"
import { useRouter } from "expo-router"
import { checkRoutePermission } from "@/lib/appwrite"
import { getCurrentUser } from "@/lib/appwrite"

import ProfileDropdown from "@/components/profile-dropdown"
import PassengerTypeSelector from "@/components/passenger-type-selector"
import LocationInput from "@/components/location-input"
import FareCalculator from "@/components/fare-calculator"
import QRScanner from "@/components/qr-scanner"
import QRButton from "@/components/qr-button"
import PaymentConfirmation from "@/components/payment-confirmation"
import { parseQRData, processPayment } from "@/lib/qr-payment-service"
import {
  createPaymentRequest,
  subscribeToPaymentRequests,
  updatePaymentRequestStatus,
  type PaymentRequest,
} from "@/lib/appwrite-payment-service"

// Sample locations in the Philippines
const LOCATIONS = [
  "Manila",
  "Quezon City",
  "Cebu City",
  "Davao City",
  "Makati",
  "Baguio",
  "Tagaytay",
  "Boracay",
  "Palawan",
  "Vigan",
  "Iloilo City",
  "Bacolod",
  "Zamboanga City",
  "Cagayan de Oro",
  "Bohol",
  "Siargao",
  "Batangas",
  "Subic",
  "Clark",
  "Legazpi City",
]

export default function ConductorScreen() {
  const [passengerType, setPassengerType] = useState("Regular")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [kilometer, setKilometer] = useState("")
  const [fare, setFare] = useState("")
  const [showQrScanner, setShowQrScanner] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [loading, setLoading] = useState(true)
  const [conductorId, setConductorId] = useState("")
  const [conductorName, setConductorName] = useState("Conductor")

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

  // Send payment request to passenger
  const handleConfirmPayment = async () => {
    if (!passengerData || !fare || !conductorId) return

    setIsProcessingPayment(true)

    try {
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

      // The passenger will receive this request via Appwrite Realtime
      // and can approve or decline it

      // We'll wait for the response via the subscription
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
        // Update payment request status to completed with transaction ID
        await updatePaymentRequestStatus(request.id, "completed", result.transactionId)

        // Close confirmation dialog
        setShowPaymentConfirmation(false)
        setIsProcessingPayment(false)
        setCurrentPaymentRequest(null)

        // Navigate to receipt screen
        router.push({
          pathname: "/receipt",
          params: {
            transactionId: result.transactionId,
            passengerName: passengerData.name,
            fare: request.fare,
            from: request.from,
            to: request.to,
            timestamp: new Date().toLocaleString(),
            passengerType: passengerType,
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

  return (
    <View className="flex-1 bg-emerald-400">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      <ProfileDropdown onLogoutStart={() => setLoading(true)} onLogoutEnd={() => setLoading(false)} />

      <ScrollView className="flex-1 p-4">
        <View className="mt-16">
          <PassengerTypeSelector value={passengerType} onChange={setPassengerType} />

          <LocationInput
            label="From"
            value={from}
            onChange={setFrom}
            placeholder="Enter starting point"
            locations={LOCATIONS}
          />

          <LocationInput label="To" value={to} onChange={setTo} placeholder="Enter destination" locations={LOCATIONS} />

          <FareCalculator kilometer={kilometer} fare={fare} onKilometerChange={setKilometer} />
        </View>
      </ScrollView>

      <QRButton onPress={() => setShowQrScanner(true)} />

      {/* Payment Confirmation Dialog */}
      {showPaymentConfirmation && passengerData && (
        <PaymentConfirmation
          visible={showPaymentConfirmation}
          passengerName={passengerData.name}
          fare={fare}
          onConfirm={handleConfirmPayment}
          onCancel={handleCancelPayment}
          isProcessing={isProcessingPayment}
        />
      )}
    </View>
  )
}

