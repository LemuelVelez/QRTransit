"use client"

import { useState, useEffect } from "react"
import { View, Text, ScrollView, Alert, ActivityIndicator, StatusBar } from "react-native"
import { useCameraPermissions, type BarcodeScanningResult } from "expo-camera"
import { useRouter } from "expo-router"
import { checkRoutePermission } from "@/lib/appwrite"

import ProfileDropdown from "@/components/profile-dropdown"
import PassengerTypeSelector from "@/components/passenger-type-selector"
import LocationInput from "@/components/location-input"
import FareCalculator from "@/components/fare-calculator"
import QRScanner from "@/components/qr-scanner"
import QRButton from "@/components/qr-button"

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

        setLoading(false)
      } catch (error) {
        console.error("Error checking access:", error)
        Alert.alert("Error", "Failed to verify access permissions.")
        router.replace("/")
      }
    }

    checkAccess()
  }, [])

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
    Alert.alert("QR Code Scanned", `Type: ${type}\nData: ${data}`, [
      {
        text: "OK",
        onPress: () => {
          setShowQrScanner(false)
          // Process the scanned data here if needed
        },
      },
    ])
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
    </View>
  )
}

