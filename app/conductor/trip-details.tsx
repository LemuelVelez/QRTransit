"use client"

import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
  Share,
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { getTripDetails } from "@/lib/trips-service"
import ViewShot from "react-native-view-shot"
import * as MediaLibrary from "expo-media-library"
import * as FileSystem from "expo-file-system"
import * as Sharing from "expo-sharing"

export default function TripDetailsScreen() {
  const params = useLocalSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tripDetails, setTripDetails] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null)
  const viewShotRef = useRef<any>(null)
  const [hasMediaPermission, setHasMediaPermission] = useState(false)

  // Helpers (mirror conductor helpers)
  const parseCurrencyToNumber = (s: string) => Number(String(s).replace(/[^\d.]/g, "")) || 0
  const formatCurrency = (n: number) => `₱${n.toFixed(2)}`

  useEffect(() => {
    ; (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync()
      setHasMediaPermission(status === "granted")
    })()
  }, [])

  // Accept either ?id=... or ?receiptId=... for robustness
  const tripId =
    (params.id as string | undefined) ||
    (params.receiptId as string | undefined)

  const coerceMillis = (v: any): number => {
    if (typeof v === "number" && Number.isFinite(v) && v > 0) return v
    const n = Number(v)
    if (Number.isFinite(n) && n > 0) return n
    const p = Date.parse(String(v))
    return Number.isFinite(p) ? p : Date.now()
  }

  // Normalize and derive values (particularly totalPassengers -> per-person)
  const normalizeTrip = (base: any) => {
    const passengersRaw =
      base?.totalPassengers ??
      base?.passengerCount ??
      params.totalPassengers ??
      params.passengerCount ??
      "1"
    const passengers = Math.max(1, Number(passengersRaw) || 1)

    const totalFareStr =
      String(
        base?.totalFare ??
        base?.fare ??
        params.totalFare ??
        params.fare ??
        "₱0.00"
      )

    let farePerPassengerStr =
      base?.farePerPassenger ??
      params.farePerPassenger

    if (!farePerPassengerStr || String(farePerPassengerStr).trim() === "") {
      const total = parseCurrencyToNumber(totalFareStr)
      farePerPassengerStr = formatCurrency(total / passengers)
    }

    return {
      ...base,
      // keep both fields, but totalPassengers is the source of truth
      totalPassengers: String(passengers),
      passengerCount: String(passengers),
      totalFare: totalFareStr,
      fare: base?.fare ?? totalFareStr,
      farePerPassenger: farePerPassengerStr,
    }
  }

  useEffect(() => {
    async function loadTripDetails() {
      if (!tripId) return
      try {
        setLoading(true)
        const details = await getTripDetails(tripId)

        if (details) {
          setTripDetails(normalizeTrip(details))
        } else {
          // Fallback to params if doc isn't found (e.g., schema lag during save)
          const fallback = {
            id: tripId,
            passengerName: params.passengerName,
            fare: params.fare, // total
            totalFare: params.totalFare || params.fare,
            farePerPassenger: params.farePerPassenger,
            passengerCount: params.passengerCount,
            totalPassengers: params.totalPassengers,
            from: params.from,
            to: params.to,
            timestamp: coerceMillis(params.timestamp),
            paymentMethod: params.paymentMethod,
            transactionId: params.transactionId,
            passengerPhoto: params.passengerPhoto,
            passengerType: params.passengerType,
            kilometer: params.kilometer,
            busNumber: params.busNumber,
          }
          setTripDetails(normalizeTrip(fallback))
        }
      } catch (e) {
        console.error("Error loading trip details:", e)
        const fallback = {
          id: tripId,
          passengerName: params.passengerName,
          fare: params.fare,
          totalFare: params.totalFare || params.fare,
          farePerPassenger: params.farePerPassenger,
          passengerCount: params.passengerCount,
          totalPassengers: params.totalPassengers,
          from: params.from,
          to: params.to,
          timestamp: coerceMillis(params.timestamp),
          paymentMethod: params.paymentMethod,
          transactionId: params.transactionId,
          passengerPhoto: params.passengerPhoto,
          passengerType: params.passengerType,
          kilometer: params.kilometer,
          busNumber: params.busNumber,
        }
        setTripDetails(normalizeTrip(fallback))
      } finally {
        setLoading(false)
      }
    }

    loadTripDetails()
  }, [tripId])

  const captureReceipt = async (format: "jpg" | "png" = "jpg") => {
    try {
      if (viewShotRef.current) {
        const uri = await viewShotRef.current.capture({ format, quality: 0.9 })
        setCapturedImageUri(uri)
        return uri
      }
      return null
    } catch (error) {
      console.error("Error capturing receipt:", error)
      return null
    }
  }

  const saveToGallery = async (uri: string, format: "jpg" | "png") => {
    try {
      if (!hasMediaPermission) {
        const { status } = await MediaLibrary.requestPermissionsAsync()
        if (status !== "granted") {
          Alert.alert("Permission Required", "We need permission to save images to your gallery.")
          return false
        }
      }

      const timestamp = new Date().getTime()
      const fileUri = FileSystem.documentDirectory + `qrtransit_receipt_${timestamp}.${format}`

      await FileSystem.copyAsync({ from: uri, to: fileUri })
      const asset = await MediaLibrary.createAssetAsync(fileUri)
      await MediaLibrary.createAlbumAsync("QRTransit", asset, false)

      return true
    } catch (error) {
      console.error("Error saving to gallery:", error)
      return false
    }
  }

  const handleShareReceipt = async () => {
    try {
      const uri = capturedImageUri || (await captureReceipt("png"))
      if (!uri) {
        Alert.alert("Error", "Failed to capture receipt image")
        return
      }

      const timestamp = new Date().getTime()
      const tempFilePath = FileSystem.cacheDirectory + `qrtransit_trip_${timestamp}.png`
      await FileSystem.copyAsync({ from: uri, to: tempFilePath })

      const isAvailable = await Sharing.isAvailableAsync()
      if (isAvailable) {
        await Sharing.shareAsync(tempFilePath, {
          mimeType: "image/png",
          dialogTitle: "Share QRTransit Trip Details",
          UTI: "public.png",
        })
      } else {
        await Share.share({
          url: tempFilePath,
          title: "QRTransit Trip Details",
          message: "Here are my trip details from QRTransit!",
        })
      }
    } catch (error) {
      console.error("Error sharing receipt:", error)
      Alert.alert("Error", "Failed to share receipt")
    }
  }

  const handleDownloadReceipt = async () => {
    try {
      Alert.alert("Save Trip Details", "Choose image format", [
        {
          text: "JPG",
          onPress: async () => {
            const uri = capturedImageUri || (await captureReceipt("jpg"))
            if (uri) {
              const saved = await saveToGallery(uri, "jpg")
              Alert.alert(saved ? "Success" : "Error", saved ? "Receipt saved to your gallery" : "Failed to save")
            } else {
              Alert.alert("Error", "Failed to capture receipt image")
            }
          },
        },
        {
          text: "PNG",
          onPress: async () => {
            const uri = capturedImageUri || (await captureReceipt("png"))
            if (uri) {
              const saved = await saveToGallery(uri, "png")
              Alert.alert(saved ? "Success" : "Error", saved ? "Receipt saved to your gallery" : "Failed to save")
            } else {
              Alert.alert("Error", "Failed to capture receipt image")
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ])
    } catch (error) {
      console.error("Error with receipt:", error)
      Alert.alert("Error", "Failed to process receipt")
    }
  }

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    if (isNaN(d.getTime())) return "-"
    return d.toLocaleDateString() + " " + d.toLocaleTimeString()
  }

  if (loading) {
    return (
      <View className="items-center justify-center flex-1 bg-emerald-400">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <ActivityIndicator size="large" color="white" />
        <Text className="mt-4 text-white">Loading trip details...</Text>
      </View>
    )
  }

  const passengers = Number(tripDetails?.totalPassengers || tripDetails?.passengerCount || 1)
  const perPerson = String(tripDetails?.farePerPassenger || "")
  const totalFare = String(tripDetails?.totalFare || tripDetails?.fare || "₱0.00")

  return (
    <View className="flex-1 bg-emerald-400">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      <View className="flex-row items-center justify-between px-4 pt-16 pb-2">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white">Trip Details</Text>
        <View className="flex-row">
          <TouchableOpacity onPress={handleDownloadReceipt} className="p-2">
            <Ionicons name="download-outline" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShareReceipt} className="p-2">
            <Ionicons name="share-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-2">
        <ViewShot ref={viewShotRef} options={{ format: "png", quality: 1 }} style={{ backgroundColor: "white", borderRadius: 8 }}>
          <View className="p-6 mb-4 bg-white rounded-lg">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-2xl font-bold text-gray-800">{tripDetails.passengerName}</Text>
              <Text className="text-xl font-bold text-emerald-600">{totalFare}</Text>
            </View>

            <View className="mb-4">
              <Text className="mb-1 text-gray-500">Transaction ID</Text>
              <Text className="font-medium text-gray-800">{tripDetails.transactionId}</Text>
            </View>

            <View className="mb-4">
              <Text className="mb-1 text-gray-500">Date & Time</Text>
              <Text className="font-medium text-gray-800">{formatDate(tripDetails.timestamp)}</Text>
            </View>

            <View className="flex-row mb-4">
              <View className="flex-1 mr-2">
                <Text className="mb-1 text-gray-500">From</Text>
                <Text className="font-medium text-gray-800">{tripDetails.from}</Text>
              </View>
              <View className="flex-1 ml-2">
                <Text className="mb-1 text-gray-500">To</Text>
                <Text className="font-medium text-gray-800">{tripDetails.to}</Text>
              </View>
            </View>

            <View className="flex-row mb-4">
              <View className="flex-1 mr-2">
                <Text className="mb-1 text-gray-500">Payment Method</Text>
                <View className="flex-row items-center">
                  <Ionicons
                    name={tripDetails.paymentMethod === "QR" ? "qr-code" : "cash"}
                    size={16}
                    color="#059669"
                  />
                  <Text className="font-medium text-gray-800" style={{ marginLeft: 6 }}>{tripDetails.paymentMethod}</Text>
                </View>
              </View>
              <View className="flex-1 ml-2">
                <Text className="mb-1 text-gray-500">Passenger Type</Text>
                <Text className="font-medium text-gray-800">{tripDetails.passengerType || "Regular"}</Text>
              </View>
            </View>

            {/* Group info */}
            <View className="flex-row mb-4">
              <View className="flex-1 mr-2">
                <Text className="mb-1 text-gray-500">Passengers (Tickets)</Text>
                <Text className="font-medium text-gray-800">{passengers}</Text>
              </View>
              <View className="flex-1 ml-2">
                <Text className="mb-1 text-gray-500">Per-Person Fare</Text>
                <Text className="font-medium text-gray-800">{perPerson || "—"}</Text>
              </View>
            </View>

            {tripDetails.kilometer && (
              <View className="mb-4">
                <Text className="mb-1 text-gray-500">Distance</Text>
                <Text className="font-medium text-gray-800">{tripDetails.kilometer} km</Text>
              </View>
            )}

            {tripDetails.busNumber && (
              <View className="mb-4">
                <Text className="mb-1 text-gray-500">Bus #</Text>
                <Text className="font-medium text-gray-800">{tripDetails.busNumber}</Text>
              </View>
            )}

            {tripDetails.passengerPhoto && (
              <View className="mt-2">
                <Text className="mb-1 text-gray-500">Passenger Photo</Text>
                <Image source={{ uri: tripDetails.passengerPhoto }} className="w-full h-48 rounded-lg" resizeMode="cover" />
              </View>
            )}
          </View>
        </ViewShot>
      </ScrollView>
    </View>
  )
}
