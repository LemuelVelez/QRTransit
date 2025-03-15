"use client"

import { useEffect, useState } from "react"
import { View, Text, TouchableOpacity, Share, ActivityIndicator, ScrollView } from "react-native"
import { MaterialIcons, Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import * as FileSystem from "expo-file-system"
import * as Sharing from "expo-sharing"

interface ReceiptParams {
    transactionId: string
    passengerName: string
    fare: string
    from: string
    to: string
    timestamp: string
    passengerType: string
}

export default function ReceiptScreen() {
    const router = useRouter()
    const params = useLocalSearchParams() as unknown as ReceiptParams
    const [loading, setLoading] = useState(false)
    const [receiptData, setReceiptData] = useState<ReceiptParams | null>(null)

    useEffect(() => {
        if (params) {
            setReceiptData({
                transactionId: params.transactionId || "TXN-" + Date.now(),
                passengerName: params.passengerName || "Unknown Passenger",
                fare: params.fare || "₱0.00",
                from: params.from || "Unknown",
                to: params.to || "Unknown",
                timestamp: params.timestamp || new Date().toLocaleString(),
                passengerType: params.passengerType || "Regular",
            })
        }
    }, [params])

    const handleShare = async () => {
        try {
            const result = await Share.share({
                message: `Receipt for fare payment\n
Transaction ID: ${receiptData?.transactionId}\n
Passenger: ${receiptData?.passengerName}\n
Amount: ${receiptData?.fare}\n
From: ${receiptData?.from}\n
To: ${receiptData?.to}\n
Date: ${receiptData?.timestamp}\n
Passenger Type: ${receiptData?.passengerType}`,
                title: "Fare Payment Receipt",
            })
        } catch (error) {
            console.error("Error sharing receipt:", error)
        }
    }

    const handleDownload = async () => {
        if (!receiptData) return

        setLoading(true)
        try {
            // Create receipt content
            const receiptContent = `
=================================
        FARE PAYMENT RECEIPT
=================================

Transaction ID: ${receiptData.transactionId}
Date: ${receiptData.timestamp}

Passenger: ${receiptData.passengerName}
Type: ${receiptData.passengerType}

From: ${receiptData.from}
To: ${receiptData.to}

Amount: ${receiptData.fare}

=================================
      Thank you for riding!
=================================
      `

            // Create a temporary file
            const fileUri = `${FileSystem.cacheDirectory}receipt-${Date.now()}.txt`
            await FileSystem.writeAsStringAsync(fileUri, receiptContent)

            // Share the file
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri)
            }
        } catch (error) {
            console.error("Error downloading receipt:", error)
        } finally {
            setLoading(false)
        }
    }

    if (!receiptData) {
        return (
            <View className="flex-1 justify-center items-center bg-emerald-400">
                <ActivityIndicator size="large" color="white" />
            </View>
        )
    }

    return (
        <View className="flex-1 bg-emerald-400">
            <View className="mb-4 mt-12 px-4">
                <TouchableOpacity onPress={() => router.back()} className="p-1">
                    <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-4">
                <View className="bg-white rounded-xl shadow-md p-6 mb-6">
                    <View className="items-center mb-6">
                        <Ionicons name="checkmark-circle" size={64} color="#059669" />
                        <Text className="text-2xl font-bold text-gray-800 mt-2">Payment Successful</Text>
                        <Text className="text-gray-600">Receipt generated successfully</Text>
                    </View>

                    <View className="bg-gray-50 p-4 rounded-lg mb-6">
                        <View className="flex-row justify-between py-2 border-b border-gray-200">
                            <Text className="text-gray-600">Transaction ID:</Text>
                            <Text className="font-medium text-gray-800">{receiptData.transactionId}</Text>
                        </View>
                        <View className="flex-row justify-between py-2 border-b border-gray-200">
                            <Text className="text-gray-600">Date:</Text>
                            <Text className="font-medium text-gray-800">{receiptData.timestamp}</Text>
                        </View>
                        <View className="flex-row justify-between py-2 border-b border-gray-200">
                            <Text className="text-gray-600">Passenger:</Text>
                            <Text className="font-medium text-gray-800">{receiptData.passengerName}</Text>
                        </View>
                        <View className="flex-row justify-between py-2 border-b border-gray-200">
                            <Text className="text-gray-600">Type:</Text>
                            <Text className="font-medium text-gray-800">{receiptData.passengerType}</Text>
                        </View>
                        <View className="flex-row justify-between py-2 border-b border-gray-200">
                            <Text className="text-gray-600">From:</Text>
                            <Text className="font-medium text-gray-800">{receiptData.from}</Text>
                        </View>
                        <View className="flex-row justify-between py-2 border-b border-gray-200">
                            <Text className="text-gray-600">To:</Text>
                            <Text className="font-medium text-gray-800">{receiptData.to}</Text>
                        </View>
                        <View className="flex-row justify-between py-2">
                            <Text className="text-gray-600">Amount:</Text>
                            <Text className="font-bold text-emerald-600">{receiptData.fare}</Text>
                        </View>
                    </View>

                    <View className="flex-row justify-between">
                        <TouchableOpacity
                            onPress={handleShare}
                            className="flex-1 mr-2 py-3 bg-gray-200 rounded-lg items-center flex-row justify-center"
                        >
                            <Ionicons name="share-social-outline" size={20} color="#059669" />
                            <Text className="font-medium text-gray-800 ml-2">Share</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleDownload}
                            className="flex-1 ml-2 py-3 bg-emerald-500 rounded-lg items-center flex-row justify-center"
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <>
                                    <Ionicons name="download-outline" size={20} color="white" />
                                    <Text className="font-medium text-white ml-2">Download</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </View>
    )
}

