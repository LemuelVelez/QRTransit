
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getBusTypeConfigurations } from "@/lib/discount-service";
import { ReactElement, JSXElementConstructor, ReactNode } from "react";

interface BusTypeSelectorProps {
    value: string;
    onChange: (type: string) => void;
}

type BusTypeConfig = {
    busType: string;
    active?: boolean | number | string;
};

// Preferred order (no Premium)
const CANONICAL_ORDER = ["Regular", "Air-Conditioned", "Deluxe"] as const;
type CanonicalBusType = (typeof CANONICAL_ORDER)[number];

// Normalize incoming labels from backend
function normalizeBusType(raw: string): CanonicalBusType | string {
    const s = (raw ?? "").toString().trim().toLowerCase();

    // Air-Conditioned variants
    if (
        s === "ac" ||
        s === "a/c" ||
        s === "aircon" ||
        s === "air-con" ||
        s === "air con" ||
        s === "air conditioned" ||
        s === "air-conditioned" ||
        (s.includes("air") && (s.includes("con") || s.includes("condition")))
    ) {
        return "Air-Conditioned";
    }

    if (s === "regular") return "Regular";
    if (s === "deluxe") return "Deluxe";

    // Map any premium-ish value so we can filter it out later
    if (s === "premium" || s.includes("premium")) return "Premium";

    // keep custom types visible as-is
    return raw;
}

function uniqueOrderedList(input: string[]): string[] {
    const seen = new Set<string>();

    const normalized = input
        .map(normalizeBusType)
        .filter(Boolean)
        // Remove Premium completely
        .filter((x) => x !== "Premium")
        .filter((x) => {
            const key = x!.toString();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }) as string[];

    // ✅ Ensure all three canonical types are present at least once
    for (const c of CANONICAL_ORDER) {
        if (!normalized.includes(c)) normalized.push(c);
    }

    // Order canonicals first, then others alphabetically
    const canonicalsIn = CANONICAL_ORDER.filter((c) => normalized.includes(c));
    const others = normalized
        .filter((x) => !CANONICAL_ORDER.includes(x as CanonicalBusType))
        .sort((a, b) => a.localeCompare(b));

    return [...canonicalsIn, ...others];
}

export default function BusTypeSelector({ value, onChange }: BusTypeSelectorProps) {
    const [showDropdown, setShowDropdown] = useState(false);
    const [busTypes, setBusTypes] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch once on mount
    useEffect(() => {
        let cancelled = false;

        async function fetchBusTypes() {
            try {
                setLoading(true);
                setError(null);

                const configs = (await getBusTypeConfigurations()) as BusTypeConfig[] | undefined;

                const typesRaw =
                    configs
                        ?.filter((c) => {
                            const v = c.active;
                            return (
                                v === true ||
                                v === 1 ||
                                v === "1" ||
                                (typeof v === "string" && v.toLowerCase() === "true")
                            );
                        })
                        .map((c) => c.busType) ?? [];

                const finalList = uniqueOrderedList(typesRaw);

                if (!cancelled) {
                    setBusTypes(finalList);
                    if (finalList.length > 0 && !finalList.includes(value)) {
                        onChange(finalList[0]);
                    }
                }
            } catch (e) {
                console.error("Error fetching bus types:", e);
                const fallback = uniqueOrderedList(["Regular", "Air-Conditioned", "Deluxe"]); // no Premium
                if (!cancelled) {
                    setError("Failed to load bus types");
                    setBusTypes(fallback);
                    if (!fallback.includes(value)) onChange(fallback[0]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchBusTypes();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Ensure the current value is displayed in canonical form if applicable
    const displayValue = useMemo(() => normalizeBusType(value), [value]);

    const handleSelect = (type: string) => {
        onChange(type);
        setShowDropdown(false);
    };

    return (
        <View style={styles.container}>
            {/* tap-outside overlay (approximate area above/below) */}
            {showDropdown && (
                <Pressable
                    onPress={() => setShowDropdown(false)}
                    style={styles.overlay}
                    android_ripple={{ color: "transparent" }}
                />
            )}

            <Text style={styles.label}>Bus Type</Text>

            {loading ? (
                <View style={[styles.selector, styles.selectorDisabled]}>
                    <Text style={styles.selectorText}>Loading bus types...</Text>
                    <ActivityIndicator size="small" />
                </View>
            ) : (
                <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.selector}
                    onPress={() => setShowDropdown((s: any) => !s)}
                    accessibilityRole="button"
                    accessibilityLabel="Select bus type"
                >
                    <View style={styles.selectorLeft}>
                        <Ionicons name="bus-outline" size={20} color="#059669" />
                        <Text style={styles.selectorText}>
                            {displayValue ? String(displayValue) : "Select a bus type"}
                        </Text>
                    </View>
                    <Ionicons
                        name={showDropdown ? "chevron-up" : "chevron-down"}
                        size={22}
                        color="#111827"
                    />
                </TouchableOpacity>
            )}

            {!!error && !loading && (
                <Text style={styles.errorText}>Using fallback types. {error}</Text>
            )}

            {showDropdown && (
                <View style={styles.dropdown}>
                    {busTypes.length > 0 ? (
                        busTypes.map(
                            (
                                type:
                                    | string
                                    | number
                                    | boolean
                                    | ReactElement<any, string | JSXElementConstructor<any>>
                                    | Iterable<ReactNode>
                                    | null
                                    | undefined,
                                index: number
                            ) => (
                                <TouchableOpacity
                                    key={`${type}-${index}`}
                                    activeOpacity={0.7}
                                    onPress={() => handleSelect(type as string)}
                                    style={[
                                        styles.option,
                                        index < busTypes.length - 1 && styles.optionBorder,
                                    ]}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Choose ${type}`}
                                >
                                    <View style={styles.optionRow}>
                                        <Ionicons name="bus-outline" size={20} color="#059669" />
                                        <Text style={styles.optionText}>{type}</Text>
                                    </View>
                                </TouchableOpacity>
                            )
                        )
                    ) : (
                        <View style={styles.empty}>
                            <Text style={styles.emptyText}>
                                No bus types available. Please create bus type configurations first.
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: "relative",
        marginBottom: 16,
    },
    label: {
        marginBottom: 6,
        fontWeight: "600",
        color: "#374151", // gray-700
        fontSize: 14,
    },
    selector: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        paddingHorizontal: 12,
        paddingVertical: Platform.select({ ios: 12, android: 10, default: 12 }),
        borderWidth: 1,
        borderColor: "#D1D5DB", // gray-300
        borderRadius: 8,
        backgroundColor: "#F9FAFB", // gray-50
    },
    selectorDisabled: {
        opacity: 0.9,
    },
    selectorLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    selectorText: {
        marginLeft: 8,
        fontSize: 14,
        color: "#111827", // gray-900
    },
    errorText: {
        marginTop: 4,
        fontSize: 12,
        color: "#EF4444", // red-500
    },
    dropdown: {
        position: "absolute",
        zIndex: 20,
        top: "100%",
        left: 0,
        right: 0,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderTopWidth: 0,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
    },
    option: {
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    optionBorder: {
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB", // gray-200
    },
    optionRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    optionText: {
        marginLeft: 8,
        fontSize: 14,
        color: "#111827",
    },
    empty: {
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    emptyText: {
        fontStyle: "italic",
        color: "#6B7280", // gray-500
        fontSize: 13,
    },
    // crude full-screen-ish overlay so taps outside will close the dropdown
    overlay: {
        position: "absolute",
        zIndex: 10,
        left: -24,
        right: -24,
        top: -300,
        height: 1200,
        backgroundColor: "transparent",
    },
});
