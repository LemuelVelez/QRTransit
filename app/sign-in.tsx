import React, { useState } from "react";
import {
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { Eye, EyeOff } from "lucide-react-native"; // Assuming you are using lucide-react-native

const SignIn = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isUsernameFocused, setIsUsernameFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-green-400 justify-center items-center p-4">
      <View className="w-full max-w-sm items-center mb-8">
        {/* Logo Circle */}
        <View className="w-48 h-48 bg-green-700 rounded-full justify-center items-center overflow-hidden">
          <Image
            source={require("../assets/images/QuickRide.png")} // Updated image path
            className="w-48 h-48 object-contain"
          />
        </View>
      </View>

      {/* Form Fields */}
      <View className="w-full">
        {/* Username Input */}
        <View className="relative mb-4">
          <TextInput
            className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-800"
            placeholder=""
            value={username}
            onChangeText={setUsername}
            onFocus={() => setIsUsernameFocused(true)}
            onBlur={() => setIsUsernameFocused(false)}
          />
          <Text
            className={`absolute left-4 transition-all text-sm ${
              isUsernameFocused || username
                ? "-top-2.5 text-gray-600"
                : "top-3.5 text-gray-400"
            }`}
          >
            Username
          </Text>
        </View>

        {/* Password Input */}
        <View className="relative mb-4">
          <TextInput
            className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-800 pr-12"
            placeholder=""
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            onFocus={() => setIsPasswordFocused(true)}
            onBlur={() => setIsPasswordFocused(false)}
          />
          <Text
            className={`absolute left-4 transition-all text-sm ${
              isPasswordFocused || password
                ? "-top-2.5 text-gray-600"
                : "top-3.5 text-gray-400"
            }`}
          >
            Password
          </Text>
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            {showPassword ? (
              <EyeOff width={24} height={24} color="#6B7280" />
            ) : (
              <Eye width={24} height={24} color="#6B7280" />
            )}
          </TouchableOpacity>
        </View>

        {/* Buttons */}
        <TouchableOpacity
          className="w-full bg-blue-600 py-3 rounded-lg hover:bg-blue-700 transition-colors mb-4"
          onPress={() => {}}
        >
          <Text className="text-white text-center text-lg">Log In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="w-full bg-white text-gray-800 py-3 rounded-lg hover:bg-gray-50 transition-colors"
          onPress={() => {}}
        >
          <Text className="text-gray-800 text-center text-lg">Register</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default SignIn;
