// app/conductor/manage-types.tsx
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

export default function ManageTypesScreen() {
    const [loading, setLoading] = useState(true)
    const [allConfigs, setAllConfigs] = useState<DiscountConfig[]>([])
    const [conductorId, setConductorId] = useState("")
    const [error, setError] = useState<string | null>(null)

    // Add/edit Passenger Type
    const [showAddPassenger, setShowAddPassenger] = useState(false)
    const [newPassengerType, setNewPassengerType] = useState("")
    const [newPassengerDiscount, setNewPassengerDiscount] = useState("")
    const [editingPassenger, setEditingPassenger] = useState<DiscountConfig | null>(null)

    // Add/edit Bus Type
    const [showAddBusType, setShowAddBusType] = useState(false)
    const [newBusType, setNewBusType] = useState("")
    const [newBusUplift, setNewBusUplift] = useState("")
    const [editingBusType, setEditingBusType] = useState<DiscountConfig | null>(null)

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
                    await loadAll()
                }
            } catch (error) {
                console.error("Error checking access:", error)
                Alert.alert("Error", "Failed to verify access permissions.")
                router.replace("/")
            }
        }
        checkAccess()
    }, [])

    const loadAll = async () => {
        try {
            setLoading(true)
            setError(null)
            const configs = await getDiscountConfigurations()
            setAllConfigs(configs)
            if (configs.length === 0) setError("No types found.")
        } catch (e) {
            console.error("Error loading types:", e)
            setError("Failed to load configurations. Please check your Appwrite setup.")
        } finally {
            setLoading(false)
        }
    }

    // Split views WITHOUT using passengerType === "BASE"
    const passengerTypes = allConfigs.filter((c) => !c.busType)
    const busTypeRules = allConfigs.filter((c) => !!c.busType)

    // --- Passenger actions ---
    const togglePassengerActive = async (cfg: DiscountConfig) => {
        if (!cfg.id) return
        try {
            setLoading(true)
            const ok = await updateDiscountConfiguration(cfg.id, { active: !cfg.active })
            if (ok) {
                setAllConfigs(allConfigs.map((d) => (d.id === cfg.id ? { ...d, active: !cfg.active } : d)))
            } else {
                Alert.alert("Error", "Failed to update status")
            }
        } catch (e) {
            console.error(e)
            Alert.alert("Error", "Failed to update status")
        } finally {
            setLoading(false)
        }
    }

    const savePassengerEdit = async () => {
        if (!editingPassenger || !editingPassenger.id) return
        const pct = Number(editingPassenger.discountPercentage)
        if (isNaN(pct) || pct < 0 || pct > 100) {
            Alert.alert("Invalid Input", "Discount percentage must be between 0 and 100")
            return
        }
        if (!editingPassenger.passengerType) {
            Alert.alert("Invalid Input", "Passenger type is required")
            return
        }
        try {
            setLoading(true)
            const ok = await updateDiscountConfiguration(editingPassenger.id, {
                passengerType: editingPassenger.passengerType,
                // ✅ No busType field saved for passenger discounts
                discountPercentage: String(pct),
                description: editingPassenger.description,
                active: editingPassenger.active,
            })
            if (ok) {
                setAllConfigs(allConfigs.map((d) => (d.id === editingPassenger.id ? { ...editingPassenger } : d)))
                setEditingPassenger(null)
            } else {
                Alert.alert("Error", "Failed to save")
            }
        } catch (e) {
            console.error(e)
            Alert.alert("Error", "Failed to save")
        } finally {
            setLoading(false)
        }
    }

    const addPassenger = async () => {
        const pct = Number(newPassengerDiscount)
        if (!newPassengerType.trim()) {
            Alert.alert("Invalid Input", "Passenger type is required")
            return
        }
        if (isNaN(pct) || pct < 0 || pct > 100) {
            Alert.alert("Invalid Input", "Discount percentage must be between 0 and 100")
            return
        }
        if (passengerTypes.some((p) => (p.passengerType || "").toLowerCase() === newPassengerType.toLowerCase())) {
            Alert.alert("Invalid Input", "This passenger type already exists")
            return
        }
        try {
            setLoading(true)
            const id = await saveDiscountConfiguration({
                passengerType: newPassengerType.trim(),
                // ✅ No busType field on passenger save
                discountPercentage: String(pct),
                description: "",
                active: true,
            })
            if (id) {
                setAllConfigs([
                    ...allConfigs,
                    { id, passengerType: newPassengerType.trim(), discountPercentage: String(pct), description: "", active: true },
                ])
                setNewPassengerType("")
                setNewPassengerDiscount("")
                setShowAddPassenger(false)
            } else {
                Alert.alert("Error", "Failed to add")
            }
        } catch (e) {
            console.error(e)
            Alert.alert("Error", "Failed to add")
        } finally {
            setLoading(false)
        }
    }

    const deletePassenger = (cfg: DiscountConfig) => {
        if (!cfg.id) return
        Alert.alert("Delete Passenger Type", `Delete “${cfg.passengerType}”?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        setLoading(true)
                        const ok = await deleteDiscountConfiguration(cfg.id!)
                        if (ok) setAllConfigs(allConfigs.filter((d) => d.id !== cfg.id))
                        else Alert.alert("Error", "Failed to delete")
                    } catch (e) {
                        console.error(e)
                        Alert.alert("Error", "Failed to delete")
                    } finally {
                        setLoading(false)
                    }
                },
            },
        ])
    }

    // --- Bus type actions (uplift %) ---
    const toggleBusActive = async (cfg: DiscountConfig) => {
        if (!cfg.id) return
        try {
            setLoading(true)
            const ok = await updateDiscountConfiguration(cfg.id, { active: !cfg.active })
            if (ok) {
                setAllConfigs(allConfigs.map((d) => (d.id === cfg.id ? { ...d, active: !cfg.active } : d)))
            } else {
                Alert.alert("Error", "Failed to update status")
            }
        } catch (e) {
            console.error(e)
            Alert.alert("Error", "Failed to update status")
        } finally {
            setLoading(false)
        }
    }

    const saveBusEdit = async () => {
        if (!editingBusType || !editingBusType.id) return
        const pct = Number(editingBusType.discountPercentage)
        if (isNaN(pct) || pct < 0 || pct > 100) {
            Alert.alert("Invalid Input", "Uplift percentage must be between 0 and 100")
            return
        }
        if (!editingBusType.busType) {
            Alert.alert("Invalid Input", "Bus type is required")
            return
        }
        try {
            setLoading(true)
            const ok = await updateDiscountConfiguration(editingBusType.id, {
                // 🚫 Removed passengerType: "BASE"
                busType: editingBusType.busType,
                discountPercentage: String(pct),
                description: editingBusType.description,
                active: editingBusType.active,
            })
            if (ok) {
                setAllConfigs(allConfigs.map((d) => (d.id === editingBusType.id ? { ...editingBusType } : d)))
                setEditingBusType(null)
            } else {
                Alert.alert("Error", "Failed to save")
            }
        } catch (e) {
            console.error(e)
            Alert.alert("Error", "Failed to save")
        } finally {
            setLoading(false)
        }
    }

    const addBusType = async () => {
        const pct = Number(newBusUplift)
        const name = newBusType.trim()
        if (!name) {
            Alert.alert("Invalid Input", "Bus type is required")
            return
        }
        if (isNaN(pct) || pct < 0 || pct > 100) {
            Alert.alert("Invalid Input", "Uplift percentage must be between 0 and 100")
            return
        }
        if (busTypeRules.some((b) => (b.busType || "").toLowerCase() === name.toLowerCase())) {
            Alert.alert("Invalid Input", "This bus type already exists")
            return
        }
        try {
            setLoading(true)
            const id = await saveDiscountConfiguration({
                // 🚫 Removed passengerType: "BASE"
                busType: name,
                discountPercentage: String(pct),
                description: "",
                active: true,
            } as any) // cast to allow busType-only payload
            if (id) {
                setAllConfigs([
                    ...allConfigs,
                    {
                        id,
                        // keep passengerType empty (no "BASE")
                        passengerType: "",
                        busType: name,
                        discountPercentage: String(pct),
                        description: "",
                        active: true,
                    } as DiscountConfig,
                ])
                setNewBusType("")
                setNewBusUplift("")
                setShowAddBusType(false)
            } else {
                Alert.alert("Error", "Failed to add")
            }
        } catch (e) {
            console.error(e)
            Alert.alert("Error", "Failed to add")
        } finally {
            setLoading(false)
        }
    }

    // ✅ Missing function added: delete a Bus Type (separate collection)
    const deleteBusType = (cfg: DiscountConfig) => {
        if (!cfg.id) return
        Alert.alert("Delete Bus Type", `Delete bus type “${cfg.busType}”?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        setLoading(true)
                        const ok = await deleteDiscountConfiguration(cfg.id!)
                        if (ok) setAllConfigs(allConfigs.filter((d) => d.id !== cfg.id))
                        else Alert.alert("Error", "Failed to delete")
                    } catch (e) {
                        console.error(e)
                        Alert.alert("Error", "Failed to delete")
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
                <Text className="mt-4 text-white">Loading types...</Text>
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
                <Text className="text-xl font-bold text-white">Passenger & Bus Types</Text>
                <TouchableOpacity onPress={loadAll} className="p-2">
                    <Ionicons name="refresh" size={24} color="white" />
                </TouchableOpacity>
            </View>

            {error && (
                <View className="p-3 mx-4 mb-4 bg-red-500 rounded-lg">
                    <Text className="text-white">{error}</Text>
                </View>
            )}

            <ScrollView className="flex-1 px-4 pt-2">
                {/* Passenger Types Section */}
                <View className="p-4 mb-4 bg-white rounded-lg shadow-sm">
                    <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-lg font-bold text-gray-800">Passenger Types (Discount %)</Text>
                        <TouchableOpacity onPress={() => setShowAddPassenger((s) => !s)}>
                            <Ionicons name={showAddPassenger ? "remove-circle-outline" : "add-circle-outline"} size={22} color="#059669" />
                        </TouchableOpacity>
                    </View>

                    {showAddPassenger && (
                        <View className="p-3 mb-3 rounded-md bg-gray-50">
                            <Text className="mb-1 font-medium text-gray-700">Passenger Type</Text>
                            <TextInput
                                className="p-3 mb-2 bg-white border border-gray-300 rounded-md"
                                value={newPassengerType}
                                onChangeText={setNewPassengerType}
                                placeholder="e.g., Student, Senior Citizen"
                            />
                            <Text className="mb-1 font-medium text-gray-700">Discount Percentage (%)</Text>
                            <TextInput
                                className="p-3 mb-3 bg-white border border-gray-300 rounded-md"
                                value={newPassengerDiscount}
                                onChangeText={setNewPassengerDiscount}
                                placeholder="e.g., 20"
                                keyboardType="numeric"
                            />
                            <View className="flex-row justify-end">
                                <TouchableOpacity className="px-4 py-2 mr-2 bg-gray-300 rounded-lg" onPress={() => setShowAddPassenger(false)}>
                                    <Text className="text-gray-800">Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity className="px-4 py-2 rounded-lg bg-emerald-500" onPress={addPassenger}>
                                    <Text className="text-white">Add</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {passengerTypes.length === 0 ? (
                        <Text className="italic text-gray-500">No passenger types yet.</Text>
                    ) : (
                        passengerTypes.map((discount) => (
                            <View key={discount.id || discount.passengerType} className="p-3 mb-2 border border-gray-200 rounded-md">
                                {editingPassenger && editingPassenger.id === discount.id ? (
                                    <>
                                        <Text className="mb-1 font-medium text-gray-700">Passenger Type</Text>
                                        <TextInput
                                            className="p-3 mb-2 border border-gray-300 rounded-md bg-gray-50"
                                            value={editingPassenger.passengerType}
                                            onChangeText={(text) => setEditingPassenger({ ...editingPassenger, passengerType: text })}
                                            placeholder="Passenger type"
                                        />
                                        <Text className="mb-1 font-medium text-gray-700">Discount Percentage (%)</Text>
                                        <TextInput
                                            className="p-3 mb-3 border border-gray-300 rounded-md bg-gray-50"
                                            value={String(editingPassenger.discountPercentage ?? "")}
                                            onChangeText={(text) =>
                                                setEditingPassenger({ ...editingPassenger, discountPercentage: String(Number(text) || 0) })
                                            }
                                            placeholder="Discount percentage"
                                            keyboardType="numeric"
                                        />
                                        <View className="flex-row justify-between mt-2">
                                            <TouchableOpacity className="px-4 py-2 bg-gray-300 rounded-lg" onPress={() => setEditingPassenger(null)}>
                                                <Text className="text-gray-800">Cancel</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity className="px-4 py-2 rounded-lg bg-emerald-500" onPress={savePassengerEdit}>
                                                <Text className="text-white">Save</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                ) : (
                                    <>
                                        <View className="flex-row items-center justify-between">
                                            <View className="flex-row items-center">
                                                <Switch
                                                    value={discount.active}
                                                    onValueChange={() => togglePassengerActive(discount)}
                                                    trackColor={{ false: "#d1d5db", true: "#10b981" }}
                                                    thumbColor="#ffffff"
                                                />
                                                <Text className="ml-2 text-gray-500">{discount.active ? "Active" : "Inactive"}</Text>
                                            </View>
                                            {/* No busType badge for passenger discounts */}
                                        </View>
                                        <View className="mt-2">
                                            <Text className="text-lg font-bold text-gray-800">{discount.passengerType}</Text>
                                            <Text className="text-gray-600">Discount: {discount.discountPercentage}%</Text>
                                        </View>
                                        <View className="flex-row justify-end mt-2">
                                            <TouchableOpacity className="flex-row items-center mr-3" onPress={() => setEditingPassenger({ ...discount })}>
                                                <Ionicons name="create-outline" size={18} color="#059669" />
                                                <Text className="ml-1 text-emerald-600">Edit</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity className="flex-row items-center" onPress={() => deletePassenger(discount)}>
                                                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                                                <Text className="ml-1 text-red-500">Delete</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                )}
                            </View>
                        ))
                    )}
                </View>

                {/* Bus Types Section */}
                <View className="p-4 mb-6 bg-white rounded-lg shadow-sm">
                    <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-lg font-bold text-gray-800">Bus Types (Uplift %)</Text>
                        <TouchableOpacity onPress={() => setShowAddBusType((s) => !s)}>
                            <Ionicons name={showAddBusType ? "remove-circle-outline" : "add-circle-outline"} size={22} color="#059669" />
                        </TouchableOpacity>
                    </View>

                    {showAddBusType && (
                        <View className="p-3 mb-3 rounded-md bg-gray-50">
                            <Text className="mb-1 font-medium text-gray-700">Bus Type</Text>
                            <TextInput
                                className="p-3 mb-2 bg-white border border-gray-300 rounded-md"
                                value={newBusType}
                                onChangeText={setNewBusType}
                                placeholder='e.g., "Regular", "Air-Conditioned", "Deluxe"'
                            />
                            <Text className="mb-1 font-medium text-gray-700">Uplift Percentage (%)</Text>
                            <TextInput
                                className="p-3 mb-3 bg-white border border-gray-300 rounded-md"
                                value={newBusUplift}
                                onChangeText={setNewBusUplift}
                                placeholder="e.g., 20 (means +20%)"
                                keyboardType="numeric"
                            />
                            <View className="flex-row justify-end">
                                <TouchableOpacity className="px-4 py-2 mr-2 bg-gray-300 rounded-lg" onPress={() => setShowAddBusType(false)}>
                                    <Text className="text-gray-800">Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity className="px-4 py-2 rounded-lg bg-emerald-500" onPress={addBusType}>
                                    <Text className="text-white">Add</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {busTypeRules.length === 0 ? (
                        <Text className="italic text-gray-500">No bus types yet.</Text>
                    ) : (
                        busTypeRules.map((cfg) => (
                            <View key={cfg.id || cfg.busType} className="p-3 mb-2 border border-gray-200 rounded-md">
                                {editingBusType && editingBusType.id === cfg.id ? (
                                    <>
                                        <Text className="mb-1 font-medium text-gray-700">Bus Type</Text>
                                        <TextInput
                                            className="p-3 mb-2 border border-gray-300 rounded-md bg-gray-50"
                                            value={editingBusType.busType}
                                            onChangeText={(text) => setEditingBusType({ ...editingBusType, busType: text })}
                                            placeholder="Bus type"
                                        />
                                        <Text className="mb-1 font-medium text-gray-700">Uplift Percentage (%)</Text>
                                        <TextInput
                                            className="p-3 mb-3 border border-gray-300 rounded-md bg-gray-50"
                                            value={String(editingBusType.discountPercentage ?? "")}
                                            onChangeText={(text) =>
                                                setEditingBusType({ ...editingBusType, discountPercentage: String(Number(text) || 0) })
                                            }
                                            placeholder="Uplift percentage"
                                            keyboardType="numeric"
                                        />
                                        <View className="flex-row justify-between mt-2">
                                            <TouchableOpacity className="px-4 py-2 bg-gray-300 rounded-lg" onPress={() => setEditingBusType(null)}>
                                                <Text className="text-gray-800">Cancel</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity className="px-4 py-2 rounded-lg bg-emerald-500" onPress={saveBusEdit}>
                                                <Text className="text-white">Save</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                ) : (
                                    <>
                                        <View className="flex-row items-center justify-between">
                                            <View className="flex-row items-center">
                                                <Switch
                                                    value={cfg.active}
                                                    onValueChange={() => toggleBusActive(cfg)}
                                                    trackColor={{ false: "#d1d5db", true: "#10b981" }}
                                                    thumbColor="#ffffff"
                                                />
                                                <Text className="ml-2 text-gray-500">{cfg.active ? "Active" : "Inactive"}</Text>
                                            </View>
                                            {/* 🚫 Removed BASE badge */}
                                        </View>
                                        <View className="mt-2">
                                            <Text className="text-lg font-bold text-gray-800">{cfg.busType}</Text>
                                            <Text className="text-gray-600">Uplift: +{cfg.discountPercentage}%</Text>
                                        </View>
                                        <View className="flex-row justify-end mt-2">
                                            <TouchableOpacity className="flex-row items-center mr-3" onPress={() => setEditingBusType({ ...cfg })}>
                                                <Ionicons name="create-outline" size={18} color="#059669" />
                                                <Text className="ml-1 text-emerald-600">Edit</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity className="flex-row items-center" onPress={() => deleteBusType(cfg)}>
                                                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                                                <Text className="ml-1 text-red-500">Delete</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                )}
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    )
}
