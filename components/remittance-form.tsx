"use client"

import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { submitCashRemittance } from "@/lib/cash-remittance-service"

interface RemittanceFormProps {
    busId: string
    busNumber: string
    conductorId: string
    conductorName: string
    cashRevenue: number
    onSuccess: () => void
    onCancel: () => void
}

export default function RemittanceForm({
    busId,
    busNumber,
    conductorId,
    conductorName,
    cashRevenue,
    onSuccess,
    onCancel,
}: RemittanceFormProps) {
    const [amount, setAmount] = useState(cashRevenue.toFixed(2))
    const [notes, setNotes] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async () => {
        if (!amount || Number.parseFloat(amount) <= 0) {
            Alert.alert("Invalid Amount", "Please enter a valid amount")
            return
        }

        setLoading(true)
        try {
            const remittanceData = {
                busId,
                busNumber,
                conductorId,
                conductorName,
                status: "pending" as const, // Always set to pending for admin verification
                amount,
                notes,
            }

            const result = await submitCashRemittance(remittanceData)

            if (result) {
                Alert.alert("Success", "Cash remittance submitted successfully. An admin will verify your remittance.")
                onSuccess()
            } else {
                Alert.alert("Error", "Failed to submit cash remittance")
            }
        } catch (error) {
            console.error("Error submitting remittance:", error)
            Alert.alert("Error", "An unexpected error occurred")
        } finally {
            setLoading(false)
        }
    }

    return (
        <View className="bg-white rounded-lg p-4">
            <Text className="text-xl font-bold text-gray-800 mb-4">Submit Cash Remittance</Text>

            <View className="mb-4">
                <Text className="text-gray-700 mb-1 font-medium">Bus Number</Text>
                <View className="flex-row items-center">
                    <Ionicons name="bus-outline" size={24} color="#059669" className="mr-2" />
                    <Text className="flex-1 border border-gray-300 rounded-md p-3 bg-gray-50">{busNumber}</Text>
                </View>
            </View>

            <View className="mb-4">
                <Text className="text-gray-700 mb-1 font-medium">Amount (₱)</Text>
                <View className="flex-row items-center">
                    <Ionicons name="cash-outline" size={24} color="#059669" className="mr-2" />
                    <TextInput
                        className="flex-1 border border-gray-300 rounded-md p-3 bg-gray-50"
                        value={amount}
                        onChangeText={setAmount}
                        placeholder="Enter amount"
                        keyboardType="numeric"
                        editable={!loading}
                    />
                </View>
            </View>

            <View className="mb-6">
                <Text className="text-gray-700 mb-1 font-medium">Notes (Optional)</Text>
                <View className="flex-row items-center">
                    <Ionicons name="create-outline" size={24} color="#059669" className="mr-2" />
                    <TextInput
                        className="flex-1 border border-gray-300 rounded-md p-3 bg-gray-50"
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Add notes"
                        multiline
                        numberOfLines={3}
                        editable={!loading}
                    />
                </View>
            </View>

            <View className="bg-yellow-50 p-3 rounded-lg mb-4 border border-yellow-200">
                <Text className="text-yellow-700 text-sm">
                    Note: Your remittance will be submitted for admin verification. The status will be updated once an admin
                    confirms receipt.
                </Text>
            </View>

            <View className="flex-row justify-between">
                <TouchableOpacity className="bg-gray-300 py-2 px-4 rounded-lg" onPress={onCancel} disabled={loading}>
                    <Text className="text-gray-800">Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity className="bg-emerald-500 py-2 px-4 rounded-lg" onPress={handleSubmit} disabled={loading}>
                    {loading ? <ActivityIndicator size="small" color="white" /> : <Text className="text-white">Submit</Text>}
                </TouchableOpacity>
            </View>
        </View>
    )
}

