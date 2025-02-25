import React from "react";
import { View, Text, TouchableOpacity, SafeAreaView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { useNavigation } from "@react-navigation/native";

export default function QRCodeDisplay() {
  const navigation = useNavigation();
  const userName = "Jagdish Berondo";
  const qrValue = "https://example.com/jagdish-berondo";

  return (
    <SafeAreaView className="flex-1 bg-emerald-400 p-4">
      {/* Navigation */}
      <View className="mb-4">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1">
          <MaterialIcons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View className="flex-1 items-center mt-32">
        <View className="w-full max-w-[320px] relative">
          {/* Profile Icon with Material Icon */}
          <View className="absolute top-[-58px] left-1/2 transform -translate-x-12 w-28 h-28 bg-white rounded-full z-10 items-center justify-center shadow-lg">
            <View className="w-18 h-18 bg-emerald-400 rounded-full items-center justify-center shadow-lg">
              <MaterialIcons name="account-circle" size={77} color="#ffffff" />
            </View>
          </View>

          {/* Card Content */}
          <View className="bg-white rounded-3xl p-6 pt-12 items-center shadow-lg">
            <View className="mb-4">
              <Text className="text-xl font-semibold text-gray-900">
                {userName}
              </Text>
            </View>
            <QRCode value={qrValue} size={256} quietZone={16} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
