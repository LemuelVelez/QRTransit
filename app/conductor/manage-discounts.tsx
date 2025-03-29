"use client"

import { useState, useEffect } from "react"
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    StatusBar,
    Switch,
} from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { getCurrentUser, checkRoutePermission } from "@/lib/appwrite"
import {
    getDiscountConfigurations,
    updateDiscountConfiguration,
    saveDiscountConfiguration,
    deleteDiscountConfiguration,
    type DiscountConfig,
} from "@/lib/discount-service"

export default function ManageDiscountsScreen() {
    const [loading, setLoading] = useState(true)
    const [discounts, setDiscounts] = useState<DiscountConfig[]>([])
    const [conductorId, setConductorId] = useState("")
    const [editingDiscount, setEditingDiscount] = useState<DiscountConfig | null>(null)
    const [newDiscountType, setNewDiscountType] = useState("")
    const [newDiscountPercentage, setNewDiscountPercentage] = useState("")
    const [newDiscountDescription, setNewDiscountDescription] = useState("")
    const [showAddForm, setShowAddForm] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const router = useRouter()

    useEffect(() => {
        async function checkAccess() {
            try {
                // Check if user has conductor role specifically
                const hasPermission = await checkRoutePermission("conductor")

                if (!hasPermission) {
                    Alert.alert("Access Denied", "You don't have permission to access this screen.")
                    router.replace("/")
                    return
                }

                // Load conductor info
                const user = await getCurrentUser()
                if (user) {
                    setConductorId(user.$id || "")
                    await loadDiscounts()
                }
            } catch (error) {
                console.error("Error checking access:", error)
                Alert.alert("Error", "Failed to verify access permissions.")
                router.replace("/")
            }
        }

        checkAccess()
    }, [])

    const loadDiscounts = async () => {
        try {
            setLoading(true)
            setError(null)
            const discountConfigs = await getDiscountConfigurations()

            if (discountConfigs.length === 0) {
                setError("No discounts found. You may need to create the discounts collection in Appwrite.")
            }

            setDiscounts(discountConfigs)
        } catch (error) {
            console.error("Error loading discounts:", error)
            setError("Failed to load discount configurations. Please check your Appwrite setup.")
        } finally {
            setLoading(false)
        }
    }

    const handleToggleActive = async (discount: DiscountConfig) => {
        if (!discount.id) {
            Alert.alert("Error", "Discount ID is missing")
            return
        }

        try {
            setLoading(true)
            const success = await updateDiscountConfiguration(discount.id, {
                active: !discount.active,
            })

            if (success) {
                // Update the discount in the state
                setDiscounts(discounts.map((d) => (d.id === discount.id ? { ...d, active: !discount.active } : d)))
            } else {
                Alert.alert("Error", "Failed to update discount status")
            }
        } catch (error) {
            console.error("Error toggling discount status:", error)
            Alert.alert("Error", "Failed to update discount status")
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateDiscount = async () => {
        if (!editingDiscount || !editingDiscount.id) {
            return
        }

        try {
            setLoading(true)
            const discountPercentage = Number(editingDiscount.discountPercentage)

            if (isNaN(discountPercentage) || discountPercentage < 0 || discountPercentage > 100) {
                Alert.alert("Invalid Input", "Discount percentage must be between 0 and 100")
                setLoading(false)
                return
            }

            const success = await updateDiscountConfiguration(editingDiscount.id, {
                passengerType: editingDiscount.passengerType,
                discountPercentage: discountPercentage,
                description: editingDiscount.description,
                active: editingDiscount.active,
            })

            if (success) {
                // Update the discount in the state
                setDiscounts(discounts.map((d) => (d.id === editingDiscount.id ? editingDiscount : d)))
                setEditingDiscount(null)
            } else {
                Alert.alert("Error", "Failed to update discount")
            }
        } catch (error) {
            console.error("Error updating discount:", error)
            Alert.alert("Error", "Failed to update discount")
        } finally {
            setLoading(false)
        }
    }

    const handleAddDiscount = async () => {
        try {
            setLoading(true)
            const discountPercentage = Number(newDiscountPercentage)

            if (!newDiscountType) {
                Alert.alert("Invalid Input", "Passenger type is required")
                setLoading(false)
                return
            }

            if (isNaN(discountPercentage) || discountPercentage < 0 || discountPercentage > 100) {
                Alert.alert("Invalid Input", "Discount percentage must be between 0 and 100")
                setLoading(false)
                return
            }

            // Check if passenger type already exists
            if (discounts.some((d) => d.passengerType.toLowerCase() === newDiscountType.toLowerCase())) {
                Alert.alert("Invalid Input", "This passenger type already exists")
                setLoading(false)
                return
            }

            const newDiscount = {
                passengerType: newDiscountType,
                discountPercentage: discountPercentage,
                description: newDiscountDescription,
                active: true,
                createdBy: conductorId,
            }

            const discountId = await saveDiscountConfiguration(newDiscount)

            if (discountId) {
                // Add the new discount to the state
                setDiscounts([
                    ...discounts,
                    {
                        ...newDiscount,
                        id: discountId,
                        createdAt: Date.now(),
                    },
                ])

                // Reset form
                setNewDiscountType("")
                setNewDiscountPercentage("")
                setNewDiscountDescription("")
                setShowAddForm(false)
            } else {
                Alert.alert("Error", "Failed to add discount")
            }
        } catch (error) {
            console.error("Error adding discount:", error)
            Alert.alert("Error", "Failed to add discount: " + (error instanceof Error ? error.message : "Unknown error"))
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteDiscount = (discount: DiscountConfig) => {
        if (!discount.id) {
            Alert.alert("Error", "Discount ID is missing")
            return
        }

        Alert.alert("Delete Discount", `Are you sure you want to delete the discount for ${discount.passengerType}?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        setLoading(true)
                        const success = await deleteDiscountConfiguration(discount.id!)

                        if (success) {
                            // Remove the deleted discount from the state
                            setDiscounts(discounts.filter((d) => d.id !== discount.id))
                        } else {
                            Alert.alert("Error", "Failed to delete discount")
                        }
                    } catch (error) {
                        console.error("Error deleting discount:", error)
                        Alert.alert("Error", "Failed to delete discount")
                    } finally {
                        setLoading(false)
                    }
                },
            },
        ])
    }

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-emerald-400">
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
                <ActivityIndicator size="large" color="white" />
                <Text className="mt-4 text-white">Loading discounts...</Text>
            </View>
        )
    }

    return (
        <View className="flex-1 bg-emerald-400">
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

            <View className="flex-row items-center justify-between px-4 pt-16 pb-4">
                <TouchableOpacity onPress={() => router.back()} className="p-2">
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text className="text-white text-xl font-bold">Manage Discounts</Text>
                <TouchableOpacity onPress={loadDiscounts} className="p-2">
                    <Ionicons name="refresh" size={24} color="white" />
                </TouchableOpacity>
            </View>

            {error && (
                <View className="bg-red-500 mx-4 p-3 rounded-lg mb-4">
                    <Text className="text-white">{error}</Text>
                </View>
            )}

            <ScrollView className="flex-1 px-4 pt-2">
                {discounts.length === 0 && !error ? (
                    <View className="bg-white rounded-lg p-4 mb-4 shadow-sm items-center">
                        <Text className="text-gray-500 text-center">No discounts found. Add a new discount to get started.</Text>
                    </View>
                ) : (
                    discounts.map((discount) => (
                        <View key={discount.id || discount.passengerType} className="bg-white rounded-lg p-4 mb-4 shadow-sm">
                            {editingDiscount && editingDiscount.id === discount.id ? (
                                // Edit form
                                <View>
                                    <Text className="text-gray-700 mb-1 font-medium">Passenger Type</Text>
                                    <TextInput
                                        className="border border-gray-300 rounded-md p-3 bg-gray-50 mb-3"
                                        value={editingDiscount.passengerType}
                                        onChangeText={(text) => setEditingDiscount({ ...editingDiscount, passengerType: text })}
                                        placeholder="Passenger type"
                                    />

                                    <Text className="text-gray-700 mb-1 font-medium">Discount Percentage (%)</Text>
                                    <TextInput
                                        className="border border-gray-300 rounded-md p-3 bg-gray-50 mb-3"
                                        value={editingDiscount.discountPercentage.toString()}
                                        onChangeText={(text) =>
                                            setEditingDiscount({ ...editingDiscount, discountPercentage: Number(text) || 0 })
                                        }
                                        placeholder="Discount percentage"
                                        keyboardType="numeric"
                                    />

                                    <Text className="text-gray-700 mb-1 font-medium">Description</Text>
                                    <TextInput
                                        className="border border-gray-300 rounded-md p-3 bg-gray-50 mb-3"
                                        value={editingDiscount.description || ""}
                                        onChangeText={(text) => setEditingDiscount({ ...editingDiscount, description: text })}
                                        placeholder="Description"
                                    />

                                    <View className="flex-row justify-between mt-4">
                                        <TouchableOpacity
                                            className="bg-gray-300 py-2 px-4 rounded-lg"
                                            onPress={() => setEditingDiscount(null)}
                                        >
                                            <Text className="text-gray-800">Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity className="bg-emerald-500 py-2 px-4 rounded-lg" onPress={handleUpdateDiscount}>
                                            <Text className="text-white">Save</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                // Display view
                                <>
                                    <View className="flex-row justify-between items-center mb-2">
                                        <View className="flex-row items-center">
                                            <Switch
                                                value={discount.active}
                                                onValueChange={() => handleToggleActive(discount)}
                                                trackColor={{ false: "#d1d5db", true: "#10b981" }}
                                                thumbColor="#ffffff"
                                            />
                                            <Text className="ml-2 text-gray-500">{discount.active ? "Active" : "Inactive"}</Text>
                                        </View>
                                    </View>

                                    <View className="mb-3">
                                        <Text className="text-lg font-bold text-gray-800">{discount.passengerType}</Text>
                                        <Text className="text-gray-600">Discount: {discount.discountPercentage}%</Text>
                                        {discount.description && <Text className="text-gray-500 mt-1">{discount.description}</Text>}
                                    </View>

                                    <View className="flex-row justify-end">
                                        <TouchableOpacity
                                            className="mr-3 flex-row items-center"
                                            onPress={() => setEditingDiscount({ ...discount })}
                                        >
                                            <Ionicons name="create-outline" size={18} color="#059669" />
                                            <Text className="ml-1 text-emerald-600">Edit</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity className="flex-row items-center" onPress={() => handleDeleteDiscount(discount)}>
                                            <Ionicons name="trash-outline" size={18} color="#ef4444" />
                                            <Text className="ml-1 text-red-500">Delete</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </View>
                    ))
                )}

                {showAddForm ? (
                    <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
                        <Text className="text-xl font-bold text-gray-800 mb-4">Add New Discount</Text>

                        <Text className="text-gray-700 mb-1 font-medium">Passenger Type</Text>
                        <TextInput
                            className="border border-gray-300 rounded-md p-3 bg-gray-50 mb-3"
                            value={newDiscountType}
                            onChangeText={setNewDiscountType}
                            placeholder="e.g., Student, Senior Citizen"
                        />

                        <Text className="text-gray-700 mb-1 font-medium">Discount Percentage (%)</Text>
                        <TextInput
                            className="border border-gray-300 rounded-md p-3 bg-gray-50 mb-3"
                            value={newDiscountPercentage}
                            onChangeText={setNewDiscountPercentage}
                            placeholder="e.g., 20"
                            keyboardType="numeric"
                        />

                        <Text className="text-gray-700 mb-1 font-medium">Description (Optional)</Text>
                        <TextInput
                            className="border border-gray-300 rounded-md p-3 bg-gray-50 mb-3"
                            value={newDiscountDescription}
                            onChangeText={setNewDiscountDescription}
                            placeholder="Description of the discount"
                        />

                        <View className="flex-row justify-between mt-4">
                            <TouchableOpacity className="bg-gray-300 py-2 px-4 rounded-lg" onPress={() => setShowAddForm(false)}>
                                <Text className="text-gray-800">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity className="bg-emerald-500 py-2 px-4 rounded-lg" onPress={handleAddDiscount}>
                                <Text className="text-white">Add Discount</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity
                        className="bg-white rounded-lg p-4 mb-4 shadow-sm items-center"
                        onPress={() => setShowAddForm(true)}
                    >
                        <View className="flex-row items-center">
                            <Ionicons name="add-circle-outline" size={24} color="#059669" />
                            <Text className="ml-2 text-emerald-600 font-medium">Add New Discount</Text>
                        </View>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </View>
    )
}

