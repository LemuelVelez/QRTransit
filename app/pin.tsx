import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function PinEntryScreen() {
    const [pin, setPin] = useState<string>('');

    const handleNumberPress = (number: string) => {
        if (pin.length < 4) {
            setPin(pin + number);
        }
    };

    const handleDelete = () => {
        setPin(pin.slice(0, -1));
    };

    const renderDots = () => {
        return (
            <View className="flex-row justify-center">
                {[0, 1, 2, 3].map((i) => (
                    <View
                        key={i}
                        className={`w-5 h-5 rounded-full mx-4 ${i < pin.length ? 'bg-white' : 'bg-white/50'
                            }`}
                    />
                ))}
            </View>
        );
    };

    return (
        // Removed justify-between to have more control over positioning
        <View className="flex-1 bg-green-400 items-center">
            {/* Logo */}
            <View className="mt-32 w-full max-w-sm items-center">
                {/* Logo Circle */}
                <View className="w-24 h-24 bg-green-700 rounded-full justify-center items-center overflow-hidden">
                    <Image
                        source={require("../assets/images/QuickRide.png")}
                        className="w-24 h-24 object-contain"
                    />
                </View>
            </View>

            {/* PIN Entry Area */}
            <View className="items-center mt-24">
                <Text className="text-3xl text-black mb-8">Enter your PIN</Text>
                {renderDots()}
            </View>
            {/* Keypad - Positioned at bottom with reduced height */}
            <View className="absolute bottom-2 w-full px-2">
                <View className="bg-white rounded-b-3xl pt-2 pb-1">
                    <View className="flex-row flex-wrap justify-between mx-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
                            <TouchableOpacity
                                key={number}
                                className="w-[30%] h-16 justify-center items-center mb-1"
                                onPress={() => handleNumberPress(number.toString())}
                            >
                                <Text className="text-2xl text-black">{number}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity className="w-[30%] h-12 justify-center items-center">
                            <Text className="text-2xl text-black"></Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="w-[30%] h-12 justify-center items-center mb-1"
                            onPress={() => handleNumberPress('0')}
                        >
                            <Text className="text-2xl text-black">0</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="w-[30%] h-12 justify-center items-center mb-1"
                            onPress={handleDelete}
                        >
                            <MaterialCommunityIcons name="backspace-outline" size={24} color="black" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
}