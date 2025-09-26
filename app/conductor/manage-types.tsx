// app/conductor/manage-types.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
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

/** ✅ Use FARE COLLECTION for Bus Types (follow manage-fares logic) */
import {
  getFareConfigurations,
  updateFareConfiguration,
  type FareConfig,
} from "@/lib/fare-service"

type BusTypeItem = { name: string; count: number }

export default function ManageTypesScreen() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [conductorId, setConductorId] = useState("")

  // Passenger types (unchanged business logic)
  const [allConfigs, setAllConfigs] = useState<DiscountConfig[]>([])
  const [showAddPassenger, setShowAddPassenger] = useState(false)
  const [newPassengerType, setNewPassengerType] = useState("")
  const [newPassengerDiscount, setNewPassengerDiscount] = useState("")
  const [editingPassenger, setEditingPassenger] = useState<DiscountConfig | null>(null)

  // Bus types (purely derived from fare collection; no uplift here)
  const [busTypes, setBusTypes] = useState<BusTypeItem[]>([])
  const [busOpsLoading, setBusOpsLoading] = useState(false)
  const [editingBusOriginal, setEditingBusOriginal] = useState<string | null>(null)
  const [editingBusName, setEditingBusName] = useState<string>("")

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
        if (user) setConductorId(user.$id || "")
        await loadAll()
      } catch (err) {
        console.error("Error checking access:", err)
        Alert.alert("Error", "Failed to verify access permissions.")
        router.replace("/")
      }
    }
    checkAccess()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadBusTypesFromFares = useCallback(async () => {
    try {
      const fares = await getFareConfigurations()
      const map = new Map<string, number>()
      for (const f of fares) {
        const key = (f.busType || "Regular").trim()
        map.set(key, (map.get(key) || 0) + 1)
      }
      if (!map.has("Regular")) map.set("Regular", 0)

      const list: BusTypeItem[] = Array.from(map.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => {
          const ar = a.name.toLowerCase() === "regular"
          const br = b.name.toLowerCase() === "regular"
          if (ar && !br) return -1
          if (!ar && br) return 1
          return a.name.localeCompare(b.name)
        })
      setBusTypes(list)
    } catch (e) {
      console.error("Failed to load bus types from fares:", e)
      setBusTypes([{ name: "Regular", count: 0 }])
    }
  }, [])

  const loadAll = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const configs = await getDiscountConfigurations()
      setAllConfigs(configs)
      await loadBusTypesFromFares()
    } catch (e) {
      console.error("Error loading types:", e)
      setError("Failed to load configurations. Please check your Appwrite setup.")
    } finally {
      setLoading(false)
    }
  }, [loadBusTypesFromFares])

  // ---------------- Passenger logic (unchanged) ----------------
  const passengerTypes = allConfigs.filter((c) => !c.busType)

  const togglePassengerActive = async (cfg: DiscountConfig) => {
    if (!cfg.id) return
    try {
      setLoading(true)
      const ok = await updateDiscountConfiguration(cfg.id, { active: !cfg.active })
      if (ok) {
        setAllConfigs((cur) => cur.map((d) => (d.id === cfg.id ? { ...d, active: !cfg.active } : d)))
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
        discountPercentage: String(pct),
        description: editingPassenger.description,
        active: editingPassenger.active,
      })
      if (ok) {
        setAllConfigs((cur) => cur.map((d) => (d.id === editingPassenger.id ? { ...editingPassenger } : d)))
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
        discountPercentage: String(pct),
        description: "",
        active: true,
      })
      if (id) {
        setAllConfigs((cur) => [
          ...cur,
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
            if (ok) setAllConfigs((cur) => cur.filter((d) => d.id !== cfg.id))
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

  // ---------------- Bus Types (vertical UI; FARE-based) ----------------
  const renameBusType = (oldName: string) => {
    setEditingBusOriginal(oldName)
    setEditingBusName(oldName)
  }
  const cancelRenameBus = () => {
    setEditingBusOriginal(null)
    setEditingBusName("")
  }
  const applyRenameBusType = async () => {
    const oldName = editingBusOriginal?.trim() || ""
    const newName = editingBusName.trim()
    if (!oldName) return
    if (!newName) {
      Alert.alert("Invalid Input", "Bus type name cannot be empty.")
      return
    }
    if (oldName.toLowerCase() === newName.toLowerCase()) {
      cancelRenameBus()
      return
    }
    try {
      setBusOpsLoading(true)
      const fares = await getFareConfigurations()
      const targets = fares.filter((f) => (f.busType || "Regular").trim().toLowerCase() === oldName.toLowerCase())
      for (const row of targets) {
        if (!row.id) continue
        await updateFareConfiguration(row.id, { busType: newName })
      }
      await loadBusTypesFromFares()
      cancelRenameBus()
      Alert.alert("Success", `Bus type “${oldName}” has been renamed to “${newName}”.`)
    } catch (e) {
      console.error("Rename bus type failed:", e)
      Alert.alert("Error", "Failed to rename bus type.")
    } finally {
      setBusOpsLoading(false)
    }
  }

  const reassignBusTypeToRegular = (name: string) => {
    Alert.alert(
      "Reassign Bus Type",
      `Reassign all fares using “${name}” to “Regular”? This updates those fares' busType field.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reassign",
          style: "destructive",
          onPress: async () => {
            try {
              setBusOpsLoading(true)
              const fares = await getFareConfigurations()
              const targets = fares.filter(
                (f) => (f.busType || "Regular").trim().toLowerCase() === name.toLowerCase()
              )
              for (const row of targets) {
                if (!row.id) continue
                await updateFareConfiguration(row.id, { busType: "Regular" })
              }
              await loadBusTypesFromFares()
              Alert.alert("Done", `“${name}” fares were reassigned to “Regular”.`)
            } catch (e) {
              console.error("Reassign bus type failed:", e)
              Alert.alert("Error", "Failed to reassign bus type.")
            } finally {
              setBusOpsLoading(false)
            }
          },
        },
      ]
    )
  }

  if (loading) {
    return (
      <View className="items-center justify-center flex-1 bg-emerald-400">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <ActivityIndicator size="large" color="white" />
        <Text className="mt-4 text-white">Loading types...</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-emerald-400">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header — keep compact but stacked-friendly */}
      <View className="px-4 pt-16 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="self-start p-2">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="mt-2 text-2xl font-bold text-center text-white">Passenger & Bus Types</Text>
        <TouchableOpacity onPress={loadAll} className="self-end p-2 mt-2">
          <Ionicons name="refresh" size={22} color="white" />
        </TouchableOpacity>
      </View>

      {error && (
        <View className="p-3 mx-4 mb-4 bg-red-500 rounded-lg">
          <Text className="text-white">{error}</Text>
        </View>
      )}

      <ScrollView className="flex-1 px-4 pt-2" contentContainerStyle={{ paddingBottom: 28 }}>
        {/* ---------------- Passenger Types (vertical layout) ---------------- */}
        <View className="p-4 mb-4 bg-white rounded-lg shadow-sm">
          <Text className="mb-2 text-lg font-bold text-gray-800">Passenger Types (Discount %)</Text>

          <TouchableOpacity
            onPress={() => setShowAddPassenger((s) => !s)}
            className="items-center w-full py-3 mb-3 border rounded-lg border-emerald-500 active:opacity-90"
          >
            <Text className="font-medium text-emerald-600">
              {showAddPassenger ? "Hide Add Passenger Type" : "Add Passenger Type"}
            </Text>
          </TouchableOpacity>

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

              <TouchableOpacity className="items-center justify-center w-full py-3 mb-2 rounded-lg bg-emerald-500" onPress={addPassenger}>
                <Text className="font-semibold text-white">Add</Text>
              </TouchableOpacity>
              <TouchableOpacity className="items-center justify-center w-full py-3 bg-gray-200 rounded-lg" onPress={() => setShowAddPassenger(false)}>
                <Text className="font-medium text-gray-800">Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {passengerTypes.length === 0 ? (
            <Text className="italic text-gray-500">No passenger types yet.</Text>
          ) : (
            passengerTypes.map((discount) => (
              <View key={discount.id || discount.passengerType} className="p-3 mb-3 border border-gray-200 rounded-md">
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
                      onChangeText={(text) => setEditingPassenger({ ...editingPassenger, discountPercentage: String(Number(text) || 0) })}
                      placeholder="Discount percentage"
                      keyboardType="numeric"
                    />

                    <TouchableOpacity className="items-center justify-center w-full py-3 mb-2 rounded-lg bg-emerald-500" onPress={savePassengerEdit}>
                      <Text className="font-semibold text-white">Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="items-center justify-center w-full py-3 bg-gray-200 rounded-lg" onPress={() => setEditingPassenger(null)}>
                      <Text className="font-medium text-gray-800">Cancel</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {/* Status toggle (top) */}
                    <View className="items-start">
                      <View className="flex-row items-center">
                        <Switch
                          value={discount.active}
                          onValueChange={() => togglePassengerActive(discount)}
                          trackColor={{ false: "#d1d5db", true: "#10b981" }}
                          thumbColor="#ffffff"
                        />
                        <Text className="ml-2 text-gray-500">{discount.active ? "Active" : "Inactive"}</Text>
                      </View>
                    </View>

                    {/* Details (middle) */}
                    <View className="mt-2">
                      <Text className="text-lg font-bold text-gray-800">{discount.passengerType}</Text>
                      <Text className="text-gray-600">Discount: {discount.discountPercentage}%</Text>
                    </View>

                    {/* Actions (stacked) */}
                    <TouchableOpacity className="flex-row items-center justify-center w-full py-3 mt-3 mb-2 border rounded-lg border-emerald-500" onPress={() => setEditingPassenger({ ...discount })}>
                      <Ionicons name="create-outline" size={18} color="#059669" />
                      <Text className="ml-1 font-medium text-emerald-600">Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-row items-center justify-center w-full py-3 border border-red-500 rounded-lg" onPress={() => deletePassenger(discount)}>
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      <Text className="ml-1 font-medium text-red-500">Delete</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ))
          )}
        </View>

        {/* ---------------- Bus Types (vertical layout; comes from fares) ---------------- */}
        <View className="p-4 mb-6 bg-white rounded-lg shadow-sm">
          <Text className="mb-2 text-lg font-bold text-gray-800">Bus Types</Text>

          <Text className="mb-3 text-[13px] text-gray-600">
            Bus types are taken from your <Text style={{ fontWeight: "700" }}>Fare Configurations</Text>. Add or remove a bus
            type by creating, editing, or deleting a fare in <Text style={{ fontWeight: "700" }}>Manage Fares</Text>.
          </Text>

          <TouchableOpacity onPress={() => router.push({ pathname: "/conductor/manage-fares" as any })} className="items-center w-full py-3 mb-3 border rounded-lg border-emerald-500 active:opacity-90">
            <View className="flex-row items-center">
              <Ionicons name="calculator-outline" size={18} color="#059669" />
              <Text className="ml-1 font-medium text-emerald-600">Open Manage Fares</Text>
            </View>
          </TouchableOpacity>

          {busOpsLoading && (
            <View className="flex-row items-center p-2 mb-2 rounded bg-emerald-50">
              <ActivityIndicator size="small" />
              <Text className="ml-2 text-emerald-700">Applying changes to fares…</Text>
            </View>
          )}

          {busTypes.length === 0 ? (
            <Text className="italic text-gray-500">No bus types yet.</Text>
          ) : (
            busTypes.map((bt) => {
              const isEditing = editingBusOriginal?.toLowerCase() === bt.name.toLowerCase()
              return (
                <View key={bt.name} className="p-3 mb-3 border border-gray-200 rounded-md">
                  {!isEditing ? (
                    <>
                      {/* Details stacked */}
                      <Text className="text-lg font-bold text-gray-800">{bt.name}</Text>
                      <Text className="mt-1 text-gray-600">{bt.count} fare{bt.count === 1 ? "" : "s"}</Text>

                      {/* Actions stacked */}
                      <TouchableOpacity className="flex-row items-center justify-center w-full py-3 mt-3 mb-2 border rounded-lg border-emerald-500" onPress={() => renameBusType(bt.name)}>
                        <Ionicons name="create-outline" size={18} color="#059669" />
                        <Text className="ml-1 font-medium text-emerald-600">Rename</Text>
                      </TouchableOpacity>

                      {bt.name.toLowerCase() !== "regular" && (
                        <TouchableOpacity className="flex-row items-center justify-center w-full py-3 border border-red-500 rounded-lg" onPress={() => reassignBusTypeToRegular(bt.name)}>
                          <Ionicons name="trash-outline" size={18} color="#ef4444" />
                          <Text className="ml-1 font-medium text-red-500">Reassign to Regular</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  ) : (
                    <>
                      <Text className="mb-1 font-medium text-gray-700">Rename “{editingBusOriginal}”</Text>
                      <TextInput
                        className="p-3 mb-3 border border-gray-300 rounded-md bg-gray-50"
                        value={editingBusName}
                        onChangeText={setEditingBusName}
                        placeholder="New bus type name"
                      />

                      <TouchableOpacity className="items-center justify-center w-full py-3 mb-2 rounded-lg bg-emerald-500" onPress={applyRenameBusType}>
                        <Text className="font-semibold text-white">Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity className="items-center justify-center w-full py-3 bg-gray-200 rounded-lg" onPress={cancelRenameBus}>
                        <Text className="font-medium text-gray-800">Cancel</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )
            })
          )}
        </View>
      </ScrollView>
    </View>
  )
}
