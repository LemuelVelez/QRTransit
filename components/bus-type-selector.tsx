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
    const [types, setTypes] = useState<string[]>(["Regular"]) // fallback while loading

    const load = useCallback(async () => {
        setLoading(true)
        try {
            // Read REAL data from the Bus Types collection (EXPO_PUBLIC_APPWRITE_BUS_TYPE_COLLECTION_ID)
            const configs = await getBusTypeConfigurations()

            // Keep only active types, dedupe (case-insensitive), and tidy names
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

            // If no data from backend, retain only "Regular"
            const list = deduped.length > 0 ? deduped : ["Regular"]

            // Prefer "Regular" first if present
            list.sort((a, b) =>
                a.toLowerCase() === "regular" ? -1 : b.toLowerCase() === "regular" ? 1 : a.localeCompare(b),
            )

            setTypes(list)

            // Ensure current selection is valid
            const hasCurrent = list.some((t) => t.toLowerCase() === String(value || "").toLowerCase())
            if (!hasCurrent) onChange(list[0])
        } catch (e) {
            console.warn("BusTypeSelector: failed to load bus types, using fallback.", e)
            setTypes(["Regular"])
            if (String(value).toLowerCase() !== "regular") onChange("Regular")
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
            ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                    {types.map((t) => {
                        const selected = String(value).toLowerCase() === t.toLowerCase()
                        return (
                            <TouchableOpacity
                                key={t}
                                onPress={() => onChange(t)}
                                className={`px-4 py-2 mr-2 rounded-full border ${selected ? "bg-white border-white" : "bg-emerald-600 border-white/40"
                                    }`}
                            >
                                <Text className={`${selected ? "text-emerald-700 font-bold" : "text-white font-semibold"}`}>{t}</Text>
                            </TouchableOpacity>
                        )
                    })}
                </ScrollView>
            )}
        </View>
    )
}
