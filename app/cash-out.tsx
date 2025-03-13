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
} from "react-native"
import { useRouter } from "expo-router"
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons"

export default function CashOutScreen() {
    const router = useRouter()
    const [amount, setAmount] = useState("")
    const [selectedMethod, setSelectedMethod] = useState<number | null>(null)
    const [accountNumber, setAccountNumber] = useState("")

    // Updated with correct icon names for the respective icon sets
    const withdrawalMethods = [
        { id: 1, name: "Bank Account", iconSet: "FontAwesome5", iconName: "university" },
        { id: 2, name: "Over the Counter", iconSet: "MaterialCommunityIcons", iconName: "store" },
        { id: 3, name: "ATM Withdrawal", iconSet: "FontAwesome5", iconName: "credit-card" },
    ]

    const handleCashOut = () => {
        // Implement cash out logic here
        if (!selectedMethod) {
            alert("Please select a withdrawal method")
            return
        }

        console.log("Cash out:", { amount, method: selectedMethod, accountNumber })
        // After successful transaction
        alert("Cash out request submitted!")
        router.back()
    }

    // Helper function to render the correct icon based on the icon set
    const renderIcon = (iconSet: string, iconName: string) => {
        switch (iconSet) {
            case "FontAwesome5":
                return <FontAwesome5 name={iconName as any} size={24} color="#059669" />
            case "MaterialCommunityIcons":
                return <MaterialCommunityIcons name={iconName as any} size={24} color="#059669" />
            default:
                return <Ionicons name="help-circle" size={24} color="#059669" />
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-emerald-400">
            <StatusBar barStyle="light-content" backgroundColor="transparent bg-emeral-400" translucent={true} />
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
                <ScrollView className="flex-1">
                    {/* Header */}
                    <View className="flex-row mt-12 items-center p-4 border-b border-emerald-500">
                        <TouchableOpacity onPress={() => router.back()} className="mr-4">
                            <Ionicons name="arrow-back" size={24} color="#065f46" />
                        </TouchableOpacity>
                        <Text className="text-xl font-bold text-emerald-900">Cash Out</Text>
                    </View>

                    {/* Form */}
                    <View className="p-6 space-y-6">
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
                        </View>

                        {/* Withdrawal Methods */}
                        <View className="space-y-3">
                            <Text className="text-emerald-800 font-medium">Select Withdrawal Method</Text>

                            {withdrawalMethods.map((method) => (
                                <TouchableOpacity
                                    key={method.id}
                                    className={`flex-row items-center p-4 rounded-lg border ${selectedMethod === method.id ? "bg-emerald-100 border-emerald-500" : "bg-white border-emerald-200"
                                        }`}
                                    onPress={() => setSelectedMethod(method.id)}
                                >
                                    {renderIcon(method.iconSet, method.iconName)}
                                    <Text className="ml-3 text-emerald-800 font-medium">{method.name}</Text>
                                    {selectedMethod === method.id && (
                                        <Ionicons name="checkmark-circle" size={24} color="#059669" style={{ marginLeft: "auto" }} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Account Details (conditionally shown) */}
                        {selectedMethod === 1 && (
                            <View className="space-y-2">
                                <Text className="text-emerald-800 font-medium">Bank Account Number</Text>
                                <View className="flex-row items-center bg-white rounded-lg p-3 border border-emerald-300">
                                    <FontAwesome5 name="university" size={20} color="#059669" />
                                    <TextInput
                                        placeholder="Enter your account number"
                                        value={accountNumber}
                                        onChangeText={setAccountNumber}
                                        keyboardType="numeric"
                                        className="flex-1 ml-2 text-emerald-900"
                                    />
                                </View>
                            </View>
                        )}

                        {/* Cash Out Button */}
                        <TouchableOpacity
                            onPress={handleCashOut}
                            className="bg-emerald-600 py-4 rounded-lg mt-6"
                            activeOpacity={0.8}
                        >
                            <Text className="text-white font-bold text-center text-lg">Withdraw</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

