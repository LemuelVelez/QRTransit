// app/conductor/manage-routes.tsx
"use client"

import { useState, useEffect } from "react"
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    StatusBar,
    RefreshControl,
    Switch,
} from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { getCurrentUser } from "@/lib/appwrite"
import { getAllRoutes, updateRoute, deleteRoute, type RouteInfo } from "@/lib/route-service"
import RouteEditModal from "@/components/route-edit-modal"
import BusTypeSelector from "@/components/bus-type-selector" // ✅ ADDED

export default function ManageRoutesScreen() {
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [routes, setRoutes] = useState<RouteInfo[]>([])
    const [conductorId, setConductorId] = useState("")
    const [showEditModal, setShowEditModal] = useState(false)
    const [selectedRoute, setSelectedRoute] = useState<RouteInfo | null>(null)

    const router = useRouter()

    useEffect(() => {
        loadUserAndRoutes()
    }, [])

    const loadUserAndRoutes = async () => {
        try {
            setLoading(true)
            const user = await getCurrentUser()

            if (!user) {
                Alert.alert("Error", "Failed to get user information")
                router.replace("/")
                return
            }

            setConductorId(user.$id || "")
            await loadRoutes(user.$id || "")
        } catch (error) {
            console.error("Error loading user and routes:", error)
            Alert.alert("Error", "Failed to load routes")
        } finally {
            setLoading(false)
        }
    }

    const loadRoutes = async (userId: string) => {
        try {
            const routesList = await getAllRoutes(userId)
            setRoutes(routesList)
        } catch (error) {
            console.error("Error loading routes:", error)
            Alert.alert("Error", "Failed to load routes")
        }
    }

    const handleRefresh = async () => {
        setRefreshing(true)
        await loadRoutes(conductorId)
        setRefreshing(false)
    }

    const handleEditRoute = (route: RouteInfo) => {
        setSelectedRoute(route)
        setShowEditModal(true)
    }

    const handleToggleActive = async (route: RouteInfo) => {
        try {
            if (!route.id) {
                Alert.alert("Error", "Route ID is missing")
                return
            }

            setLoading(true)
            const newActiveStatus = !(route.active === true)

            const success = await updateRoute(route.id, {
                active: newActiveStatus,
            })

            if (success) {
                const updatedRoutes = routes.map((r) => (r.id === route.id ? { ...r, active: newActiveStatus } : r))
                setRoutes(updatedRoutes)
                Alert.alert("Success", `Route ${newActiveStatus ? "activated" : "deactivated"} successfully`)
                await loadRoutes(conductorId)
            } else {
                Alert.alert("Error", "Failed to update route status")
            }
        } catch (error) {
            console.error("Error toggling route status:", error)
            Alert.alert("Error", "Failed to update route status")
        } finally {
            setLoading(false)
        }
    }

    // ✅ ADDED: Persist bus type change
    const handleChangeBusType = async (route: RouteInfo, newType: string) => {
        try {
            if (!route.id) {
                Alert.alert("Error", "Route ID is missing")
                return
            }
            setLoading(true)
            const success = await updateRoute(route.id, { busType: newType })
            if (success) {
                setRoutes(routes.map((r) => (r.id === route.id ? { ...r, busType: newType } : r)))
            } else {
                Alert.alert("Error", "Failed to update bus type")
            }
        } catch (error) {
            console.error("Error updating bus type:", error)
            Alert.alert("Error", "Failed to update bus type")
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteRoute = (route: RouteInfo) => {
        Alert.alert("Delete Route", `Are you sure you want to delete the route from ${route.from} to ${route.to}?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        if (!route.id) {
                            Alert.alert("Error", "Route ID is missing")
                            return
                        }

                        setLoading(true)
                        const success = await deleteRoute(route.id)

                        if (success) {
                            setRoutes(routes.filter((r) => r.id !== route.id))
                            Alert.alert("Success", "Route deleted successfully")
                        } else {
                            Alert.alert("Error", "Failed to delete route")
                        }
                    } catch (error) {
                        console.error("Error deleting route:", error)
                        Alert.alert("Error", "Failed to delete route")
                    } finally {
                        setLoading(false)
                    }
                },
            },
        ])
    }

    const handleUpdateRoute = async (updatedRoute: RouteInfo) => {
        try {
            if (!updatedRoute.id) {
                Alert.alert("Error", "Route ID is missing")
                return
            }

            setLoading(true)
            const success = await updateRoute(updatedRoute.id, {
                from: updatedRoute.from,
                to: updatedRoute.to,
                busNumber: updatedRoute.busNumber,
                busType: updatedRoute.busType, // typed in RouteInfo & supported in route-service
                active: updatedRoute.active,
            })

            if (success) {
                setRoutes(routes.map((r) => (r.id === updatedRoute.id ? updatedRoute : r)))
                setShowEditModal(false)
                Alert.alert("Success", "Route updated successfully")
                await loadRoutes(conductorId)
            } else {
                Alert.alert("Error", "Failed to update route")
            }
        } catch (error) {
            console.error("Error updating route:", error)
            Alert.alert("Error", "Failed to update route")
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    if (loading) {
        return (
            <View className="items-center justify-center flex-1 bg-emerald-400">
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
                <ActivityIndicator size="large" color="white" />
                <Text className="mt-4 text-white">Loading routes...</Text>
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
                <Text className="text-xl font-bold text-white">Manage Routes</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView
                className="flex-1 px-4 pt-2"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#059669"]} />}
            >
                {routes.length === 0 ? (
                    <View className="items-center justify-center p-6 my-4 bg-white rounded-lg">
                        <Ionicons name="bus-outline" size={48} color="#059669" />
                        <Text className="mt-4 text-lg text-center text-gray-700">You haven't set up any routes yet</Text>
                        <TouchableOpacity
                            className="px-6 py-3 mt-4 rounded-lg bg-emerald-500"
                            onPress={() => router.push("/conductor/route-setup" as any)}
                        >
                            <Text className="font-bold text-white">Set Up a Route</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    routes.map((route, index) => (
                        <View key={route.id || index} className="p-4 mb-4 bg-white rounded-lg shadow-sm">
                            <View className="flex-row items-center justify-between mb-2">
                                <View className="flex-row items-center">
                                    <Switch
                                        value={route.active === true}
                                        onValueChange={() => handleToggleActive(route)}
                                        trackColor={{ false: "#d1d5db", true: "#10b981" }}
                                        thumbColor="#ffffff"
                                        disabled={loading}
                                    />
                                    <Text className="ml-2 text-gray-500">{route.active === true ? "Active" : "Inactive"}</Text>
                                </View>
                                <Text className="text-xs text-gray-500">{formatDate(route.timestamp)}</Text>
                            </View>

                            <View className="mb-3">
                                <Text className="text-lg font-bold text-gray-800">
                                    {route.from} → {route.to}
                                </Text>
                                <Text className="text-gray-600">Bus #{route.busNumber} • {route.busType || "Regular"}</Text>
                            </View>

                            {/* ✅ ADDED: Inline bus type selector per route */}
                            <View className="mb-3">
                                <BusTypeSelector
                                    value={route.busType || "Regular"}
                                    onChange={(t) => handleChangeBusType(route, t)}
                                />
                            </View>

                            <View className="flex-row justify-end">
                                <TouchableOpacity className="flex-row items-center mr-3" onPress={() => handleEditRoute(route)}>
                                    <Ionicons name="create-outline" size={18} color="#059669" />
                                    <Text className="ml-1 text-emerald-600">Edit</Text>
                                </TouchableOpacity>

                                <TouchableOpacity className="flex-row items-center" onPress={() => handleDeleteRoute(route)}>
                                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                                    <Text className="ml-1 text-red-500">Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            {/* Add Route Button */}
            <TouchableOpacity
                className="absolute items-center justify-center rounded-full shadow-lg bottom-6 right-6 bg-emerald-600 w-14 h-14"
                onPress={() => router.push("/conductor/route-setup" as any)}
            >
                <Ionicons name="add" size={30} color="white" />
            </TouchableOpacity>

            {/* Edit Modal */}
            {selectedRoute && (
                <RouteEditModal
                    visible={showEditModal}
                    route={selectedRoute}
                    onClose={() => setShowEditModal(false)}
                    onSave={handleUpdateRoute}
                />
            )}
        </View>
    )
}
