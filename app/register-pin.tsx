"use client"

import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native"
import { AntDesign, Feather } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { registerPin } from "@/lib/appwrite"

type RootStackParamList = {
    register: undefined
    pin: undefined
}

export default function PinSetupScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
    const [showPin, setShowPin] = useState(false)
    const [showConfirmPin, setShowConfirmPin] = useState(false)
    const [pin, setPin] = useState("")
    const [confirmPin, setConfirmPin] = useState("")
    const [agreed, setAgreed] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const togglePinVisibility = () => {
        setShowPin(!showPin)
    }

    const toggleConfirmPinVisibility = () => {
        setShowConfirmPin(!showConfirmPin)
    }

    const toggleAgreed = () => {
        setAgreed(!agreed)
    }

    const isNextDisabled = !agreed || pin.length !== 4 || confirmPin.length !== 4 || pin !== confirmPin

    const handleSetPin = async () => {
        if (isNextDisabled) return

        try {
            setIsLoading(true)

            // Verify that PINs match
            if (pin !== confirmPin) {
                Alert.alert("Error", "PINs do not match. Please try again.")
                return
            }

            // Register the PIN
            const result = await registerPin(pin)

            if (result) {
                // PIN registration successful
                navigation.navigate("pin")
            } else {
                Alert.alert("Error", "Failed to register PIN. Please try again.")
            }
        } catch (error) {
            console.error("PIN registration error:", error)
            Alert.alert("Error", "An error occurred while setting your PIN. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <View className="flex-1 bg-green-600">
            {/* Header */}
            <View className="mt-12 flex-row items-center p-4 bg-green-600">
                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
                    <AntDesign name="arrowleft" size={24} color="black" />
                </TouchableOpacity>
                <Text className="text-xl font-medium text-black">Register</Text>
            </View>

            {/* Main Content */}
            <View className="flex-1 p-4 bg-green-300">
                <View className="mb-6">
                    <Text className="text-2xl font-bold text-black">Set PIN</Text>
                    <Text className="text-black">Never share your PIN with anyone</Text>
                </View>

                <View className="space-y-6">
                    <View className="space-y-2">
                        <Text className="text-black mb-2">Enter a 4-digit PIN</Text>
                        <View className="relative">
                            <TextInput
                                secureTextEntry={!showPin}
                                placeholder="Enter Pin"
                                className="pr-10 bg-gray-100 text-black rounded-md p-3 mb-4"
                                maxLength={4}
                                value={pin}
                                keyboardType="numeric"
                                onChangeText={(text) => setPin(text.replace(/[^0-9]/g, "").slice(0, 4))}
                            />
                            <TouchableOpacity
                                onPress={togglePinVisibility}
                                className="absolute right-3 top-0 bottom-0 justify-center mb-4"
                            >
                                <Feather name={showPin ? "eye-off" : "eye"} size={20} color="gray" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View className="space-y-2">
                        <Text className="text-black mb-2">Confirm PIN</Text>
                        <View className="relative">
                            <TextInput
                                secureTextEntry={!showConfirmPin}
                                placeholder="Enter Pin"
                                className="pr-10 bg-gray-100 text-black rounded-md p-3"
                                maxLength={4}
                                value={confirmPin}
                                keyboardType="numeric"
                                onChangeText={(text) => setConfirmPin(text.replace(/[^0-9]/g, "").slice(0, 4))}
                            />
                            <TouchableOpacity
                                onPress={toggleConfirmPinVisibility}
                                className="absolute right-3 top-0 bottom-0 justify-center"
                            >
                                <Feather name={showConfirmPin ? "eye-off" : "eye"} size={20} color="gray" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View className="flex-row items-start mt-96 space-x-2 pt-8">
                        <TouchableOpacity onPress={toggleAgreed} className="mt-1">
                            <View
                                className={`w-5 h-5 border border-black rounded ${agreed ? "bg-green-600" : "bg-transparent"} justify-center items-center`}
                            >
                                {agreed && <AntDesign name="check" size={16} color="white" />}
                            </View>
                        </TouchableOpacity>
                        <Text className="text-black ml-2 mb-6">I agree to the Terms and Conditions stated above.</Text>
                    </View>

                    <TouchableOpacity
                        className={`w-full py-3 rounded-md items-center ${isNextDisabled ? "bg-green-600 opacity-50" : "bg-green-600"}`}
                        disabled={isNextDisabled || isLoading}
                        onPress={handleSetPin}
                    >
                        {isLoading ? <ActivityIndicator color="white" /> : <Text className="text-white font-medium">Next</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    )
}

