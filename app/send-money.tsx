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
import { FontAwesome, Ionicons } from "@expo/vector-icons"

export default function SendMoneyScreen() {
    const router = useRouter()
    const [amount, setAmount] = useState("")
    const [recipient, setRecipient] = useState("")
    const [note, setNote] = useState("")

    const handleSend = () => {
        // Implement send money logic here
        console.log("Sending money:", { amount, recipient, note })
        // After successful transaction
        alert("Money sent successfully!")
        router.back()
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
                                />
                            </View>
                        </View>

                        {/* Send Button */}
                        <TouchableOpacity onPress={handleSend} className="bg-emerald-600 py-4 rounded-lg mt-6" activeOpacity={0.8}>
                            <Text className="text-white font-bold text-center text-lg">Send Money</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

