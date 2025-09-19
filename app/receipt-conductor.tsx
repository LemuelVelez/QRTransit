// app/receipt-conductor.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Image, Share, ScrollView, Alert } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import ViewShot from "react-native-view-shot"
import * as MediaLibrary from "expo-media-library"
import * as FileSystem from "expo-file-system"
import * as Sharing from "expo-sharing"
import { getTripDetails } from "@/lib/trips-service"

export default function ConductorReceiptScreen() {
    const params = useLocalSearchParams()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [receiptData, setReceiptData] = useState<any>(null)
    const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null)
    const [hasMediaPermission, setHasMediaPermission] = useState(false)
    const viewShotRef = useRef<any>(null)

    useEffect(() => {
        ; (async () => {
            const { status } = await MediaLibrary.requestPermissionsAsync()
            setHasMediaPermission(status === "granted")
        })()
    }, [])

    const receiptId = params.receiptId as string | undefined

    const coerceTimestampParam = (ts: unknown) => {
        if (typeof ts === "string" && ts.trim().length > 0) return ts
        if (typeof ts === "number" && Number.isFinite(ts)) return new Date(ts).toLocaleString()
        return new Date().toLocaleString()
    }

    useEffect(() => {
        async function loadReceiptData() {
            if (!receiptId) return
            try {
                setLoading(true)
                const details = await getTripDetails(receiptId)

                if (details) {
                    const resolvedBusType =
                        (details.busType && String(details.busType)) ||
                        (params.busType && String(params.busType)) ||
                        "Regular"

                    const resolvedPassengerType =
                        (details.passengerType && String(details.passengerType)) ||
                        (params.passengerType && String(params.passengerType)) ||
                        "Regular"

                    setReceiptData({
                        ...details,
                        timestamp: coerceTimestampParam(details.timestamp ?? params.timestamp),
                        paymentMethod: details.paymentMethod ?? params.paymentMethod,
                        passengerType: resolvedPassengerType,
                        busNumber: details.busNumber ?? params.busNumber,
                        busType: resolvedBusType,
                    })
                } else {
                    setReceiptData({
                        id: receiptId,
                        passengerName: params.passengerName,
                        fare: params.fare,
                        from: params.from,
                        to: params.to,
                        timestamp: coerceTimestampParam(params.timestamp),
                        paymentMethod: params.paymentMethod,
                        transactionId: params.transactionId,
                        passengerPhoto: params.passengerPhoto,
                        passengerType: (params.passengerType as string) || "Regular",
                        kilometer: params.kilometer,
                        busNumber: params.busNumber,
                        busType: (params.busType as string) || "Regular",
                    })
                }
            } catch (error) {
                console.error("Error loading trip details:", error)
                setReceiptData({
                    id: receiptId,
                    passengerName: params.passengerName,
                    fare: params.fare,
                    from: params.from,
                    to: params.to,
                    timestamp: coerceTimestampParam(params.timestamp),
                    paymentMethod: params.paymentMethod,
                    transactionId: params.transactionId,
                    passengerPhoto: params.passengerPhoto,
                    passengerType: (params.passengerType as string) || "Regular",
                    kilometer: params.kilometer,
                    busNumber: params.busNumber,
                    busType: (params.busType as string) || "Regular",
                })
            } finally {
                setLoading(false)
            }
        }

        if (receiptId) loadReceiptData()
    }, [receiptId])

    const captureReceipt = async (format: "jpg" | "png" = "jpg") => {
        try {
            if (!viewShotRef.current) return null
            const uri = await viewShotRef.current.capture({ format, quality: 0.9 })
            setCapturedImageUri(uri)
            return uri
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
            if (!uri) return Alert.alert("Error", "Failed to capture receipt image")
            const timestamp = new Date().getTime()
            const tempFilePath = FileSystem.cacheDirectory + `qrtransit_receipt_${timestamp}.png`
            await FileSystem.copyAsync({ from: uri, to: tempFilePath })
            const isAvailable = await Sharing.isAvailableAsync()
            if (isAvailable) {
                await Sharing.shareAsync(tempFilePath, { mimeType: "image/png", dialogTitle: "Share QRTransit Receipt", UTI: "public.png" })
            } else {
                await Share.share({ url: tempFilePath, title: "QRTransit Receipt", message: "Here's the passenger receipt from QRTransit." })
            }
        } catch (error) {
            console.error("Error sharing receipt:", error)
            Alert.alert("Error", "Failed to share receipt")
        }
    }

    const handleDownloadReceipt = async () => {
        try {
            Alert.alert("Save Receipt", "Choose image format", [
                {
                    text: "JPG",
                    onPress: async () => {
                        const uri = capturedImageUri || (await captureReceipt("jpg"))
                        if (!uri) return Alert.alert("Error", "Failed to capture receipt image")
                        const saved = await saveToGallery(uri, "jpg")
                        Alert.alert(saved ? "Success" : "Error", saved ? "Receipt saved to your gallery" : "Failed to save receipt to gallery")
                    },
                },
                {
                    text: "PNG",
                    onPress: async () => {
                        const uri = capturedImageUri || (await captureReceipt("png"))
                        if (!uri) return Alert.alert("Error", "Failed to capture receipt image")
                        const saved = await saveToGallery(uri, "png")
                        Alert.alert(saved ? "Success" : "Error", saved ? "Receipt saved to your gallery" : "Failed to save receipt to gallery")
                    },
                },
                { text: "Cancel", style: "cancel" },
            ])
        } catch (error) {
            console.error("Error with receipt:", error)
            Alert.alert("Error", "Failed to process receipt")
        }
    }

    const handleGoBack = () => {
        router.replace("/conductor")
    }

    if (loading || !receiptData) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Loading receipt...</Text>
            </View>
        )
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Conductor Receipt</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={handleDownloadReceipt} style={styles.actionButton}>
                        <Ionicons name="download-outline" size={24} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleShareReceipt} style={styles.actionButton}>
                        <Ionicons name="share-outline" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            <ViewShot ref={viewShotRef} style={styles.receiptContainer} options={{ format: "png", quality: 1 }}>
                <View style={styles.logoContainer}>
                    <Image source={require("@/assets/images/QuickRide.png")} style={styles.logo} />
                    <Text style={styles.logoText}>QRTransit</Text>
                </View>

                <Text style={styles.receiptTitle}>Trip Receipt</Text>
                <Text style={styles.receiptId}>Receipt ID: {receiptData.id}</Text>
                <Text style={styles.timestamp}>{receiptData.timestamp}</Text>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Passenger:</Text>
                    <Text style={styles.infoValue}>{receiptData.passengerName}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>From:</Text>
                    <Text style={styles.infoValue}>{receiptData.from}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>To:</Text>
                    <Text style={styles.infoValue}>{receiptData.to}</Text>
                </View>

                {receiptData.busNumber ? (
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Bus Number:</Text>
                        <Text style={styles.infoValue}>#{receiptData.busNumber}</Text>
                    </View>
                ) : null}

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Bus Type:</Text>
                    <Text style={styles.infoValue}>{String(receiptData.busType || "Regular")}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Passenger Type:</Text>
                    <Text style={styles.infoValue}>{String(receiptData.passengerType || "Regular")}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Payment Method:</Text>
                    <View style={styles.paymentMethodContainer}>
                        <Ionicons
                            name={receiptData.paymentMethod === "QR" ? "qr-code" : "cash"}
                            size={16}
                            color="#059669"
                            style={styles.paymentIcon}
                        />
                        <Text style={styles.paymentMethodText}>{receiptData.paymentMethod}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.fareContainer}>
                    <Text style={styles.fareLabel}>Total Fare:</Text>
                    <Text style={styles.fareValue}>{receiptData.fare}</Text>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Issued by Conductor</Text>
                </View>
            </ViewShot>

            <TouchableOpacity style={styles.doneButton} onPress={handleGoBack}>
                <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f5f5f5" },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#059669", paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20 },
    headerTitle: { color: "white", fontSize: 18, fontWeight: "bold" },
    backButton: { padding: 5 },
    headerActions: { flexDirection: "row" },
    actionButton: { padding: 5, marginLeft: 10 },
    receiptContainer: { backgroundColor: "white", margin: 20, borderRadius: 10, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    logoContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 20 },
    logo: { width: 40, height: 40, resizeMode: "contain" },
    logoText: { fontSize: 20, fontWeight: "bold", marginLeft: 10, color: "#059669" },
    receiptTitle: { fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 5 },
    receiptId: { fontSize: 12, color: "#666", textAlign: "center" },
    timestamp: { fontSize: 12, color: "#666", textAlign: "center", marginBottom: 15 },
    divider: { height: 1, backgroundColor: "#e0e0e0", marginVertical: 15 },
    infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
    infoLabel: { fontSize: 14, color: "#666", flex: 1 },
    infoValue: { fontSize: 14, fontWeight: "500", textAlign: "right", flex: 2 },
    paymentMethodContainer: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", flex: 2 },
    paymentIcon: { marginRight: 4 },
    paymentMethodText: { fontSize: 14, fontWeight: "500" },
    fareContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 5 },
    fareLabel: { fontSize: 16, fontWeight: "bold" },
    fareValue: { fontSize: 20, fontWeight: "bold", color: "#059669" },
    footer: { marginTop: 20, alignItems: "center" },
    footerText: { fontSize: 14, color: "#666", textAlign: "center" },
    doneButton: { backgroundColor: "#059669", margin: 20, padding: 15, borderRadius: 8, alignItems: "center" },
    doneButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
})
