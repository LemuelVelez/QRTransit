"use client"

import { useState, useEffect } from "react"
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
    Alert,
    ActivityIndicator,
    Linking,
} from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { createPaymentLink, openPaymentUrl, PAYMONGO_MIN_AMOUNT } from "@/lib/paymongo-api"
import {
    saveTransaction,
    generateTransactionId,
    updateTransactionStatus,
    getCurrentUserBalance,
    WALLET_LIMIT,
} from "@/lib/transaction-service"
import { getCurrentUser } from "@/lib/appwrite"

export default function CashInScreen() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [amount, setAmount] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [currentTransactionId, setCurrentTransactionId] = useState<string | null>(null)
    const [currentBalance, setCurrentBalance] = useState<number>(0)
    const [isLoadingBalance, setIsLoadingBalance] = useState(true)

    // Fetch current user on component mount
    useEffect(() => {
        const fetchUser = async () => {
            try {
                setIsLoadingBalance(true)
                const currentUser = await getCurrentUser()
                setUser(currentUser)

                if (!currentUser) {
                    Alert.alert("Error", "You must be logged in to perform this action")
                    router.back()
                    return
                }

                // Get current balance
                const balance = await getCurrentUserBalance()
                setCurrentBalance(balance)
                setIsLoadingBalance(false)
            } catch (error) {
                console.error("Error fetching user:", error)
                Alert.alert("Error", "Failed to load user information")
                router.back()
            } finally {
                setIsLoadingBalance(false)
            }
        }

        fetchUser()
    }, [])

    // Set up URL listener for payment redirect
    useEffect(() => {
        // Handle deep linking for payment redirect
        const subscription = Linking.addEventListener("url", handleRedirect)

        return () => {
            subscription.remove()
        }
    }, [currentTransactionId])

    const handleRedirect = async (event: { url: string }) => {
        // Extract payment status from URL
        const url = event.url

        if (url.includes("success") && currentTransactionId) {
            try {
                // Update transaction status to completed
                await updateTransactionStatus(currentTransactionId, "COMPLETED")

                // Refresh the balance after successful payment
                const updatedBalance = await getCurrentUserBalance()
                setCurrentBalance(updatedBalance)

                Alert.alert("Success", "Payment completed successfully!")
                router.back()
            } catch (error) {
                console.error("Error updating transaction status:", error)
                Alert.alert(
                    "Note",
                    "Payment was successful, but we couldn't update your transaction history. Please check your account balance.",
                )
                router.back()
            }
        } else if (url.includes("failed") && currentTransactionId) {
            try {
                // Update transaction status to failed
                await updateTransactionStatus(currentTransactionId, "FAILED")

                Alert.alert("Failed", "Payment failed. Please try again.")
            } catch (error) {
                console.error("Error updating transaction status:", error)
                Alert.alert("Failed", "Payment failed. Please try again.")
            }
        }
    }

    const validateInput = () => {
        if (!amount || Number.parseFloat(amount) <= 0) {
            setError("Please enter a valid amount")
            return false
        }

        // Check for PayMongo's minimum amount requirement
        if (Number.parseFloat(amount) < PAYMONGO_MIN_AMOUNT) {
            setError(`Minimum amount for cash in is PHP ${PAYMONGO_MIN_AMOUNT}.00`)
            return false
        }

        // Check wallet limit
        const amountValue = Number.parseFloat(amount)
        if (currentBalance + amountValue > WALLET_LIMIT) {
            setError(
                `This transaction would exceed your wallet limit of ₱${WALLET_LIMIT.toLocaleString()}. Maximum amount you can add is ₱${(WALLET_LIMIT - currentBalance).toLocaleString()}.`,
            )
            return false
        }

        setError(null)
        return true
    }

    const handleCashIn = async () => {
        if (!validateInput()) return
        if (!user) {
            Alert.alert("Error", "You must be logged in to perform this action")
            return
        }

        setIsLoading(true)

        try {
            // Log environment variables for debugging (remove in production)
            console.log("Environment variables check:")
            console.log("PayMongo Key exists:", process.env.EXPO_PAYMONGO_SECRET_KEY ? "Yes" : "No")
            console.log("Transactions Collection ID:", process.env.EXPO_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID)

            // Generate a transaction ID
            const transactionId = generateTransactionId()
            setCurrentTransactionId(transactionId)

            // Create a payment link
            const userName = user.firstname && user.lastname ? `${user.firstname} ${user.lastname}` : user.email || "User"

            const description = `Cash in for ${userName} - PHP ${amount}`
            const remarks = `Mobile app payment for user: ${user.$id}`

            const linkData = await createPaymentLink(amount, description, remarks)

            // Extract the checkout URL and link ID from the response
            const checkoutUrl = linkData.data?.attributes?.checkout_url
            const linkId = linkData.data?.id

            if (!checkoutUrl) {
                throw new Error("No checkout URL provided in the response")
            }

            // Save the transaction with pending status
            await saveTransaction({
                id: transactionId,
                type: "CASH_IN",
                amount: Number.parseFloat(amount),
                description: description,
                paymentId: linkId,
                timestamp: Date.now(),
                reference: linkData.data?.attributes?.reference_number,
                userId: user.$id,
                status: "COMPLETED", // Explicitly mark as pending
            })

            // Open the checkout URL in a browser
            await openPaymentUrl(checkoutUrl)

            // Show instructions to the user
            Alert.alert(
                "Payment Instructions",
                "You will be redirected to complete your payment. After payment, you can return to the app.",
                [{ text: "OK" }],
            )
        } catch (error) {
            console.error("Payment error:", error)
            Alert.alert("Error", error instanceof Error ? error.message : "An error occurred during payment")

            // If we have a transaction ID, update it to failed
            if (currentTransactionId) {
                try {
                    await updateTransactionStatus(currentTransactionId, "FAILED")
                } catch (updateError) {
                    console.error("Error updating transaction status:", updateError)
                }
            }
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
                        <Text className="text-xl font-bold text-emerald-900">Cash In</Text>
                    </View>

                    {/* Current Balance */}
                    <View className="mx-6 mt-4 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                        <Text className="text-emerald-800 font-medium">Current Balance</Text>
                        {isLoadingBalance ? (
                            <ActivityIndicator size="small" color="#059669" />
                        ) : (
                            <Text className="text-emerald-700 font-bold text-lg">₱{currentBalance.toFixed(2)}</Text>
                        )}
                        <Text className="text-xs text-emerald-600 mt-1">Wallet Limit: ₱{WALLET_LIMIT.toLocaleString()}</Text>
                    </View>

                    {/* Form */}
                    <View className="p-6 space-y-6">
                        {/* Error message */}
                        {error && (
                            <View className="bg-red-100 p-3 rounded-lg border border-red-300">
                                <Text className="text-red-700">{error}</Text>
                            </View>
                        )}

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
                                />
                            </View>
                            <Text className="text-xs text-emerald-700 mt-1">Minimum amount: ₱{PAYMONGO_MIN_AMOUNT}.00</Text>
                            {!isLoadingBalance && (
                                <Text className="text-xs text-emerald-700">
                                    Maximum amount: ₱{(WALLET_LIMIT - currentBalance).toLocaleString()}
                                </Text>
                            )}
                        </View>

                        {/* Payment information */}
                        <View className="bg-white p-4 rounded-lg border border-emerald-300">
                            <Text className="text-emerald-800 font-medium mb-2">Payment Information</Text>
                            <Text className="text-emerald-700 text-sm mb-1">• You'll be redirected to a secure payment page</Text>
                            <Text className="text-emerald-700 text-sm mb-1">
                                • Multiple payment options available (Card, GCash, PayMaya, etc.)
                            </Text>
                            <Text className="text-emerald-700 text-sm">• Return to the app after completing your payment</Text>
                        </View>

                        {/* Cash In Button */}
                        <TouchableOpacity
                            onPress={handleCashIn}
                            className={`${isLoading ? "bg-emerald-400" : "bg-emerald-600"} py-4 rounded-lg mt-6`}
                            activeOpacity={0.8}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#ffffff" />
                            ) : (
                                <Text className="text-white font-bold text-center text-lg">Proceed to Payment</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

