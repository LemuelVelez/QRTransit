"use client"

import { useState, useEffect, useRef } from "react"
import {
    View,
    Text,
    ScrollView,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    Alert,
    Animated,
} from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { checkRoutePermission, getCurrentUser, logoutUser } from "@/lib/appwrite"
import { getInspectorStats } from "@/lib/inspector-service"

interface InspectorStats {
    totalInspections: string
    totalBusesCleared: string
    lastActive: string
}

export default function InspectorProfileScreen() {
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<any>(null)
    const [stats, setStats] = useState<InspectorStats>({
        totalInspections: "0",
        totalBusesCleared: "0",
        lastActive: "-",
    })
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(50)).current
    const router = useRouter()

    const loadProfile = async () => {
        try {
            // Check if user has inspector role specifically
            const hasPermission = await checkRoutePermission("inspector")

            if (!hasPermission) {
                Alert.alert("Access Denied", "You don't have permission to access this screen.")
                router.replace("/")
                return
            }

            // Load inspector info
            const currentUser = await getCurrentUser()
            if (currentUser) {
                setUser(currentUser)

                // Load inspector stats
                const inspectorStats = await getInspectorStats(currentUser.$id)
                setStats(inspectorStats)
            }

            // Animate content in
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]).start()
        } catch (error) {
            console.error("Error loading profile:", error)
            Alert.alert("Error", "Failed to load profile information.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadProfile()
    }, [])

    const handleLogout = async () => {
        Alert.alert("Logout", "Are you sure you want to logout?", [
            {
                text: "Cancel",
                style: "cancel",
            },
            {
                text: "Logout",
                onPress: async () => {
                    try {
                        setLoading(true)
                        const { success } = await logoutUser()
                        if (success) {
                            router.replace("/sign-in")
                        }
                    } catch (error) {
                        console.error("Logout failed:", error)
                        Alert.alert("Logout Failed", "There was a problem logging out. Please try again.")
                    } finally {
                        setLoading(false)
                    }
                },
            },
        ])
    }

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-blue-600">
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
                <ActivityIndicator size="large" color="white" />
                <Text className="mt-4 text-white font-medium">Loading profile...</Text>
            </View>
        )
    }

    return (
        <View className="flex-1 bg-blue-600">
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

            {/* Header */}
            <View className="pt-16 px-5 flex-row items-center justify-between mb-4">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="bg-blue-500 rounded-full p-2"
                    accessibilityLabel="Go back"
                >
                    <Ionicons name="arrow-back" size={22} color="white" />
                </TouchableOpacity>
                <Text className="text-white text-xl font-bold">Profile</Text>
                <TouchableOpacity onPress={handleLogout} className="bg-blue-500 rounded-full p-2" accessibilityLabel="Log out">
                    <Ionicons name="log-out-outline" size={22} color="white" />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
                {/* Profile Card */}
                <Animated.View
                    className="bg-white rounded-xl p-6 mb-4 items-center shadow-lg elevation-3"
                    style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
                >
                    <View className="w-24 h-24 bg-blue-100 rounded-full justify-center items-center mb-4 shadow-md elevation-2">
                        {user?.profileImage ? (
                            <Image source={{ uri: user.profileImage }} className="w-24 h-24 rounded-full" />
                        ) : (
                            <Ionicons name="person" size={48} color="#3b82f6" />
                        )}
                    </View>

                    <Text className="text-2xl font-bold text-gray-800 mb-1">
                        {user?.firstname && user?.lastname ? `${user.firstname} ${user.lastname}` : user?.username || "Inspector"}
                    </Text>

                    <View className="bg-blue-50 px-3 py-1 rounded-full mb-4">
                        <Text className="text-blue-600">Inspector ID: {user?.$id?.substring(0, 8) || "N/A"}</Text>
                    </View>

                    {user?.email && (
                        <View className="flex-row items-center mb-2">
                            <Ionicons name="mail-outline" size={16} color="#3b82f6" className="mr-2" />
                            <Text className="text-gray-600">{user.email}</Text>
                        </View>
                    )}

                    {user?.phone && (
                        <View className="flex-row items-center">
                            <Ionicons name="call-outline" size={16} color="#3b82f6" className="mr-2" />
                            <Text className="text-gray-600">{user.phone}</Text>
                        </View>
                    )}
                </Animated.View>

                {/* Stats */}
                <Animated.View
                    className="bg-white rounded-xl p-6 mb-4 shadow-md elevation-2"
                    style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
                >
                    <Text className="text-lg font-bold text-gray-800 mb-4">Activity Summary</Text>

                    <View className="flex-row justify-between mb-6">
                        <View className="items-center bg-blue-50 rounded-xl p-4 flex-1 mr-2">
                            <Text className="text-2xl font-bold text-blue-600">{stats.totalInspections}</Text>
                            <Text className="text-gray-600 text-center">Total Inspections</Text>
                        </View>

                        <View className="items-center bg-green-50 rounded-xl p-4 flex-1 ml-2">
                            <Text className="text-2xl font-bold text-green-600">{stats.totalBusesCleared}</Text>
                            <Text className="text-gray-600 text-center">Buses Cleared</Text>
                        </View>
                    </View>

                    <View className="flex-row items-center bg-gray-50 p-3 rounded-lg">
                        <Ionicons name="time-outline" size={18} color="#3b82f6" className="mr-2" />
                        <Text className="text-gray-700">
                            Last active: <Text className="font-medium">{stats.lastActive}</Text>
                        </Text>
                    </View>
                </Animated.View>

                {/* Quick Actions */}
                <Animated.View
                    className="bg-white rounded-xl p-6 mb-6 shadow-md elevation-2"
                    style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
                >
                    <Text className="text-lg font-bold text-gray-800 mb-4">Quick Actions</Text>

                    <TouchableOpacity
                        className="flex-row items-center py-3.5 border-b border-gray-100"
                        onPress={() => router.push("/inspector/history")}
                        accessibilityLabel="View inspection history"
                    >
                        <View className="bg-blue-100 rounded-full p-2 mr-3">
                            <Ionicons name="document-text-outline" size={20} color="#3b82f6" />
                        </View>
                        <Text className="text-gray-700 flex-1">View Inspection History</Text>
                        <Ionicons name="chevron-forward" size={20} color="#3b82f6" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="flex-row items-center py-3.5 border-b border-gray-100"
                        onPress={() => router.push("/inspector")}
                        accessibilityLabel="Search buses"
                    >
                        <View className="bg-blue-100 rounded-full p-2 mr-3">
                            <Ionicons name="search-outline" size={20} color="#3b82f6" />
                        </View>
                        <Text className="text-gray-700 flex-1">Search Buses</Text>
                        <Ionicons name="chevron-forward" size={20} color="#3b82f6" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="flex-row items-center py-3.5"
                        onPress={() => Alert.alert("Help", "Contact support at support@quickride.com")}
                        accessibilityLabel="Help and support"
                    >
                        <View className="bg-blue-100 rounded-full p-2 mr-3">
                            <Ionicons name="help-circle-outline" size={20} color="#3b82f6" />
                        </View>
                        <Text className="text-gray-700 flex-1">Help & Support</Text>
                        <Ionicons name="chevron-forward" size={20} color="#3b82f6" />
                    </TouchableOpacity>
                </Animated.View>
            </ScrollView>
        </View>
    )
}

