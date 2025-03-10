import { usePinVerification } from "@/lib/pin-context";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { View, Text, Image, SafeAreaView } from "react-native";

export default function WalletInterface() {
  const { isPinVerified } = usePinVerification()
  const router = useRouter()

  // If PIN is not verified, redirect to PIN entry screen
  useEffect(() => {
    if (!isPinVerified) {
      router.replace("/pin")
    }
  }, [isPinVerified, router])

  // If PIN is not verified, show nothing while redirecting
  if (!isPinVerified) {
    return null
  }
  return (
    <SafeAreaView className="flex-1 bg-emerald-400">
      {/* Main Container */}
      <View className="flex-1 mt-6">
        {/* Header with logo */}
        <View className="mx-4 my-4">
          <View className="flex-row items-center gap-3 my-5">
            <View className="h-20 w-20 overflow-hidden rounded-full bg-emerald-900/10">
              <Image
                source={require("../../../assets/images/QuickRide.png")}
                className="h-20 w-20"
                resizeMode="cover"
              />
            </View>
            <Text className="text-lg font-medium text-emerald-900">
              QR-Coded Bus Ticketing System
            </Text>
          </View>
        </View>

        {/* Wallet Card Container */}
        <View className="mx-4">
          <View className="overflow-hidden rounded-3xl bg-emerald-400">
            {/* Wallet Label */}
            <View className="flex-row">
              <View className="w-1/2 rounded-tr-xl rounded-tl-xl bg-emerald-600 px-4 py-3">
                <Text className="text-lg font-medium text-white">Wallet</Text>
              </View>
            </View>

            {/* Balance Section */}
            <View className="bg-emerald-600 px-4 py-3">
              <View className="gap-1">
                <Text className="text-sm text-emerald-100">
                  Available balance
                </Text>
                <Text className="text-3xl font-semibold text-white">
                  ₱200,000
                </Text>
              </View>
            </View>

            {/* Send Section */}
            <View className="h-96 p-4 bg-emerald-200">
              <View className="items-center gap-2 w-16">
                <Image
                  source={require("../../../assets/images/Peso.png")}
                  className="h-20 w-20"
                  resizeMode="contain"
                />
                <Text className="text-sm font-medium text-emerald-800">
                  Send
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
