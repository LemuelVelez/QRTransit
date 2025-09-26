// components/bus-type-selector.tsx
"use client"

import React, { useEffect, useState, useCallback } from "react"
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { getBusTypeConfigurations } from "@/lib/discount-service"

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
            const configs = await getBusTypeConfigurations()

            const names = (configs || [])
                .filter((c) => c?.busType && c.active)
                .map((c) => String(c.busType).trim())
                .filter(Boolean)

            const seen = new Set<string>()
            const deduped = names.filter((n) => {
                const key = n.toLowerCase()
                if (seen.has(key)) return false
                seen.add(key)
                return true
            })

            // ⛔ Do not inject any placeholder like "Regular"
            const list = deduped

            // Sort alphabetically
            list.sort((a, b) => a.localeCompare(b))

            setTypes(list)

            // If we have real data and current value isn't present, select the first available
            const hasCurrent = list.some((t) => t.toLowerCase() === String(value || "").toLowerCase())
            if (list.length > 0 && !hasCurrent) onChange(list[0])
            // If no data, keep current value as-is (likely empty)
        } catch (e: any) {
            console.warn("BusTypeSelector: failed to load bus types.", e?.message || e)
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
                <TouchableOpacity onPress={load} className="p-1" accessibilityRole="button" accessibilityLabel="Reload bus types">
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
                                className={`px-4 py-2 mr-2 rounded-full border ${selected ? "bg-white border-white" : "bg-emerald-600 border-white/40"}`}
                            >
                                <Text className={`${selected ? "text-emerald-700 font-bold" : "text-white font-semibold"}`}>{t}</Text>
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
