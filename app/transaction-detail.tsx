"use client"

import { useState, useEffect } from "react"
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, StatusBar } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { getTransactions } from "@/lib/transaction-service"

export default function TransactionDetailScreen() {
    const params = useLocalSearchParams()
    const router = useRouter()
    const [transaction, setTransaction] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const { id } = params

    useEffect(() => {
        async function loadTransactionDetails() {
            if (!id) {
                setError("Transaction ID is missing")
                setLoading(false)
                return
            }

            try {
                setLoading(true)
                // Get all user transactions
                const userTransactions = await getTransactions((params.userId as string) || "")

                // Find the specific transaction
                const foundTransaction = userTransactions.find((t) => t.id === id)

                if (foundTransaction) {
                    setTransaction(foundTransaction)
                } else {
                    setError("Transaction not found")
                }
            } catch (err) {
                console.error("Error loading transaction details:", err)
                setError("Failed to load transaction details")
            } finally {
                setLoading(false)
            }
        }

        loadTransactionDetails()
    }, [id, params.userId])

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString()
    }

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2,
        }).format(Math.abs(amount))
    }

    const getTransactionTypeLabel = (type: string) => {
        switch (type) {
            case "CASH_IN":
                return "Cash In"
            case "CASH_OUT":
                return "Cash Out"
            case "SEND":
                return "Money Sent"
            case "RECEIVE":
                return "Money Received"
            default:
                return type
        }
    }

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-emerald-400 justify-center items-center">
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
                <ActivityIndicator size="large" color="white" />
                <Text className="text-white mt-4">Loading transaction details...</Text>
            </SafeAreaView>
        )
    }

    if (error) {
        return (
            <SafeAreaView className="flex-1 bg-emerald-400">
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
                <View className="pt-16 px-4">
                    <TouchableOpacity onPress={() => router.back()} className="mb-4">
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <View className="bg-white rounded-lg p-6 items-center">
                        <Ionicons name="alert-circle" size={48} color="#ef4444" />
                        <Text className="text-red-500 text-lg mt-4">{error}</Text>
                        <TouchableOpacity className="mt-6 bg-emerald-500 px-6 py-3 rounded-lg" onPress={() => router.back()}>
                            <Text className="text-white font-medium">Go Back</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        )
    }

    if (!transaction) {
        return (
            <SafeAreaView className="flex-1 bg-emerald-400">
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
                <View className="pt-16 px-4">
                    <TouchableOpacity onPress={() => router.back()} className="mb-4">
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <View className="bg-white rounded-lg p-6 items-center">
                        <Ionicons name="document-outline" size={48} color="#9ca3af" />
                        <Text className="text-gray-500 text-lg mt-4">Transaction not found</Text>
                        <TouchableOpacity className="mt-6 bg-emerald-500 px-6 py-3 rounded-lg" onPress={() => router.back()}>
                            <Text className="text-white font-medium">Go Back</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView className="flex-1 bg-emerald-400">
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

            <ScrollView className="flex-1">
                <View className="pt-16 px-4 pb-8">
                    <TouchableOpacity onPress={() => router.back()} className="mb-4">
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>

                    <View className="bg-white rounded-lg overflow-hidden">
                        {/* Header */}
                        <View className="bg-emerald-600 p-6 items-center">
                            <Text className="text-white text-lg font-medium mb-2">{getTransactionTypeLabel(transaction.type)}</Text>
                            <Text className="text-white text-3xl font-bold">
                                {transaction.type === "CASH_IN" || transaction.type === "RECEIVE" ? "+" : "-"}
                                {formatAmount(transaction.amount)}
                            </Text>
                            <Text className="text-emerald-100 mt-2">{formatDate(transaction.timestamp)}</Text>
                        </View>

                        {/* Details */}
                        <View className="p-6">
                            <View className="mb-6">
                                <Text className="text-gray-500 text-sm mb-1">Transaction ID</Text>
                                <Text className="text-gray-800 font-medium">{transaction.id}</Text>
                            </View>

                            {transaction.description && (
                                <View className="mb-6">
                                    <Text className="text-gray-500 text-sm mb-1">Description</Text>
                                    <Text className="text-gray-800 font-medium">{transaction.description}</Text>
                                </View>
                            )}

                            {transaction.reference && (
                                <View className="mb-6">
                                    <Text className="text-gray-500 text-sm mb-1">Reference Number</Text>
                                    <Text className="text-gray-800 font-medium">{transaction.reference}</Text>
                                </View>
                            )}

                            {transaction.recipientId && (
                                <View className="mb-6">
                                    <Text className="text-gray-500 text-sm mb-1">Recipient ID</Text>
                                    <Text className="text-gray-800 font-medium">{transaction.recipientId}</Text>
                                </View>
                            )}

                            {transaction.balance !== undefined && (
                                <View className="mb-6">
                                    <Text className="text-gray-500 text-sm mb-1">Balance After Transaction</Text>
                                    <Text className="text-gray-800 font-medium">{formatAmount(transaction.balance)}</Text>
                                </View>
                            )}

                            {/* Status */}
                            <View className="mt-4 bg-emerald-50 p-4 rounded-lg flex-row items-center">
                                <Ionicons name="checkmark-circle" size={20} color="#059669" />
                                <Text className="text-emerald-700 ml-2">Transaction Completed</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

