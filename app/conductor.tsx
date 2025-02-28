"use client"

import { useState, useEffect, useRef } from "react"
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ImageBackground, Animated } from "react-native"
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera"
import { Ionicons } from "@expo/vector-icons"

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

export default function conductor() {
  const [passengerType, setPassengerType] = useState("Regular")
  const [showPassengerDropdown, setShowPassengerDropdown] = useState(false)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [kilometer, setKilometer] = useState("")
  const [fare, setFare] = useState("")
  const [showQrScanner, setShowQrScanner] = useState(false)
  const [scanned, setScanned] = useState(false)

  const [fromSuggestions, setFromSuggestions] = useState<string[]>([])
  const [toSuggestions, setToSuggestions] = useState<string[]>([])
  const [showFromDropdown, setShowFromDropdown] = useState(false)
  const [showToDropdown, setShowToDropdown] = useState(false)

  const [cameraPermission, requestCameraPermission] = useCameraPermissions()

  const scanLineAnim = useRef(new Animated.Value(0)).current

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

  useEffect(() => {
    if (showQrScanner && !scanned) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 220,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ]),
      ).start()
    } else {
      scanLineAnim.setValue(0)
    }
  }, [showQrScanner, scanned, scanLineAnim, scanLineAnim.setValue])

  const filterLocations = (input: string): string[] => {
    return LOCATIONS.filter((location) => location.toLowerCase().includes(input.toLowerCase()))
  }

  const handleFromChange = (value: string) => {
    setFrom(value)
    if (value.length > 0) {
      setFromSuggestions(filterLocations(value))
      setShowFromDropdown(true)
    } else {
      setShowFromDropdown(false)
    }
  }

  const handleToChange = (value: string) => {
    setTo(value)
    if (value.length > 0) {
      setToSuggestions(filterLocations(value))
      setShowToDropdown(true)
    } else {
      setShowToDropdown(false)
    }
  }

  const handleSelectFrom = (location: string) => {
    setFrom(location)
    setShowFromDropdown(false)
  }

  const handleSelectTo = (location: string) => {
    setTo(location)
    setShowToDropdown(false)
  }

  const handlePassengerSelect = (type: string) => {
    setPassengerType(type)
    setShowPassengerDropdown(false)
  }

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

  if (showQrScanner) {
    return (
      <View className="flex-1">
        <View className="flex-1">
          <CameraView
            className="flex-1"
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "code128", "code39", "ean13", "pdf417"],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          />

          {/* Semi-transparent overlay with cutout for scanner */}
          <View className="absolute inset-0" />

          <View className="relative bg-emerald-300 flex-1">
            <Text className="mt-28 p-4 text-center text-2xl font-bold text-black">QR Reader</Text>
            <View className="flex-1 relative">
              <ImageBackground
                source={require("../assets/images/OIP 2.png")}
                className="flex-1 mb-32"
                resizeMode="cover"
              >
                <View className="absolute inset-0 flex items-center justify-center">
                  <View className="w-64 h-64 border-2 border-black relative">
                    {/* Clear the center area to make scanning more visible */}
                    <View className="absolute inset-0 bg-gray-200 opacity-50" />

                    {/* Scanner animation line */}
                    <Animated.View
                      className="absolute left-0 right-0 h-1 bg-red-500 z-10"
                      style={{
                        top: scanLineAnim,
                        shadowColor: "#ff0000",
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.8,
                        shadowRadius: 5,
                        elevation: 5,
                      }}
                    />

                    {/* Corner markers */}
                    <View className="absolute top-[-4] left-[-4] w-14 h-14 border-t-8 border-l-8 border-black rounded-[10%]" />
                    <View className="absolute top-[-4] right-[-4] w-14 h-14 border-t-8 border-r-8 border-black rounded-[10%]" />
                    <View className="absolute bottom-[-4] left-[-4] w-14 h-14 border-b-8 border-l-8 border-black rounded-[10%]" />
                    <View className="absolute bottom-[-4] right-[-4] w-14 h-14 border-b-8 border-r-8 border-black rounded-[10%]" />
                  </View>
                </View>
              </ImageBackground>
            </View>

            {/* Back button */}
            <View className="p-4 relative z-10">
              <TouchableOpacity
                className="w-full py-3 bg-white rounded-md"
                onPress={() => {
                  setScanned(false)
                  setShowQrScanner(false)
                }}
              >
                <Text className="text-center font-semibold">Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-emerald-400">
      <ScrollView className="flex-1 p-4">
        <View className="mb-4 mt-10">
          <Text className="text-black text-xl font-bold mb-2">Passenger</Text>
          <TouchableOpacity
            className="flex-row items-center justify-between w-full bg-white p-4 rounded-t-md"
            onPress={() => setShowPassengerDropdown(!showPassengerDropdown)}
          >
            <Text>{passengerType}</Text>
            <Ionicons name={showPassengerDropdown ? "chevron-up" : "chevron-down"} size={24} color="black" />
          </TouchableOpacity>

          {showPassengerDropdown && (
            <View className="absolute top-full w-full z-10">
              {["Regular", "Student", "Senior citizen", "Person's with Disabilities"].map((type) => (
                <TouchableOpacity
                  key={type}
                  className="w-full p-4 bg-white border-t border-gray-200"
                  onPress={() => handlePassengerSelect(type)}
                >
                  <Text>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View className="mb-4">
          <Text className="text-black text-xl font-bold mb-2">From</Text>
          <TextInput
            className="w-full p-4 bg-white rounded-md"
            value={from}
            onChangeText={handleFromChange}
            placeholder="Enter starting point"
          />
          {showFromDropdown && fromSuggestions.length > 0 && (
            <View className="absolute top-full w-full z-10 mt-1 bg-white rounded-md shadow-lg max-h-60">
              <ScrollView>
                {fromSuggestions.map((location, index) => (
                  <TouchableOpacity
                    key={index}
                    className="w-full p-3 border-b border-gray-100"
                    onPress={() => handleSelectFrom(location)}
                  >
                    <Text>{location}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <View className="mb-4">
          <Text className="text-black text-xl font-bold mb-2">To</Text>
          <TextInput
            className="w-full p-4 bg-white rounded-md"
            value={to}
            onChangeText={handleToChange}
            placeholder="Enter destination"
          />
          {showToDropdown && toSuggestions.length > 0 && (
            <View className="absolute top-full w-full z-10 mt-1 bg-white rounded-md shadow-lg max-h-60">
              <ScrollView>
                {toSuggestions.map((location, index) => (
                  <TouchableOpacity
                    key={index}
                    className="w-full p-3 border-b border-gray-100"
                    onPress={() => handleSelectTo(location)}
                  >
                    <Text>{location}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <View className="mb-4">
          <View className="flex-row items-center mb-2">
            <Text className="text-black text-xl font-bold">Kilometer</Text>
            <Ionicons name="bus-outline" size={24} color="black" className="ml-4" />
          </View>
          <TextInput
            className="w-1/2 p-4 bg-white rounded-md"
            value={kilometer}
            onChangeText={setKilometer}
            placeholder="Enter km"
            keyboardType="numeric"
          />
        </View>

        <View className="mb-8">
          <Text className="text-black text-xl font-bold mb-2">Fare</Text>
          <View className="relative">
            <TextInput className="w-1/2 p-4 bg-white rounded-md" value={fare} editable={false} placeholder="₱0.00" />
            <Text className="absolute bottom-[-96] left-4 right-4 text-center text-xl text-white opacity-90 font-semibold">
              Seamless Journey, One Scan Away
            </Text>
          </View>
        </View>
      </ScrollView>

      <View className="p-4">
        <TouchableOpacity
          className="mb-20 w-16 h-16 mx-auto border-2 border-black rounded-md items-center justify-center"
          onPress={() => setShowQrScanner(true)}
        >
          <View className="w-12 h-12 relative">
            <View className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-black" />
            <View className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-black" />
            <View className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-black" />
            <View className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-black" />
            <View className="absolute top-1/2 left-0 right-0 h-0.5 bg-black" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  )
}

