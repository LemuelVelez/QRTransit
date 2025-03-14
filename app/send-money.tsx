"use client"

import { useState } from "react"
import {
    View,
    Text,
    SafeAreaView,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    ActivityIndicator,
    Alert,
} from "react-native"
import { useRouter } from "expo-router"
import { FontAwesome, Ionicons } from "@expo/vector-icons"
import { createSendTransaction } from "../lib/transaction-service"

export default function SendMoneyScreen() {
    const router = useRouter()
    const [amount, setAmount] = useState("")
    const [recipient, setRecipient] = useState("")
    const [note, setNote] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    const validateForm = () => {
        // Reset error state
        setError("")

        // Check if recipient is provided
        if (!recipient.trim()) {
            setError("Please enter a recipient name or number")
            return false
        }

        // Check if amount is provided and is a valid number
        if (!amount.trim()) {
            setError("Please enter an amount")
            return false
        }

        const numAmount = Number.parseFloat(amount)
        if (isNaN(numAmount) || numAmount <= 0) {
            setError("Please enter a valid amount greater than 0")
            return false
        }

        return true
    }

    // Update the handleSend function to provide more specific error messages
    const handleSend = async () => {
        if (!validateForm()) {
            return
        }

        setIsLoading(true)

        try {
            // Convert amount to number
            const numAmount = Number.parseFloat(amount)

            // Call the createSendTransaction function
            await createSendTransaction(recipient, numAmount, note)

            // Show success message
            Alert.alert("Success", "Money sent successfully!", [{ text: "OK", onPress: () => router.back() }])
        } catch (error) {
            console.error("Error sending money:", error)

            // Show more specific error message
            let errorMessage = "Failed to send money. Please try again."

            // Check for specific error types
            if (error instanceof Error) {
                if (error.message.includes("Recipient not found")) {
                    errorMessage = `Recipient "${recipient}" not found. Please check the name or number and try again.`
                } else if (error.message.includes("Invalid query")) {
                    errorMessage = "There was a problem with the database query. Please contact support."
                } else {
                    errorMessage = error.message
                }
            }

            setError(errorMessage)
            Alert.alert("Error", errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-emerald-400">
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
                <ScrollView className="flex-1">
                    {/* Header */}
                    <View className="flex-row mt-12 items-center p-4 border-b border-emerald-500">
                        <TouchableOpacity onPress={() => router.back()} className="mr-4">
                            <Ionicons name="arrow-back" size={24} color="#065f46" />
                        </TouchableOpacity>
                        <Text className="text-xl font-bold text-emerald-900">Send Money</Text>
                    </View>

                    {/* Form */}
                    <View className="p-6 space-y-6">
                        {/* Error message */}
                        {error ? (
                            <View className="bg-red-100 p-3 rounded-lg border border-red-300">
                                <Text className="text-red-700">{error}</Text>
                            </View>
                        ) : null}

                        {/* Recipient */}
                        <View className="space-y-2">
                            <Text className="text-emerald-800 font-medium">Recipient</Text>
                            <View className="flex-row items-center bg-white rounded-lg p-3 border border-emerald-300">
                                <FontAwesome name="user" size={20} color="#059669" className="mr-2" />
                                <TextInput
                                    placeholder="Enter recipient's number or name"
                                    value={recipient}
                                    onChangeText={setRecipient}
                                    className="flex-1 ml-2 text-emerald-900"
                                    editable={!isLoading}
                                />
                            </View>
                        </View>

                        {/* Amount */}
                        <View className="space-y-2">
                            <Text className="text-emerald-800 font-medium">Amount</Text>
                            <View className="flex-row items-center bg-white rounded-lg p-3 border border-emerald-300">
                                <Text className="text-emerald-600 font-bold text-lg">₱</Text>
                                <TextInput
                                    placeholder="0.00"
                                    value={amount}
                                    onChangeText={setAmount}
                                    keyboardType="numeric"
                                    className="flex-1 ml-2 text-emerald-900 text-lg"
                                    editable={!isLoading}
                                />
                            </View>
                        </View>

                        {/* Note */}
                        <View className="space-y-2">
                            <Text className="text-emerald-800 font-medium">Note (Optional)</Text>
                            <View className="bg-white rounded-lg p-3 border border-emerald-300">
                                <TextInput
                                    placeholder="Add a note"
                                    value={note}
                                    onChangeText={setNote}
                                    multiline
                                    numberOfLines={3}
                                    className="text-emerald-900"
                                    editable={!isLoading}
                                />
                            </View>
                        </View>

                        {/* Send Button */}
                        <TouchableOpacity
                            onPress={handleSend}
                            className={`bg-emerald-600 py-4 rounded-lg mt-6 ${isLoading ? "opacity-70" : ""}`}
                            activeOpacity={0.8}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-bold text-center text-lg">Send Money</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

