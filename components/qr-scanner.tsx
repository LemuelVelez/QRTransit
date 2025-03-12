"use client"

import { useRef, useEffect, useState } from "react"
import { View, Text, TouchableOpacity, Animated, StatusBar } from "react-native"
import { CameraView, type BarcodeScanningResult } from "expo-camera"
import { Ionicons } from "@expo/vector-icons"
import { qrScannerStyles } from "../styles/qr-scanner.styles"

interface QRScannerProps {
  onScan: (result: BarcodeScanningResult) => void
  onClose: () => void
  scanned: boolean
}

export default function QRScanner({ onScan, onClose, scanned }: QRScannerProps) {
  const [flash, setFlash] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const scanLineAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (!scanned) {
      // Scan line animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      ).start()
    } else {
      scanLineAnim.setValue(0)
    }
  }, [scanned, scanLineAnim])

  // Pulse animation for when QR code is detected
  useEffect(() => {
    if (detecting) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ).start()
    } else {
      pulseAnim.setValue(1)
    }
  }, [detecting, pulseAnim])

  const toggleFlash = () => setFlash(!flash)

  // Handle barcode detection
  const handleBarcodeDetected = (result: BarcodeScanningResult) => {
    setDetecting(true)
    // Reset detection state after a short delay
    setTimeout(() => setDetecting(false), 1000)
    onScan(result)
  }

  return (
    <View style={qrScannerStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      <CameraView
        style={qrScannerStyles.camera}
        facing="back"
        enableTorch={flash}
        autofocus="on"
        zoom={0.5} // Medium zoom level for better QR detection
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "code128", "code39", "ean13", "pdf417"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeDetected}
      />

      {/* Semi-transparent overlay with cutout */}
      <View style={qrScannerStyles.overlay}>
        <View style={qrScannerStyles.overlayRow}>
          <View style={qrScannerStyles.overlayItem} />
        </View>
        <View style={qrScannerStyles.scannerRow}>
          <View style={qrScannerStyles.overlayItem} />
          <Animated.View
            style={[
              qrScannerStyles.scannerContainer,
              detecting && {
                transform: [{ scale: pulseAnim }],
                borderColor: "#00e676",
                borderWidth: 2,
              },
            ]}
          >
            {/* Scanner animation line */}
            <Animated.View
              style={[
                qrScannerStyles.scanLine,
                {
                  transform: [
                    {
                      translateY: scanLineAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 248],
                      }),
                    },
                  ],
                },
              ]}
            />
            {/* Corner markers */}
            <View
              style={[qrScannerStyles.corner, qrScannerStyles.topLeft, detecting && qrScannerStyles.cornerActive]}
            />
            <View
              style={[qrScannerStyles.corner, qrScannerStyles.topRight, detecting && qrScannerStyles.cornerActive]}
            />
            <View
              style={[qrScannerStyles.corner, qrScannerStyles.bottomLeft, detecting && qrScannerStyles.cornerActive]}
            />
            <View
              style={[qrScannerStyles.corner, qrScannerStyles.bottomRight, detecting && qrScannerStyles.cornerActive]}
            />
          </Animated.View>
          <View style={qrScannerStyles.overlayItem} />
        </View>
        <View style={qrScannerStyles.overlayRow}>
          <View style={qrScannerStyles.overlayItem} />
        </View>
      </View>

      {/* Header */}
      <View style={qrScannerStyles.header}>
        <TouchableOpacity style={qrScannerStyles.backButton} onPress={onClose}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={qrScannerStyles.headerTitle}>Scan QR Code</Text>
        <TouchableOpacity style={qrScannerStyles.flashButton} onPress={toggleFlash}>
          <Ionicons name={flash ? "flash" : "flash-off"} size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <View style={qrScannerStyles.instructions}>
        <Text style={qrScannerStyles.instructionText}>
          {detecting ? "QR Code Detected!" : "Position the QR code within the frame to scan"}
        </Text>
      </View>

      {/* Focus indicator */}
      {detecting && (
        <View style={qrScannerStyles.focusIndicator}>
          <Ionicons name="scan-outline" size={24} color="#00e676" />
        </View>
      )}
    </View>
  )
}

