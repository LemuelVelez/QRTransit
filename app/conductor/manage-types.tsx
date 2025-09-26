// app/conductor/manage-types.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { getCurrentUser, checkRoutePermission } from "@/lib/appwrite"
import {
  getDiscountConfigurations,
  type DiscountConfig,
} from "@/lib/discount-service"

/** ✅ Use FARE COLLECTION for Bus Types (follow manage-fares logic) */
import {
  getFareConfigurations,
  type FareConfig,
} from "@/lib/fare-service"

type BusTypeItem = { name: string; count: number }

export default function ManageTypesScreen() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Passenger types (read-only)
  const [allConfigs, setAllConfigs] = useState<DiscountConfig[]>([])

  // Bus types (purely derived from fare collection; no fallback/placeholder)
  const [busTypes, setBusTypes] = useState<BusTypeItem[]>([])
  const [busOpsLoading, setBusOpsLoading] = useState(false)

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
        if (!user) {
          Alert.alert("Error", "Failed to verify current user.")
          router.replace("/")
          return
        }
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
      setBusOpsLoading(true)
      const fares: FareConfig[] = await getFareConfigurations()
      const map = new Map<string, number>()
      for (const f of fares) {
        const key = (f.busType || "").trim()
        if (!key) continue // 🚫 no placeholder "Regular"
        map.set(key, (map.get(key) || 0) + 1)
      }
      const list: BusTypeItem[] = Array.from(map.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name))
      setBusTypes(list)
    } catch (e) {
      console.error("Failed to load bus types from fares:", e)
      setBusTypes([])
    } finally {
      setBusOpsLoading(false)
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

  const passengerTypes = allConfigs.filter((c) => !c.busType)

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

      {/* Header */}
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
        {/* ---------------- Passenger Types (READ-ONLY) ---------------- */}
        <View className="p-4 mb-4 bg-white rounded-lg shadow-sm">
          <Text className="mb-2 text-lg font-bold text-gray-800">Passenger Types (Discount %)</Text>

          {passengerTypes.length === 0 ? (
            <Text className="italic text-gray-600">
              No passenger types available. Please tell the admin to create one.
            </Text>
          ) : (
            passengerTypes
              .sort((a, b) => (a.passengerType || "").localeCompare(b.passengerType || ""))
              .map((discount) => (
                <View key={discount.id || discount.passengerType} className="p-3 mb-3 border border-gray-200 rounded-md">
                  <Text className="text-lg font-bold text-gray-800">{discount.passengerType}</Text>
                  <Text className="text-gray-600">Discount: {discount.discountPercentage}%</Text>
                  {!!discount.description && (
                    <Text className="mt-1 text-[13px] text-gray-500">{discount.description}</Text>
                  )}
                </View>
              ))
          )}
        </View>

        {/* ---------------- Bus Types (READ-ONLY; from fares) ---------------- */}
        <View className="p-4 mb-6 bg-white rounded-lg shadow-sm">
          <Text className="mb-2 text-lg font-bold text-gray-800">Bus Types</Text>

          <TouchableOpacity
            onPress={() => router.push({ pathname: "/conductor/manage-fares" as any })}
            className="items-center w-full py-3 mb-3 border rounded-lg border-emerald-500 active:opacity-90"
          >
            <View className="flex-row items-center">
              <Ionicons name="calculator-outline" size={18} color="#059669" />
              <Text className="ml-1 font-medium text-emerald-600">Open Manage Fares</Text>
            </View>
          </TouchableOpacity>

          {busOpsLoading && (
            <View className="flex-row items-center p-2 mb-2 rounded bg-emerald-50">
              <ActivityIndicator size="small" />
              <Text className="ml-2 text-emerald-700">Loading bus types…</Text>
            </View>
          )}

          {busTypes.length === 0 ? (
            <Text className="italic text-gray-600">
              No bus types available. Please tell the admin to create one in Manage Fares.
            </Text>
          ) : (
            busTypes.map((bt) => (
              <View key={bt.name} className="p-3 mb-3 border border-gray-200 rounded-md">
                <Text className="text-lg font-bold text-gray-800">{bt.name}</Text>
                <Text className="mt-1 text-gray-600">{bt.count} fare{bt.count === 1 ? "" : "s"}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  )
}
