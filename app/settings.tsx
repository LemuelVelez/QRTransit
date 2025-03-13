"use client"

import { View, Text, TouchableOpacity, SafeAreaView, Switch, ScrollView, StatusBar } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useNavigation } from "@react-navigation/native"
import { useState } from "react"

const Settings = () => {
    const navigation = useNavigation()
    const [notificationsEnabled, setNotificationsEnabled] = useState(true)
    const [darkModeEnabled, setDarkModeEnabled] = useState(false)
    const [locationEnabled, setLocationEnabled] = useState(true)

    return (
        <SafeAreaView className="flex-1 bg-emerald-200">
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
            {/* Header */}
            <View className="bg-emerald-200 mt-12 p-4 flex-row items-center">
                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
                    <Icon name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text className="text-black text-xl font-semibold">Settings</Text>
            </View>

            <ScrollView className="flex-1">
                {/* Account Section */}
                <View className="p-4">
                    <Text className="text-emerald-900 font-bold text-lg mb-2">Account</Text>

                    <TouchableOpacity
                        className="flex-row items-center justify-between py-3 border-b border-gray-400"
                        onPress={() => {
                            // @ts-ignore - Ignore TypeScript error for navigation
                            navigation.navigate('personal-info')
                        }}
                    >
                        <View className="flex-row items-center gap-3">
                            <Icon name="person" size={20} color="#333" />
                            <Text className="text-base">Personal Information</Text>
                        </View>
                        <Icon name="chevron-right" size={20} color="#333" />
                    </TouchableOpacity>

                    <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-gray-400">
                        <View className="flex-row items-center gap-3">
                            <Icon name="security" size={20} color="#333" />
                            <Text className="text-base">Security</Text>
                        </View>
                        <Icon name="chevron-right" size={20} color="#333" />
                    </TouchableOpacity>

                    <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-gray-400">
                        <View className="flex-row items-center gap-3">
                            <Icon name="payment" size={20} color="#333" />
                            <Text className="text-base">Payment Methods</Text>
                        </View>
                        <Icon name="chevron-right" size={20} color="#333" />
                    </TouchableOpacity>
                </View>

                {/* Preferences Section */}
                <View className="p-4 mt-2">
                    <Text className="text-emerald-800 font-bold text-lg mb-2">Preferences</Text>

                    <View className="flex-row items-center justify-between py-3 border-b border-gray-400">
                        <View className="flex-row items-center gap-3">
                            <Icon name="notifications" size={20} color="#333" />
                            <Text className="text-base">Notifications</Text>
                        </View>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                            trackColor={{ false: "#767577", true: "#3FE693" }}
                            thumbColor={notificationsEnabled ? "#f4f3f4" : "#f4f3f4"}
                        />
                    </View>

                    <View className="flex-row items-center justify-between py-3 border-b border-gray-400">
                        <View className="flex-row items-center gap-3">
                            <Icon name="dark-mode" size={20} color="#333" />
                            <Text className="text-base">Dark Mode</Text>
                        </View>
                        <Switch
                            value={darkModeEnabled}
                            onValueChange={setDarkModeEnabled}
                            trackColor={{ false: "#767577", true: "#3FE693" }}
                            thumbColor={darkModeEnabled ? "#f4f3f4" : "#f4f3f4"}
                        />
                    </View>

                    <View className="flex-row items-center justify-between py-3 border-b border-gray-400">
                        <View className="flex-row items-center gap-3">
                            <Icon name="location-on" size={20} color="#333" />
                            <Text className="text-base">Location Services</Text>
                        </View>
                        <Switch
                            value={locationEnabled}
                            onValueChange={setLocationEnabled}
                            trackColor={{ false: "#767577", true: "#3FE693" }}
                            thumbColor={locationEnabled ? "#f4f3f4" : "#f4f3f4"}
                        />
                    </View>
                </View>

                {/* About Section */}
                <View className="p-4 mt-2">
                    <Text className="text-emerald-800 font-bold text-lg mb-2">About</Text>

                    <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-gray-400">
                        <View className="flex-row items-center gap-3">
                            <Icon name="info" size={20} color="#333" />
                            <Text className="text-base">App Information</Text>
                        </View>
                        <Icon name="chevron-right" size={20} color="#333" />
                    </TouchableOpacity>

                    <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-gray-400">
                        <View className="flex-row items-center gap-3">
                            <Icon name="help" size={20} color="#333" />
                            <Text className="text-base">Help & Support</Text>
                        </View>
                        <Icon name="chevron-right" size={20} color="#333" />
                    </TouchableOpacity>

                    <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-gray-400">
                        <View className="flex-row items-center gap-3">
                            <Icon name="privacy-tip" size={20} color="#333" />
                            <Text className="text-base">Privacy Policy</Text>
                        </View>
                        <Icon name="chevron-right" size={20} color="#333" />
                    </TouchableOpacity>

                    <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-gray-400">
                        <View className="flex-row items-center gap-3">
                            <Icon name="description" size={20} color="#333" />
                            <Text className="text-base">Terms of Service</Text>
                        </View>
                        <Icon name="chevron-right" size={20} color="#333" />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

export default Settings