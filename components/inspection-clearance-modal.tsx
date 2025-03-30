"use client"

import { useState, useRef, useEffect } from "react"
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, Animated } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import InspectorLocationInput from "@/components/inspector-location-input"

interface InspectionClearanceModalProps {
    visible: boolean
    onClose: () => void
    onSubmit: (inspectionFrom: string, inspectionTo: string) => void
    isLoading: boolean
    routeFrom: string
    routeTo: string
    routeStops?: string[] // Added routeStops prop
}

export default function InspectionClearanceModal({
    visible,
    onClose,
    onSubmit,
    isLoading,
    routeFrom,
    routeTo,
    routeStops = [],
}: InspectionClearanceModalProps) {
    const [inspectionFrom, setInspectionFrom] = useState(routeFrom)
    const [inspectionTo, setInspectionTo] = useState(routeTo)
    const [validationError, setValidationError] = useState<string | null>(null)
    const scaleAnim = useRef(new Animated.Value(0.9)).current
    const opacityAnim = useRef(new Animated.Value(0)).current

    // Reset form when modal opens
    useEffect(() => {
        if (visible) {
            setInspectionFrom(routeFrom)
            setInspectionTo(routeTo)
            setValidationError(null)

            Animated.parallel([
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start()
        } else {
            // Reset animations when modal is hidden
            scaleAnim.setValue(0.9)
            opacityAnim.setValue(0)
        }
    }, [visible, routeFrom, routeTo])

    const validateLocations = (): boolean => {
        setValidationError(null)

        if (!inspectionFrom || !inspectionTo) {
            setValidationError("Both inspection locations are required")
            return false
        }

        // If routeStops are provided, validate that locations are in the route
        if (routeStops.length > 0) {
            const fromIndex = routeStops.indexOf(inspectionFrom)
            const toIndex = routeStops.indexOf(inspectionTo)

            if (fromIndex === -1 || toIndex === -1) {
                setValidationError("Inspection locations must be valid stops on the route")
                return false
            }

            if (fromIndex > toIndex) {
                setValidationError("Inspection 'From' must come before 'To' on the route")
                return false
            }
        }

        return true
    }

    const handleSubmit = () => {
        if (validateLocations()) {
            onSubmit(inspectionFrom, inspectionTo)
        }
    }

    return (
        <Modal visible={visible} transparent={true} animationType="fade">
            <View className="flex-1 justify-center items-center bg-black/50">
                <Animated.View
                    className="bg-white w-[90%] max-w-md rounded-2xl p-5 shadow-xl"
                    style={{
                        opacity: opacityAnim,
                        transform: [{ scale: scaleAnim }],
                    }}
                >
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-xl font-bold text-gray-800">Clear Bus Inspection</Text>
                        <TouchableOpacity
                            onPress={onClose}
                            disabled={isLoading}
                            className="bg-gray-100 rounded-full p-1"
                            accessibilityLabel="Close clearance modal"
                        >
                            <Ionicons name="close" size={22} color="#3b82f6" />
                        </TouchableOpacity>
                    </View>

                    <View className="bg-green-50 rounded-lg p-3 mb-4">
                        <Text className="text-green-700">
                            Please specify the "from" and "to" locations of your inspection before clearing this bus.
                        </Text>
                    </View>

                    {/* Show validation error if any */}
                    {validationError && (
                        <View className="bg-red-50 rounded-lg p-3 mb-4">
                            <Text className="text-red-600">{validationError}</Text>
                        </View>
                    )}

                    {/* Show available stops if provided */}
                    {routeStops.length > 0 && (
                        <View className="bg-blue-50 rounded-lg p-3 mb-4">
                            <Text className="text-blue-700 font-medium mb-1">Available stops on this route:</Text>
                            <Text className="text-blue-600">{routeStops.join(" → ")}</Text>
                        </View>
                    )}

                    <InspectorLocationInput
                        label="Inspection From"
                        value={inspectionFrom}
                        onChange={setInspectionFrom}
                        placeholder="Enter starting point"
                        iconName="location-outline"
                    />

                    <InspectorLocationInput
                        label="Inspection To"
                        value={inspectionTo}
                        onChange={setInspectionTo}
                        placeholder="Enter destination"
                        iconName="flag-outline"
                    />

                    <View className="flex-row justify-end mt-5">
                        <TouchableOpacity
                            className="bg-gray-200 py-2.5 px-5 rounded-lg mr-3"
                            onPress={onClose}
                            disabled={isLoading}
                            accessibilityLabel="Cancel"
                        >
                            <Text className="text-gray-800 font-medium">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`py-2.5 px-5 rounded-lg ${isLoading || !inspectionFrom || !inspectionTo ? "bg-green-300" : "bg-green-600"
                                }`}
                            onPress={handleSubmit}
                            disabled={isLoading || !inspectionFrom || !inspectionTo}
                            accessibilityLabel="Clear bus"
                            accessibilityState={{ disabled: isLoading || !inspectionFrom || !inspectionTo }}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Text className="text-white font-medium">Clear Bus</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    )
}

