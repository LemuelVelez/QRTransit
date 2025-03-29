"use client"

import { View, Text, TouchableOpacity, Modal, FlatList, Animated } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRef, useEffect } from "react"

interface LocationFilterModalProps {
    visible: boolean
    onClose: () => void
    onSelectLocation: (location: string | null) => void
    locations: string[]
    currentFilter: string | null
}

export default function LocationFilterModal({
    visible,
    onClose,
    onSelectLocation,
    locations,
    currentFilter,
}: LocationFilterModalProps) {
    const scaleAnim = useRef(new Animated.Value(0.9)).current
    const opacityAnim = useRef(new Animated.Value(0)).current

    useEffect(() => {
        if (visible) {
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
    }, [visible])

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
                        <Text className="text-xl font-bold text-gray-800">Filter by Location</Text>
                        <TouchableOpacity
                            onPress={onClose}
                            className="bg-gray-100 rounded-full p-1"
                            accessibilityLabel="Close filter modal"
                        >
                            <Ionicons name="close" size={22} color="#3b82f6" />
                        </TouchableOpacity>
                    </View>

                    <View className="bg-blue-50 rounded-lg p-3 mb-4">
                        <Text className="text-blue-700">
                            Select a location to filter passengers who boarded from this location onward or are heading beyond this
                            location.
                        </Text>
                    </View>

                    <FlatList
                        data={locations}
                        keyExtractor={(item) => item}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                className={`p-3.5 mb-2 rounded-xl ${currentFilter === item ? "bg-blue-100 border border-blue-300" : "bg-gray-50 border border-gray-200"
                                    }`}
                                onPress={() => onSelectLocation(item)}
                                accessibilityLabel={`Filter by ${item}`}
                                accessibilityState={{ selected: currentFilter === item }}
                            >
                                <View className="flex-row items-center justify-between">
                                    <Text
                                        className={`${currentFilter === item ? "text-blue-700 font-medium" : "text-gray-700"} text-base`}
                                    >
                                        {item}
                                    </Text>
                                    {currentFilter === item && <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />}
                                </View>
                            </TouchableOpacity>
                        )}
                        ListHeaderComponent={
                            <TouchableOpacity
                                className={`p-3.5 mb-2 rounded-xl ${currentFilter === null ? "bg-blue-100 border border-blue-300" : "bg-gray-50 border border-gray-200"
                                    }`}
                                onPress={() => onSelectLocation(null)}
                                accessibilityLabel="Show all passengers"
                                accessibilityState={{ selected: currentFilter === null }}
                            >
                                <View className="flex-row items-center justify-between">
                                    <Text
                                        className={`${currentFilter === null ? "text-blue-700 font-medium" : "text-gray-700"} text-base`}
                                    >
                                        Show All Passengers
                                    </Text>
                                    {currentFilter === null && <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />}
                                </View>
                            </TouchableOpacity>
                        }
                        style={{ maxHeight: 300 }}
                    />
                </Animated.View>
            </View>
        </Modal>
    )
}

