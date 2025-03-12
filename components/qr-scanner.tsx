"use client"

import { useRef, useEffect } from "react"
import { View, Text, TouchableOpacity, ImageBackground, Animated, StatusBar } from "react-native"
import { CameraView, type BarcodeScanningResult } from "expo-camera"

interface QRScannerProps {
  onScan: (result: BarcodeScanningResult) => void
  onClose: () => void
  scanned: boolean
}

export default function QRScanner({ onScan, onClose, scanned }: QRScannerProps) {
  const scanLineAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!scanned) {
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
  }, [scanned, scanLineAnim, scanLineAnim.setValue])

  return (
    <View className="flex-1">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      <View className="flex-1">
        <CameraView
          className="flex-1"
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "code128", "code39", "ean13", "pdf417"],
          }}
          onBarcodeScanned={scanned ? undefined : onScan}
        />

        {/* Semi-transparent overlay with cutout for scanner */}
        <View className="absolute inset-0" />

        <View className="relative bg-emerald-300 flex-1">
          <Text className="mt-28 p-4 text-center text-2xl font-bold text-black">QR Reader</Text>
          <View className="flex-1 relative">
            <ImageBackground source={require("../assets/images/OIP 2.png")} className="flex-1 mb-32" resizeMode="cover">
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
            <TouchableOpacity className="w-full py-3 bg-white rounded-md" onPress={onClose}>
              <Text className="text-center font-semibold">Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  )
}

