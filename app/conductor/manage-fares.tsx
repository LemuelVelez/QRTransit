// app/conductor/manage-fares.tsx
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
  getFareConfigurations,
  updateFareConfiguration,
  saveFareConfiguration,
  deleteFareConfiguration,
  type FareConfig,
} from "@/lib/fare-service"

// Simple vertical spacer to guarantee consistent spacing across RN Tailwind setups
function VSpace({ size = 12 }: { size?: number }) {
  return <View style={{ height: size }} />
}

export default function ManageFaresScreen() {
  const [loading, setLoading] = useState(true)
  const [allConfigs, setAllConfigs] = useState<FareConfig[]>([])
  const [conductorId, setConductorId] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Add/edit Fare
  const [showAddFare, setShowAddFare] = useState(false)
  const [newFareAmount, setNewFareAmount] = useState("")
  const [newKilometer, setNewKilometer] = useState("")
  const [editingFare, setEditingFare] = useState<FareConfig | null>(null)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadAll = async () => {
    try {
      setLoading(true)
      setError(null)
      const configs = await getFareConfigurations()
      const sorted = configs.sort(
        (a, b) => parseFloat(a.kilometer) - parseFloat(b.kilometer)
      )
      setAllConfigs(sorted)
      if (configs.length === 0) setError("No fare configurations found.")
    } catch (e) {
      console.error("Error loading fares:", e)
      setError("Failed to load fare configurations. Please check your Appwrite setup.")
    } finally {
      setLoading(false)
    }
  }

  const toggleFareActive = async (cfg: FareConfig) => {
    if (!cfg.id) return
    try {
      setLoading(true)
      const ok = await updateFareConfiguration(cfg.id, { active: !cfg.active })
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

  const saveFareEdit = async () => {
    if (!editingFare || !editingFare.id) return
    const fareAmount = Number(editingFare.fare)
    const km = Number(editingFare.kilometer)
    if (isNaN(fareAmount) || fareAmount <= 0) {
      Alert.alert("Invalid Input", "Fare amount must be greater than 0")
      return
    }
    if (isNaN(km) || km <= 0) {
      Alert.alert("Invalid Input", "Kilometer must be greater than 0")
      return
    }
    try {
      setLoading(true)
      const ok = await updateFareConfiguration(editingFare.id, {
        fare: String(fareAmount),
        kilometer: String(km),
        description: editingFare.description,
        active: editingFare.active,
      })
      if (ok) {
        setAllConfigs(allConfigs.map((d) => (d.id === editingFare.id ? { ...editingFare } : d)))
        setEditingFare(null)
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

  const addFare = async () => {
    const fareAmount = Number(newFareAmount)
    const km = Number(newKilometer)
    if (isNaN(fareAmount) || fareAmount <= 0) {
      Alert.alert("Invalid Input", "Fare amount must be greater than 0")
      return
    }
    if (isNaN(km) || km <= 0) {
      Alert.alert("Invalid Input", "Kilometer must be greater than 0")
      return
    }
    if (allConfigs.some((f) => parseFloat(f.kilometer) === km)) {
      Alert.alert("Invalid Input", "A fare configuration for this distance already exists")
      return
    }
    try {
      setLoading(true)
      const id = await saveFareConfiguration({
        fare: String(fareAmount),
        kilometer: String(km),
        description: "",
        active: true,
      })
      if (id) {
        const newConfig = {
          id,
          fare: String(fareAmount),
          kilometer: String(km),
          description: "",
          active: true,
        }
        setAllConfigs(
          [...allConfigs, newConfig].sort(
            (a, b) => parseFloat(a.kilometer) - parseFloat(b.kilometer)
          )
        )
        setNewFareAmount("")
        setNewKilometer("")
        setShowAddFare(false)
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

  const deleteFare = (cfg: FareConfig) => {
    if (!cfg.id) return
    Alert.alert("Delete Fare Configuration", `Delete fare for ${cfg.kilometer} km (₱${cfg.fare})?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true)
            const ok = await deleteFareConfiguration(cfg.id!)
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
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <ActivityIndicator size="large" color="white" />
        <Text className="mt-4 text-white">Loading fare configurations...</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-emerald-400">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View className="px-4 pt-16 pb-8">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center self-start">
          <Ionicons name="arrow-back" size={22} color="white" />
          <Text className="ml-2 text-white">Back</Text>
        </TouchableOpacity>

        <VSpace size={10} />

        <Text className="text-2xl font-bold text-center text-white">Manage Fares</Text>

        <VSpace size={12} />

        <TouchableOpacity
          onPress={loadAll}
          className="flex-row items-center justify-center w-full py-4 rounded-lg bg-emerald-600 active:opacity-90"
        >
          <Ionicons name="refresh" size={18} color="white" />
          <Text className="ml-2 font-medium text-white">Refresh</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View className="p-3 mx-4 mb-4 bg-red-500 rounded-lg">
          <Text className="text-white">{error}</Text>
        </View>
      )}

      <ScrollView
        className="flex-1 px-4"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        {/* Fare Configs Card */}
        <View className="p-5 bg-white rounded-lg shadow-sm">
          <Text className="text-lg font-bold text-gray-800">
            Fare Configurations (Distance → Amount)
          </Text>

          <VSpace size={12} />

          <TouchableOpacity
            onPress={() => setShowAddFare((s) => !s)}
            className="flex-row items-center justify-center w-full py-4 border rounded-lg border-emerald-500"
          >
            <Ionicons
              name={showAddFare ? "remove-circle-outline" : "add-circle-outline"}
              size={18}
              color="#059669"
            />
            <Text className="ml-2 font-medium text-emerald-600">
              {showAddFare ? "Hide Add Fare" : "Add Fare"}
            </Text>
          </TouchableOpacity>

          {showAddFare && (
            <>
              <VSpace size={12} />
              <View className="p-3 rounded-md bg-gray-50">
                <Text className="mb-1 font-medium text-gray-700">Distance (Kilometers)</Text>
                <TextInput
                  className="p-3 bg-white border border-gray-300 rounded-md"
                  value={newKilometer}
                  onChangeText={setNewKilometer}
                  placeholder="e.g., 1, 5, 10"
                  keyboardType="numeric"
                />

                <VSpace size={12} />

                <Text className="mb-1 font-medium text-gray-700">Fare Amount (₱)</Text>
                <TextInput
                  className="p-3 bg-white border border-gray-300 rounded-md"
                  value={newFareAmount}
                  onChangeText={setNewFareAmount}
                  placeholder="e.g., 15, 25, 50"
                  keyboardType="numeric"
                />

                <VSpace size={12} />

                <TouchableOpacity
                  className="items-center justify-center w-full py-4 rounded-lg bg-emerald-500"
                  onPress={addFare}
                >
                  <Text className="font-semibold text-white">Add</Text>
                </TouchableOpacity>

                <VSpace size={10} />

                <TouchableOpacity
                  className="items-center justify-center w-full py-4 bg-gray-200 rounded-lg"
                  onPress={() => setShowAddFare(false)}
                >
                  <Text className="font-medium text-gray-800">Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {allConfigs.length === 0 ? (
            <>
              <VSpace size={12} />
              <Text className="italic text-gray-500">No fare configurations yet.</Text>
            </>
          ) : (
            <>
              <VSpace size={12} />
              {allConfigs.map((fareConfig, idx) => (
                <View
                  key={fareConfig.id || fareConfig.kilometer}
                  className="p-3 border border-gray-200 rounded-md"
                  style={{ marginBottom: idx === allConfigs.length - 1 ? 0 : 12 }}
                >
                  {editingFare && editingFare.id === fareConfig.id ? (
                    <>
                      <Text className="mb-1 font-medium text-gray-700">Distance (Kilometers)</Text>
                      <TextInput
                        className="p-3 border border-gray-300 rounded-md bg-gray-50"
                        value={editingFare.kilometer}
                        onChangeText={(text) =>
                          setEditingFare({ ...editingFare, kilometer: text })
                        }
                        placeholder="Distance in km"
                        keyboardType="numeric"
                      />

                      <VSpace size={12} />

                      <Text className="mb-1 font-medium text-gray-700">Fare Amount (₱)</Text>
                      <TextInput
                        className="p-3 border border-gray-300 rounded-md bg-gray-50"
                        value={String(editingFare.fare ?? "")}
                        onChangeText={(text) => setEditingFare({ ...editingFare, fare: text })}
                        placeholder="Fare amount"
                        keyboardType="numeric"
                      />

                      <VSpace size={14} />

                      <TouchableOpacity
                        className="items-center justify-center w-full py-4 rounded-lg bg-emerald-500"
                        onPress={saveFareEdit}
                      >
                        <Text className="font-semibold text-white">Save</Text>
                      </TouchableOpacity>

                      <VSpace size={12} />

                      <TouchableOpacity
                        className="items-center justify-center w-full py-4 bg-gray-200 rounded-lg"
                        onPress={() => setEditingFare(null)}
                      >
                        <Text className="font-medium text-gray-800">Cancel</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      {/* Status */}
                      <View className="flex-row items-center">
                        <Switch
                          value={fareConfig.active}
                          onValueChange={() => toggleFareActive(fareConfig)}
                          trackColor={{ false: "#d1d5db", true: "#10b981" }}
                          thumbColor="#ffffff"
                        />
                        <Text className="ml-2 text-gray-600">
                          {fareConfig.active ? "Active" : "Inactive"}
                        </Text>
                      </View>

                      <VSpace size={8} />

                      <View className="self-start px-3 py-1 rounded-full bg-emerald-100">
                        <Text className="text-xs text-emerald-600">Distance-Based</Text>
                      </View>

                      <VSpace size={12} />

                      <Text className="text-lg font-bold text-gray-800">
                        {fareConfig.kilometer} km → ₱{fareConfig.fare}
                      </Text>
                      <Text className="text-gray-600">
                        Base fare for trips up to {fareConfig.kilometer} kilometers
                      </Text>

                      {/* Actions: guaranteed vertical spacing between Edit & Delete */}
                      <VSpace size={14} />

                      <TouchableOpacity
                        className="flex-row items-center justify-center w-full py-4 border rounded-lg border-emerald-500"
                        onPress={() => setEditingFare({ ...fareConfig })}
                      >
                        <Ionicons name="create-outline" size={18} color="#059669" />
                        <Text className="ml-2 font-medium text-emerald-600">Edit</Text>
                      </TouchableOpacity>

                      <VSpace size={12} />

                      <TouchableOpacity
                        className="flex-row items-center justify-center w-full py-4 border border-red-500 rounded-lg"
                        onPress={() => deleteFare(fareConfig)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                        <Text className="ml-2 font-medium text-red-500">Delete</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              ))}
            </>
          )}
        </View>

        <VSpace size={16} />

        {/* Help Card */}
        <View className="p-5 bg-white rounded-lg shadow-sm">
          <Text className="text-lg font-bold text-gray-800">How Fare Calculation Works</Text>

          <VSpace size={10} />

          <Text className="text-gray-600">• Configure base fares for different distance ranges</Text>
          <VSpace size={6} />
          <Text className="text-gray-600">• System finds the best matching range for each trip</Text>
          <VSpace size={6} />
          <Text className="text-gray-600">
            • Passenger discounts and bus type uplifts are applied on top
          </Text>
          <VSpace size={6} />
          <Text className="text-gray-600">
            • For distances beyond the configured range, proportional rates apply
          </Text>
        </View>

        <VSpace size={20} />
      </ScrollView>
    </View>
  )
}
