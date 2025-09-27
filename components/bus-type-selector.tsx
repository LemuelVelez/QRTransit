// components/bus-type-selector.tsx
"use client"

import React, { useEffect, useState, useCallback } from "react"
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { getFareConfigurations } from "@/lib/fare-service"

type Props = {
  value: string
  onChange: (next: string) => void
}

export default function BusTypeSelector({ value, onChange }: Props) {
  const [loading, setLoading] = useState(true)
  const [types, setTypes] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // 🔎 Pull bus types from Fare configurations ONLY (no conductor filters anywhere)
      const fares = await getFareConfigurations()

      // Collect all non-empty busType labels from fares
      const names = (fares || [])
        .map((f) => String(f.busType || "").trim())
        .filter((n) => n.length > 0)

      // Deduplicate case-insensitively
      const seen = new Set<string>()
      const deduped = names.filter((n) => {
        const k = n.toLowerCase()
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })

      // ⛔ Do NOT inject any placeholder like "Regular"
      const list = [...deduped].sort((a, b) => a.localeCompare(b))

      setTypes(list)

      // Auto-select a valid value if current one is not present
      const hasCurrent = list.some((t) => t.toLowerCase() === String(value || "").toLowerCase())
      if (list.length > 0 && !hasCurrent) onChange(list[0])
      // If no data, keep current as-is (likely empty)
    } catch (e: any) {
      console.warn("BusTypeSelector: failed to load bus types from fares.", e?.message || e)
      setTypes([])
      setError("Failed to load bus types.")
    } finally {
      setLoading(false)
    }
  }, [onChange, value])

  useEffect(() => {
    load()
  }, [load])

  return (
    <View className="mb-3">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-lg font-bold text-white">Bus Type</Text>
        <TouchableOpacity
          onPress={load}
          className="p-1"
          accessibilityRole="button"
          accessibilityLabel="Reload bus types"
        >
          <Ionicons name="refresh" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="items-center justify-center p-3 bg-white rounded-md">
          <ActivityIndicator size="small" />
          <Text className="mt-2 text-gray-500">Loading available bus types…</Text>
        </View>
      ) : types.length === 0 ? (
        <View className="p-3 bg-white rounded-md">
          <Text className="italic text-gray-700">
            No available bus types — contact the admin to create.
          </Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          {types.map((t) => {
            const selected = String(value).toLowerCase() === t.toLowerCase()
            return (
              <TouchableOpacity
                key={t}
                onPress={() => onChange(t)}
                className={`px-4 py-2 mr-2 rounded-full border ${
                  selected ? "bg-white border-white" : "bg-emerald-600 border-white/40"
                }`}
              >
                <Text className={selected ? "text-emerald-700 font-bold" : "text-white font-semibold"}>
                  {t}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}

      {error && !loading && (
        <View className="p-2 mt-2 rounded bg-yellow-50">
          <Text className="text-xs text-yellow-700">{error}</Text>
        </View>
      )}
    </View>
  )
}
