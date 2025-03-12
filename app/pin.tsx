"use client"

import { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Alert, StatusBar } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { getPin, verifyPin, getCurrentUser, getUserRoleAndRedirect, checkRoutePermission } from "@/lib/appwrite"
import { usePinVerification } from "@/lib/pin-context"

export default function PinEntryScreen() {
    const [pin, setPin] = useState<string>("")
    const [loading, setLoading] = useState<boolean>(true)
    const [verifying, setVerifying] = useState<boolean>(false)
    const [hasPin, setHasPin] = useState<boolean>(false)
    const [user, setUser] = useState<any>(null)
    const router = useRouter()
    const { setPinVerified } = usePinVerification()

    useEffect(() => {
        async function checkUserPin() {
            try {
                setLoading(true)

                const currentUser = await getCurrentUser()
                if (!currentUser) {
                    // No authenticated user, redirect to login
                    router.replace("/sign-in")
                    return
                }

                // Check if user has permission to access this screen
                const hasPermission = await checkRoutePermission(["passenger", "conductor"]) // Allow both passenger and conductor roles
                if (!hasPermission) {
                    Alert.alert("Access Denied", "You don't have permission to access this screen.")
                    router.replace("/sign-in")
                    return
                }

                setUser(currentUser)
                const storedPin = await getPin()
                setHasPin(!!storedPin)
                setLoading(false)
            } catch (error) {
                console.error("Error checking user PIN:", error)
                setLoading(false)
                Alert.alert("Error", "Failed to load user data. Please try again.")
            }
        }

        checkUserPin()
    }, [])

    const handleNumberPress = (number: string) => {
        if (pin.length < 4) {
            const newPin = pin + number
            setPin(newPin)

            // If PIN is complete (4 digits), verify it
            if (newPin.length === 4) {
                verifyPinAndProceed(newPin)
            }
        }
    }

    // Function to handle role-based navigation
    const navigateBasedOnRole = (role: string) => {
        console.log(`Navigating based on role: ${role}`)

        // Use type-safe navigation based on role
        if (role === "conductor") {
            router.replace("/conductor")
        } else {
            // Default to passenger role
            router.replace("/")
        }
    }

    const verifyPinAndProceed = async (enteredPin: string) => {
        try {
            setVerifying(true)
            const storedPin = await getPin()

            if (!storedPin) {
                // No PIN set, this is a new PIN setup
                // In a real app, you would hash and save this PIN
                Alert.alert("Success", "PIN setup would be completed here")

                // Set PIN as verified in context
                setPinVerified(true)

                // Get user role and navigate accordingly
                const { role } = await getUserRoleAndRedirect()
                navigateBasedOnRole(role)
                return
            }

            // Use the Appwrite verifyPin function instead of manual verification
            const isPinCorrect = await verifyPin(enteredPin)

            if (isPinCorrect) {
                console.log("PIN verified successfully")

                // Set PIN as verified in context
                setPinVerified(true)

                // Get user role and navigate to the appropriate screen
                const { role } = await getUserRoleAndRedirect()
                console.log(`User role: ${role}`)

                // Navigate based on role using our helper function
                navigateBasedOnRole(role)
            } else {
                // PIN is incorrect
                Alert.alert("Error", "Incorrect PIN. Please try again.")
                setPin("")
            }
        } catch (error) {
            console.error("PIN verification error:", error)
            Alert.alert("Error", "Failed to verify PIN. Please try again.")
        } finally {
            setVerifying(false)
        }
    }

    const handleDelete = () => {
        setPin(pin.slice(0, -1))
    }

    const renderDots = () => {
        return (
            <View className="flex-row justify-center">
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
                {[0, 1, 2, 3].map((i) => (
                    <View key={i} className={`w-5 h-5 rounded-full mx-4 ${i < pin.length ? "bg-white" : "bg-white/50"}`} />
                ))}
            </View>
        )
    }

    if (loading) {
        return (
            <View className="flex-1 bg-green-400 justify-center items-center">
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
                <ActivityIndicator size="large" color="white" />
                <Text className="text-white mt-4">Loading...</Text>
            </View>
        )
    }

    return (
        <View className="flex-1 bg-green-400 items-center">
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
            {/* Logo */}
            <View className="mt-32 w-full max-w-sm items-center">
                {/* Logo Circle */}
                <View className="w-24 h-24 bg-green-700 rounded-full justify-center items-center overflow-hidden">
                    <Image source={require("../assets/images/QuickRide.png")} className="w-24 h-24 object-contain" />
                </View>
            </View>

            {/* User greeting */}
            {user && <Text className="text-white text-xl mt-6">Welcome, {user.firstname || user.name}</Text>}

            {/* PIN Entry Area */}
            <View className="items-center mt-16">
                <Text className="text-3xl text-black mb-8">{hasPin ? "Enter your PIN" : "Create a PIN"}</Text>
                {renderDots()}

                {verifying && (
                    <View className="mt-4">
                        <ActivityIndicator size="small" color="white" />
                    </View>
                )}
            </View>

            {/* Keypad - Positioned at bottom with reduced height */}
            <View className="absolute bottom-2 w-full px-2">
                <View className="bg-white rounded-b-3xl pt-2 pb-1">
                    <View className="flex-row flex-wrap justify-between mx-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
                            <TouchableOpacity
                                key={number}
                                className="w-[30%] h-16 justify-center items-center mb-1"
                                onPress={() => handleNumberPress(number.toString())}
                                disabled={verifying}
                            >
                                <Text className="text-2xl text-black">{number}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity className="w-[30%] h-12 justify-center items-center">
                            <Text className="text-2xl text-black"></Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="w-[30%] h-12 justify-center items-center mb-1"
                            onPress={() => handleNumberPress("0")}
                            disabled={verifying}
                        >
                            <Text className="text-2xl text-black">0</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="w-[30%] h-12 justify-center items-center mb-1"
                            onPress={handleDelete}
                            disabled={verifying}
                        >
                            <MaterialCommunityIcons name="backspace-outline" size={24} color="black" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    )
}