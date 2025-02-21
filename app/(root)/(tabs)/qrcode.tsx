import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import QRCode from "react-native-qrcode-svg";
import { useNavigation } from "@react-navigation/native";

export default function QRCodeDisplay() {
  const navigation = useNavigation(); // Initialize navigation
  const userName = "Jagdish Berondo";
  const qrValue = "https://example.com/jagdish-berondo"; // Replace with actual URL/data to encode

  return (
    <SafeAreaView className="flex-1 bg-emerald-400 p-4">
      {/* Navigation */}
      <View className="mb-4">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1">
          <Icon name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View className="flex-1 items-center mt-12">
        <View className="w-full max-w-[320px] relative">
          {/* Profile Icon with image */}
          <View className="absolute top-[-58px] left-1/2 transform -translate-x-12 w-28 h-28 bg-white rounded-full z-10 items-center justify-center shadow-lg">
            <View className="w-18 h-18 bg-emerald-400 rounded-full items-center justify-center shadow-lg">
              <Image
                source={require("../../../assets/images/profile_icon 1.png")} // Update with your file path
                style={{ width: 77, height: 77, borderRadius: 32 }}
              />
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
