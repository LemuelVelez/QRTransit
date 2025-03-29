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

  // Request media library permissions on component mount
  useEffect(() => {
    ; (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync()
      setHasMediaPermission(status === "granted")
    })()
  }, [])

  // Extract only the ID from params to use in the dependency array
  const tripId = params.id as string | undefined

  useEffect(() => {
    async function loadTripDetails() {
      if (tripId) {
        try {
          setLoading(true)
          const details = await getTripDetails(tripId)

          if (details) {
            setTripDetails(details)
          } else {
            // If no details found in the database, use the params
            setTripDetails({
              id: tripId,
              passengerName: params.passengerName,
              fare: params.fare,
              from: params.from,
              to: params.to,
              timestamp: Number(params.timestamp),
              paymentMethod: params.paymentMethod,
              transactionId: params.transactionId,
              passengerPhoto: params.passengerPhoto,
              passengerType: params.passengerType,
              kilometer: params.kilometer,
            })
          }
        } catch (error) {
          console.error("Error loading trip details:", error)
          // Use params as fallback
          setTripDetails({
            id: tripId,
            passengerName: params.passengerName,
            fare: params.fare,
            from: params.from,
            to: params.to,
            timestamp: Number(params.timestamp),
            paymentMethod: params.paymentMethod,
            transactionId: params.transactionId,
            passengerPhoto: params.passengerPhoto,
            passengerType: params.passengerType,
            kilometer: params.kilometer,
          })
        } finally {
          setLoading(false)
        }
      }
    }

    loadTripDetails()
  }, [tripId]) // Only depend on tripId instead of the entire params object

  // Capture receipt as image
  const captureReceipt = async (format: "jpg" | "png" = "jpg") => {
    try {
      if (viewShotRef.current) {
        const uri = await viewShotRef.current.capture({
          format: format,
          quality: 0.9,
        })
        setCapturedImageUri(uri)
        return uri
      }
      return null
    } catch (error) {
      console.error("Error capturing receipt:", error)
      return null
    }
  }

  // Save image to gallery
  const saveToGallery = async (uri: string, format: "jpg" | "png") => {
    try {
      if (!hasMediaPermission) {
        const { status } = await MediaLibrary.requestPermissionsAsync()
        if (status !== "granted") {
          Alert.alert("Permission Required", "We need permission to save images to your gallery.")
          return false
        }
      }

      // Create a unique filename with timestamp
      const timestamp = new Date().getTime()
      const fileUri = FileSystem.documentDirectory + `qrtransit_receipt_${timestamp}.${format}`

      // Copy the file to a permanent location
      await FileSystem.copyAsync({
        from: uri,
        to: fileUri,
      })

      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(fileUri)
      await MediaLibrary.createAlbumAsync("QRTransit", asset, false)

      return true
    } catch (error) {
      console.error("Error saving to gallery:", error)
      return false
    }
  }

  // Share the receipt image - FIXED to properly share the image file
  const handleShareReceipt = async () => {
    try {
      // Capture the receipt if not already captured
      const uri = capturedImageUri || (await captureReceipt("png"))

      if (!uri) {
        Alert.alert("Error", "Failed to capture receipt image")
        return
      }

      // Create a temporary file with a proper extension for sharing
      const timestamp = new Date().getTime()
      const tempFilePath = FileSystem.cacheDirectory + `qrtransit_trip_${timestamp}.png`

      // Copy the captured image to the temp file
      await FileSystem.copyAsync({
        from: uri,
        to: tempFilePath,
      })

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync()

      if (isAvailable) {
        // Use expo-sharing for direct file sharing (works better on both platforms)
        await Sharing.shareAsync(tempFilePath, {
          mimeType: "image/png",
          dialogTitle: "Share QRTransit Trip Details",
          UTI: "public.png", // Uniform Type Identifier for iOS
        })
      } else {
        // Fallback to React Native Share API
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

  // Download the receipt image to device
  const handleDownloadReceipt = async () => {
    try {
      // Show format selection dialog
      Alert.alert("Save Receipt", "Choose image format", [
        {
          text: "JPG",
          onPress: async () => {
            const uri = capturedImageUri || (await captureReceipt("jpg"))
            if (uri) {
              const saved = await saveToGallery(uri, "jpg")
              if (saved) {
                Alert.alert("Success", "Receipt saved to your gallery")
              } else {
                Alert.alert("Error", "Failed to save receipt to gallery")
              }
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
              if (saved) {
                Alert.alert("Success", "Receipt saved to your gallery")
              } else {
                Alert.alert("Error", "Failed to save receipt to gallery")
              }
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

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString() + " " + date.toLocaleTimeString()
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-emerald-400">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <ActivityIndicator size="large" color="white" />
        <Text className="mt-4 text-white">Loading trip details...</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-emerald-400">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Header with back button */}
      <View className="flex-row items-center justify-between px-4 pt-16 pb-2">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Trip Details</Text>
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
        <ViewShot
          ref={viewShotRef}
          options={{ format: "png", quality: 1 }}
          style={{ backgroundColor: "white", borderRadius: 8 }}
        >
          <View className="bg-white rounded-lg p-6 mb-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-2xl font-bold text-gray-800">{tripDetails.passengerName}</Text>
              <Text className="text-xl font-bold text-emerald-600">{tripDetails.fare}</Text>
            </View>

            <View className="mb-4">
              <Text className="text-gray-500 mb-1">Transaction ID</Text>
              <Text className="text-gray-800 font-medium">{tripDetails.transactionId}</Text>
            </View>

            <View className="mb-4">
              <Text className="text-gray-500 mb-1">Date & Time</Text>
              <Text className="text-gray-800 font-medium">{formatDate(tripDetails.timestamp)}</Text>
            </View>

            <View className="flex-row mb-4">
              <View className="flex-1 mr-2">
                <Text className="text-gray-500 mb-1">From</Text>
                <Text className="text-gray-800 font-medium">{tripDetails.from}</Text>
              </View>
              <View className="flex-1 ml-2">
                <Text className="text-gray-500 mb-1">To</Text>
                <Text className="text-gray-800 font-medium">{tripDetails.to}</Text>
              </View>
            </View>

            <View className="flex-row mb-4">
              <View className="flex-1 mr-2">
                <Text className="text-gray-500 mb-1">Payment Method</Text>
                <View className="flex-row items-center">
                  <Ionicons
                    name={tripDetails.paymentMethod === "QR" ? "qr-code" : "cash"}
                    size={16}
                    color="#059669"
                    className="mr-1"
                  />
                  <Text className="text-gray-800 font-medium">{tripDetails.paymentMethod}</Text>
                </View>
              </View>
              <View className="flex-1 ml-2">
                <Text className="text-gray-500 mb-1">Passenger Type</Text>
                <Text className="text-gray-800 font-medium">{tripDetails.passengerType || "Regular"}</Text>
              </View>
            </View>

            {tripDetails.kilometer && (
              <View className="mb-4">
                <Text className="text-gray-500 mb-1">Distance</Text>
                <Text className="text-gray-800 font-medium">{tripDetails.kilometer} km</Text>
              </View>
            )}

            {tripDetails.passengerPhoto && (
              <View className="mt-2">
                <Text className="text-gray-500 mb-1">Passenger Photo</Text>
                <Image
                  source={{ uri: tripDetails.passengerPhoto }}
                  className="w-full h-48 rounded-lg"
                  resizeMode="cover"
                />
              </View>
            )}
          </View>
        </ViewShot>
      </ScrollView>
    </View>
  )
}

