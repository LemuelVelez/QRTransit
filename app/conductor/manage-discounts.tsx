// app/conductor/manage-discounts.tsx
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
import BusTypeSelector from "@/components/bus-type-selector"

export default function ManageDiscountsScreen() {
    const [loading, setLoading] = useState(true)
    const [discounts, setDiscounts] = useState<DiscountConfig[]>([])
    const [conductorId, setConductorId] = useState("")
    const [editingDiscount, setEditingDiscount] = useState<DiscountConfig | null>(null)
    const [newDiscountType, setNewDiscountType] = useState("")
    const [newDiscountPercentage, setNewDiscountPercentage] = useState("")
    const [newDiscountDescription, setNewDiscountDescription] = useState("")
    const [newDiscountBusType, setNewDiscountBusType] = useState("Regular")
    const [showAddForm, setShowAddForm] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const router = useRouter()

    useEffect(() => {
        async function checkAccess() {
            try {
                const hasPermission = await checkRoutePermission("conductor")

                if (!hasPermission) {
                    Alert.alert("Access Denied", "You don't have permission to access this screen.")
                    router.replace("/")
                    return
                }

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
        if (!editingDiscount || !editingDiscount.id) return

        try {
            setLoading(true)
            const discountPercentage = Number(editingDiscount.discountPercentage)

            if (isNaN(discountPercentage) || discountPercentage < 0 || discountPercentage > 100) {
                Alert.alert("Invalid Input", "Discount percentage must be between 0 and 100")
                setLoading(false)
                return
            }

            if (!editingDiscount.passengerType) {
                Alert.alert("Invalid Input", "Passenger type is required")
                setLoading(false)
                return
            }

            if (!editingDiscount.busType) {
                Alert.alert("Invalid Input", "Bus type is required")
                setLoading(false)
                return
            }

            const success = await updateDiscountConfiguration(editingDiscount.id, {
                passengerType: editingDiscount.passengerType,
                busType: editingDiscount.busType,
                discountPercentage: discountPercentage,
                description: editingDiscount.description,
                active: editingDiscount.active,
            })

            if (success) {
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

            if (!newDiscountBusType) {
                Alert.alert("Invalid Input", "Bus type is required")
                setLoading(false)
                return
            }

            if (isNaN(discountPercentage) || discountPercentage < 0 || discountPercentage > 100) {
                Alert.alert("Invalid Input", "Discount percentage must be between 0 and 100")
                setLoading(false)
                return
            }

            // Unique pair check (passengerType + busType)
            if (discounts.some((d) =>
                d.passengerType.toLowerCase() === newDiscountType.toLowerCase() &&
                (d.busType || "Regular").toLowerCase() === newDiscountBusType.toLowerCase()
            )) {
                Alert.alert("Invalid Input", "This passenger type already exists for the selected bus type")
                setLoading(false)
                return
            }

            const newDiscount: Omit<DiscountConfig, "id" | "createdAt"> = {
                passengerType: newDiscountType,
                busType: newDiscountBusType,
                discountPercentage: discountPercentage,
                description: newDiscountDescription,
                active: true,
            }

            const discountId = await saveDiscountConfiguration(newDiscount)

            if (discountId) {
                setDiscounts([
                    ...discounts,
                    {
                        ...newDiscount,
                        id: discountId,
                    },
                ])

                // Reset form
                setNewDiscountType("")
                setNewDiscountPercentage("")
                setNewDiscountDescription("")
                setNewDiscountBusType("Regular")
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

        Alert.alert("Delete Discount", `Delete ${discount.passengerType} (${discount.busType}) discount?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        setLoading(true)
                        const success = await deleteDiscountConfiguration(discount.id!)

                        if (success) {
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
            <View className="items-center justify-center flex-1 bg-emerald-400">
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
                <Text className="text-xl font-bold text-white">Manage Discounts</Text>
                <TouchableOpacity onPress={loadDiscounts} className="p-2">
                    <Ionicons name="refresh" size={24} color="white" />
                </TouchableOpacity>
            </View>

            {error && (
                <View className="p-3 mx-4 mb-4 bg-red-500 rounded-lg">
                    <Text className="text-white">{error}</Text>
                </View>
            )}

            <ScrollView className="flex-1 px-4 pt-2">
                {discounts.length === 0 && !error ? (
                    <View className="items-center p-4 mb-4 bg-white rounded-lg shadow-sm">
                        <Text className="text-center text-gray-500">No discounts found. Add a new discount to get started.</Text>
                    </View>
                ) : (
                    discounts.map((discount) => (
                        <View key={discount.id || `${discount.passengerType}-${discount.busType}`} className="p-4 mb-4 bg-white rounded-lg shadow-sm">
                            {editingDiscount && editingDiscount.id === discount.id ? (
                                // Edit form
                                <View>
                                    <Text className="mb-1 font-medium text-gray-700">Passenger Type</Text>
                                    <TextInput
                                        className="p-3 mb-3 border border-gray-300 rounded-md bg-gray-50"
                                        value={editingDiscount.passengerType}
                                        onChangeText={(text) => setEditingDiscount({ ...editingDiscount, passengerType: text })}
                                        placeholder="Passenger type"
                                    />

                                    <Text className="mb-1 font-medium text-gray-700">Bus Type</Text>
                                    <BusTypeSelector
                                        value={editingDiscount.busType || "Regular"}
                                        onChange={(type) => setEditingDiscount({ ...editingDiscount, busType: type })}
                                    />

                                    <Text className="mb-1 font-medium text-gray-700">Discount Percentage (%)</Text>
                                    <TextInput
                                        className="p-3 mb-3 border border-gray-300 rounded-md bg-gray-50"
                                        value={String(editingDiscount.discountPercentage ?? "")}
                                        onChangeText={(text) =>
                                            setEditingDiscount({ ...editingDiscount, discountPercentage: Number(text) || 0 })
                                        }
                                        placeholder="Discount percentage"
                                        keyboardType="numeric"
                                    />

                                    <Text className="mb-1 font-medium text-gray-700">Description</Text>
                                    <TextInput
                                        className="p-3 mb-3 border border-gray-300 rounded-md bg-gray-50"
                                        value={editingDiscount.description || ""}
                                        onChangeText={(text) => setEditingDiscount({ ...editingDiscount, description: text })}
                                        placeholder="Description"
                                    />

                                    <View className="flex-row justify-between mt-4">
                                        <TouchableOpacity
                                            className="px-4 py-2 bg-gray-300 rounded-lg"
                                            onPress={() => setEditingDiscount(null)}
                                        >
                                            <Text className="text-gray-800">Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity className="px-4 py-2 rounded-lg bg-emerald-500" onPress={handleUpdateDiscount}>
                                            <Text className="text-white">Save</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                // Display view
                                <>
                                    <View className="flex-row items-center justify-between mb-2">
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
                                        <Text className="text-gray-600"> {discount.busType || "Regular"}</Text>
                                        <Text className="text-gray-600">Discount: {discount.discountPercentage}%</Text>
                                        {discount.description && <Text className="mt-1 text-gray-500">{discount.description}</Text>}
                                    </View>

                                    <View className="flex-row justify-end">
                                        <TouchableOpacity
                                            className="flex-row items-center mr-3"
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
                    <View className="p-4 mb-4 bg-white rounded-lg shadow-sm">
                        <Text className="mb-4 text-xl font-bold text-gray-800">Add New Discount</Text>

                        <Text className="mb-1 font-medium text-gray-700">Passenger Type</Text>
                        <TextInput
                            className="p-3 mb-3 border border-gray-300 rounded-md bg-gray-50"
                            value={newDiscountType}
                            onChangeText={setNewDiscountType}
                            placeholder="e.g., Student, Senior Citizen"
                        />

                        <BusTypeSelector value={newDiscountBusType} onChange={setNewDiscountBusType} />

                        <Text className="mb-1 font-medium text-gray-700">Discount Percentage (%)</Text>
                        <TextInput
                            className="p-3 mb-3 border border-gray-300 rounded-md bg-gray-50"
                            value={newDiscountPercentage}
                            onChangeText={setNewDiscountPercentage}
                            placeholder="e.g., 20"
                            keyboardType="numeric"
                        />

                        <Text className="mb-1 font-medium text-gray-700">Description (Optional)</Text>
                        <TextInput
                            className="p-3 mb-3 border border-gray-300 rounded-md bg-gray-50"
                            value={newDiscountDescription}
                            onChangeText={setNewDiscountDescription}
                            placeholder="Description of the discount"
                        />

                        <View className="flex-row justify-between mt-4">
                            <TouchableOpacity className="px-4 py-2 bg-gray-300 rounded-lg" onPress={() => setShowAddForm(false)}>
                                <Text className="text-gray-800">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity className="px-4 py-2 rounded-lg bg-emerald-500" onPress={handleAddDiscount}>
                                <Text className="text-white">Add Discount</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity
                        className="items-center p-4 mb-4 bg-white rounded-lg shadow-sm"
                        onPress={() => setShowAddForm(true)}
                    >
                        <View className="flex-row items-center">
                            <Ionicons name="add-circle-outline" size={24} color="#059669" />
                            <Text className="ml-2 font-medium text-emerald-600">Add New Discount</Text>
                        </View>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </View>
    )
}
