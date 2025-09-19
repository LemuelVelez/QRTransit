// app/conductor.tsx
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  View,
  Text,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from "react-native"
import { useCameraPermissions, type BarcodeScanningResult } from "expo-camera"
import { useRouter, useFocusEffect } from "expo-router"
import { checkRoutePermission, getCurrentUser } from "@/lib/appwrite"
import { getActiveRoute } from "@/lib/route-service"
import PassengerTypeSelector from "@/components/passenger-type-selector"
import BusTypeSelector from "@/components/bus-type-selector"
import LocationInput from "@/components/location-input"
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
import { saveTrip, generateTripId } from "@/lib/trips-service"
import { calculateDistance } from "@/lib/google-maps-service"
import { getDiscountPercentage, getBusTypeFareMultiplier } from "@/lib/discount-service"

export default function ConductorScreen() {
  const [passengerType, setPassengerType] = useState("Regular")
  const [busType, setBusType] = useState("Regular") // selected from BusTypeSelector (backend-driven)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [kilometer, setKilometer] = useState("")
  const [fare, setFare] = useState("") // per-person fare
  const [ticketCount, setTicketCount] = useState<number>(1) // UI uses number for stepper

  const [showQrScanner, setShowQrScanner] = useState(false)
  const [showCameraCapture, setShowCameraCapture] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [scanned, setScanned] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [conductorId, setConductorId] = useState("")
  const [conductorName, setConductorName] = useState("Conductor")
  const [paymentMethod, setPaymentMethod] = useState<"QR" | "Cash">("QR")
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false)
  const [distanceError, setDistanceError] = useState<string | null>(null)

  const parseCurrencyToNumber = (s: string) => Number(String(s).replace(/[^\d.]/g, "")) || 0
  const formatCurrency = (n: number) => `₱${n.toFixed(2)}`

  const perPersonFareNumber = parseCurrencyToNumber(fare)
  const totalFareNumber = perPersonFareNumber * (ticketCount || 1)
  const totalFareString = formatCurrency(totalFareNumber)

  const [routeInfo, setRouteInfo] = useState<{ from: string; to: string; busNumber: string } | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [needsRefresh, setNeedsRefresh] = useState(false)

  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false)
  const [passengerData, setPassengerData] = useState<{ userId: string; name: string } | null>(null)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [currentPaymentRequest, setCurrentPaymentRequest] = useState<PaymentRequest | null>(null)

  const subscriptionRef = useRef<(() => void) | null>(null)

  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const router = useRouter()

  useEffect(() => {
    const calculateDistanceAndFare = async () => {
      if (from.trim() && to.trim() && from !== to) {
        setIsCalculatingDistance(true)
        setDistanceError(null)
        try {
          const result = await calculateDistance(from, to)
          if (result.status === "OK" && result.distance > 0) {
            const distanceKm = result.distance.toFixed(2)
            setKilometer(distanceKm)

            const baseFlagDown = 15
            const ratePerKm = 2.5
            const raw = baseFlagDown + result.distance * ratePerKm

            const [discPct, busMult] = await Promise.all([
              getDiscountPercentage(passengerType),
              getBusTypeFareMultiplier(busType),
            ])

            let calculated = raw * (busMult || 1)
            calculated = calculated * (1 - (discPct || 0) / 100)

            setFare(`₱${calculated.toFixed(2)}`)
            setDistanceError(null)
          } else {
            setDistanceError("Could not calculate distance. Please check your locations.")
            setKilometer("")
            setFare("")
          }
        } catch (error) {
          console.error("Distance calculation error:", error)
          setDistanceError("Error calculating distance. Please try again.")
          setKilometer("")
          setFare("")
        } finally {
          setIsCalculatingDistance(false)
        }
      } else {
        setKilometer("")
        setFare("")
        setDistanceError(null)
      }
    }

    const timeoutId = setTimeout(calculateDistanceAndFare, 500)
    return () => clearTimeout(timeoutId)
  }, [from, to, passengerType, busType])

  const loadActiveRoute = async (userId: string) => {
    try {
      const activeRoute = await getActiveRoute(userId)
      if (activeRoute) {
        setRouteInfo({
          from: activeRoute.from,
          to: activeRoute.to,
          busNumber: activeRoute.busNumber,
        })
        setFrom(activeRoute.from)
        setTo(activeRoute.to)
      } else {
        Alert.alert("No Active Route", "You don't have an active route. Please set up or activate a route.", [
          {
            text: "Set Up Route",
            onPress: () => {
              router.replace({ pathname: "/conductor/route-setup" as any })
            },
          },
          {
            text: "Manage Routes",
            onPress: () => {
              router.replace({ pathname: "/conductor/manage-routes" as any })
            },
          },
        ])
        return false
      }
      return true
    } catch (error) {
      console.error("Error loading active route:", error)
      Alert.alert("Error", "Failed to load active route.")
      return false
    }
  }

  const refreshPassengerTypes = useCallback(() => setRefreshKey((p) => p + 1), [])

  useEffect(() => {
    async function checkAccess() {
      try {
        const hasPermission = await checkRoutePermission("conductor")
        if (!hasPermission) {
          Alert.alert("Access Denied", "You don't have permission to access this screen.")
          router.replace("/")
          return
        }

        try {
          const user = await getCurrentUser()
          if (user) {
            setConductorId(user.$id || "")

            if (user.firstname && user.lastname) {
              setConductorName(`${user.firstname} ${user.lastname}`)
            } else if (user.username) {
              setConductorName(user.username)
            } else if (user.email) {
              setConductorName(user.email)
            } else {
              setConductorName("Conductor")
            }

            const hasActiveRoute = await loadActiveRoute(user.$id || "")
            if (!hasActiveRoute) return
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
    return () => {
      if (subscriptionRef.current) subscriptionRef.current()
    }
  }, [])

  useEffect(() => {
    if (!conductorId) return
    const unsubscribe = subscribeToPaymentRequests(conductorId, "conductor", (request) => {
      if (currentPaymentRequest && currentPaymentRequest.id === request.id) {
        setCurrentPaymentRequest(request)
        if (request.status === "approved") {
          handleProcessPayment(request)
        } else if (request.status === "declined") {
          setIsProcessingPayment(false)
          setShowPaymentConfirmation(false)
          Alert.alert("Payment Declined", "The passenger declined the payment request.")
          setCurrentPaymentRequest(null)
        }
      }
    })
    subscriptionRef.current = unsubscribe
    return () => unsubscribe()
  }, [conductorId, currentPaymentRequest])

  useEffect(() => {
    (async () => {
      if (!cameraPermission?.granted) await requestCameraPermission()
    })()
  }, [cameraPermission, requestCameraPermission])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    if (conductorId) {
      await loadActiveRoute(conductorId)
      refreshPassengerTypes() // also refresh selectors via key
    }
    setRefreshing(false)
  }, [conductorId, refreshPassengerTypes])

  useFocusEffect(
    useCallback(() => {
      onRefresh()
      return () => {}
    }, [onRefresh]),
  )

  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    setScanned(true)
    const parsedData = parseQRData(data)

    if (!parsedData) {
      Alert.alert("Invalid QR Code", "The scanned QR code doesn't contain valid passenger information.", [
        { text: "OK", onPress: () => { setScanned(false); setShowQrScanner(false) } },
      ])
      return
    }

    if (!fare || parseCurrencyToNumber(fare) <= 0) {
      Alert.alert("Fare Not Set", "Please wait for automatic fare calculation or check your locations.", [
        { text: "OK", onPress: () => { setScanned(false); setShowQrScanner(false) } },
      ])
      return
    }

    setPassengerData(parsedData)
    setShowQrScanner(false)
    setShowPaymentConfirmation(true)
  }

  const handleCaptureImage = (uri: string) => {
    setCapturedImage(uri)
    setShowCameraCapture(false)

    const uniqueId = Date.now().toString().slice(-4)
    const uniquePassengerName = `Passenger #${uniqueId}`

    setPassengerData({
      userId: "cash_passenger_" + Date.now(),
      name: uniquePassengerName,
    })
    setShowPaymentConfirmation(true)
  }

  const handleConfirmPayment = async () => {
    if (!passengerData || totalFareNumber <= 0 || !conductorId) return
    setIsProcessingPayment(true)
    try {
      if (paymentMethod === "QR") {
        const request = await createPaymentRequest(
          conductorId,
          conductorName,
          passengerData.userId,
          passengerData.name,
          totalFareString,
          from || "Unknown",
          to || "Unknown",
          routeInfo?.busNumber,
          busType,                 // from selector
          String(ticketCount),     // ✅ send as string
          fare                     // per-person fare
        )
        setCurrentPaymentRequest(request)
      } else {
        const tripId = generateTripId()
        const trip = {
          passengerName: passengerData.name,
          fare: totalFareString,
          totalFare: totalFareString,
          farePerPassenger: fare,
          // ✅ persist both for compatibility, but totalPassengers is the source of truth
          passengerCount: String(ticketCount),
          totalPassengers: String(ticketCount),
          from: from || "Unknown",
          to: to || "Unknown",
          timestamp: Date.now(),
          paymentMethod: "Cash",
          transactionId: tripId,
          conductorId: conductorId,
          passengerPhoto: capturedImage || undefined,
          passengerType: passengerType,
          kilometer: kilometer,
          busNumber: routeInfo?.busNumber,
        }
        const savedTripId = await saveTrip(trip)
        setShowPaymentConfirmation(false)
        setIsProcessingPayment(false)
        router.push({
          pathname: "/receipt" as any,
          params: {
            receiptId: savedTripId || "cash_" + tripId,
            passengerName: passengerData.name,
            fare: totalFareString,
            farePerPassenger: fare,
            passengerCount: String(ticketCount),
            totalPassengers: String(ticketCount), // ✅ pass through to details
            from: from,
            to: to,
            timestamp: new Date().toLocaleString(),
            passengerType: passengerType,
            paymentMethod: "Cash",
            busNumber: routeInfo?.busNumber,
          },
        })
      }
    } catch (error) {
      console.error("Error creating payment request:", error)
      setIsProcessingPayment(false)
      Alert.alert("Error", "Failed to send payment request. Please try again.")
    }
  }

  const handleProcessPayment = async (request: PaymentRequest) => {
    if (!request || !passengerData) return
    try {
      const amountToCharge = parseCurrencyToNumber(request.totalFare || request.fare)
      const result = await processPayment(
        request.passengerId,
        amountToCharge,
        `Fare payment from ${request.from} to ${request.to}`
      )
      if (result.success) {
        const tripId = generateTripId()
        const passengersStr = String(request.ticketCount || ticketCount || 1) // ✅ always string
        const trip = {
          passengerName: passengerData.name,
          fare: formatCurrency(amountToCharge),
          totalFare: formatCurrency(amountToCharge),
          farePerPassenger: request.farePerPassenger || fare,
          // ✅ persist both (source of truth = totalPassengers)
          passengerCount: passengersStr,
          totalPassengers: passengersStr,
          from: request.from,
          to: request.to,
          timestamp: Date.now(),
          paymentMethod: "QR",
          transactionId: tripId,
          conductorId: conductorId,
          passengerType: passengerType,
          kilometer: kilometer,
          busNumber: request.busNumber || routeInfo?.busNumber,
        }
        const savedTripId = await saveTrip(trip)
        await updatePaymentRequestStatus(request.id, "completed", savedTripId || result.transactionId)
        setShowPaymentConfirmation(false)
        setIsProcessingPayment(false)
        setCurrentPaymentRequest(null)
        router.push({
          pathname: "/receipt" as any,
          params: {
            receiptId: savedTripId || result.transactionId,
            passengerName: passengerData.name,
            fare: formatCurrency(amountToCharge),
            farePerPassenger: request.farePerPassenger || fare,
            passengerCount: passengersStr,
            totalPassengers: passengersStr, // ✅ pass through to details
            from: request.from,
            to: to,
            timestamp: new Date().toLocaleString(),
            passengerType: passengerType,
            paymentMethod: "QR",
            busNumber: request.busNumber || routeInfo?.busNumber,
          },
        })
      } else {
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

  const navigateToManageDiscounts = () => {
    setNeedsRefresh(true)
    router.push({ pathname: "/conductor/manage-types" as any })
  }

  useEffect(() => {
    if (needsRefresh) {
      refreshPassengerTypes()
      setNeedsRefresh(false)
    }
  }, [needsRefresh, refreshPassengerTypes])

  if (loading) {
    return (
      <View className="items-center justify-center flex-1 bg-emerald-400">
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
        onClose={() => { setScanned(false); setShowQrScanner(false) }}
        scanned={scanned}
      />
    )
  }

  if (showCameraCapture) {
    return (
      <CameraCapture
        onCapture={handleCaptureImage}
        onClose={() => { setShowCameraCapture(false) }}
      />
    )
  }

  return (
    <View className="flex-1 bg-emerald-400">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      <ScrollView
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#059669"]} tintColor="#ffffff" />
        }
      >
        <View className="mt-16">
          {routeInfo && (
            <View className="flex-row items-center justify-between p-3 mb-4 rounded-lg bg-emerald-700">
              <View className="flex-1">
                <Text className="font-bold text-white">
                  {routeInfo.from} → {routeInfo.to}
                </Text>
                <Text className="text-white opacity-80">Bus #{routeInfo.busNumber}</Text>
              </View>
              <View className="flex-row">
                <TouchableOpacity
                  className="mr-2"
                  onPress={() => router.push({ pathname: "/conductor/history" as any })}
                >
                  <Ionicons name="document-text-outline" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  className="mr-2"
                  onPress={() => router.push({ pathname: "/conductor/manage-routes" as any })}
                >
                  <Ionicons name="map-outline" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity className="mr-2" onPress={navigateToManageDiscounts}>
                  <Ionicons name="cash-outline" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push({ pathname: "/conductor/profile" as any })}>
                  <Ionicons name="person-outline" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!routeInfo && (
            <View className="p-4 mb-4 bg-red-500 rounded-lg">
              <Text className="font-bold text-center text-white">No Active Route</Text>
              <Text className="mt-1 text-center text-white">Please set up or activate a route</Text>
              <View className="flex-row justify-center mt-3">
                <TouchableOpacity className="px-4 py-2 mr-2 bg-white rounded-lg" onPress={() => router.push("/conductor/route-setup" as any)}>
                  <Text className="font-bold text-red-500">Set Up Route</Text>
                </TouchableOpacity>
                <TouchableOpacity className="px-4 py-2 bg-white rounded-lg" onPress={() => router.push("/conductor/manage-routes" as any)}>
                  <Text className="font-bold text-red-500">Manage Routes</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Selectors */}
          {/* ✅ Give each sibling a unique namespaced key to avoid duplicate-key reconciliation issues */}
          <PassengerTypeSelector key={`pts-${refreshKey}`} value={passengerType} onChange={setPassengerType} />
          <BusTypeSelector key={`bts-${refreshKey}`} value={busType} onChange={setBusType} />

          <LocationInput label="From" value={from} onChange={setFrom} placeholder="Enter starting point" />
          <LocationInput label="To" value={to} onChange={setTo} placeholder="Enter destination" />

          <View style={styles.fareCalculatorContainer}>
            <Text style={styles.sectionTitle}>Fare Calculation</Text>

            {isCalculatingDistance && (
              <View style={styles.calculatingContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.calculatingText}>Calculating distance via GPS...</Text>
              </View>
            )}

            {distanceError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{distanceError}</Text>
              </View>
            )}

            <View style={styles.fareDisplayContainer}>
              <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                <Text style={styles.fareLabel}>Bus Type:</Text>
                <Text style={styles.fareValue}>{busType}</Text>
              </View>

              <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                <Text style={styles.fareLabel}>Distance:</Text>
                <Text style={styles.fareValue}>
                  {kilometer ? `${kilometer} km` : isCalculatingDistance ? "Calculating..." : "Enter locations"}
                </Text>
              </View>

              <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                <Text style={styles.fareLabel}>Passenger Type:</Text>
                <Text style={styles.fareValue}>{passengerType}</Text>
              </View>

              <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                <Text style={styles.fareLabel}>Per-Person Fare:</Text>
                <Text style={styles.fareValue}>{fare || (isCalculatingDistance ? "Calculating..." : "₱0.00")}</Text>
              </View>

              <View style={[styles.fareRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.fareLabel}>Tickets (Passengers):</Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <TouchableOpacity
                    onPress={() => setTicketCount((c) => Math.max(1, c - 1))}
                    style={styles.qtyBtn}
                  >
                    <Text style={styles.qtyBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={[styles.fareValue, { marginHorizontal: 12 }]}>{ticketCount}</Text>
                  <TouchableOpacity
                    onPress={() => setTicketCount((c) => Math.min(99, c + 1))}
                    style={styles.qtyBtn}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.fareRow, styles.totalFareRow]}>
                <Text style={styles.totalFareLabel}>Total Fare:</Text>
                <Text style={styles.totalFareValue}>
                  {totalFareString || (isCalculatingDistance ? "Calculating..." : "₱0.00")}
                </Text>
              </View>
            </View>

            <Text style={styles.gpsNote}>💡 Groups with same destination can be paid at once—set the ticket count above.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Payment Method Buttons */}
      <View className="flex-row justify-center mb-12">
        <TouchableOpacity
          className="flex-row items-center p-4 rounded-l-lg bg-emerald-700"
          onPress={() => handlePaymentMethodChange("QR")}
          disabled={!routeInfo}
        >
          <Ionicons name="qr-code" size={24} color="white" />
          <Text className="font-bold text-white">QR Payment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center p-4 rounded-r-lg bg-emerald-600"
          onPress={() => handlePaymentMethodChange("Cash")}
          disabled={!routeInfo}
        >
          <Ionicons name="cash" size={24} color="white" />
          <Text className="font-bold text-white">Cash Payment</Text>
        </TouchableOpacity>
      </View>

      {showPaymentConfirmation && passengerData && (
        <PaymentConfirmation
          visible={showPaymentConfirmation}
          passengerName={passengerData.name}
          fare={totalFareString}
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

const styles = StyleSheet.create({
  fareCalculatorContainer: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  calculatingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    backgroundColor: "#e3f2fd",
    borderRadius: 8,
    marginBottom: 12,
  },
  calculatingText: {
    marginLeft: 8,
    color: "#1976d2",
    fontSize: 14,
    fontWeight: "500",
  },
  errorContainer: {
    backgroundColor: "#ffebee",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: "#c62828",
    fontSize: 14,
    textAlign: "center",
  },
  fareDisplayContainer: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  fareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  totalFareRow: {
    borderBottomWidth: 0,
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: "#007AFF",
  },
  fareLabel: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  fareValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  totalFareLabel: {
    fontSize: 18,
    color: "#007AFF",
    fontWeight: "bold",
  },
  totalFareValue: {
    fontSize: 20,
    color: "#007AFF",
    fontWeight: "bold",
  },
  gpsNote: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
  },
  qtyBtnText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginTop: -2,
  },
})
