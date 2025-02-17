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
import { useNavigation } from "@react-navigation/native"; // Importing useNavigation
import { NativeStackNavigationProp } from "@react-navigation/native-stack"; // Import the correct type

// Define your stack navigator types
type RootStackParamList = {
  "sign-in": undefined; // Correct route name used for navigation
  Register: undefined;
};

const Register = () => {
  const navigation = useNavigation<
    NativeStackNavigationProp<RootStackParamList>
  >(); // Correctly type the navigation

  const [showPassword, setShowPassword] = useState(false);
  const [showReTypePassword, setShowReTypePassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [reTypePassword, setReTypePassword] = useState("");

  const [isFirstNameFocused, setIsFirstNameFocused] = useState(false);
  const [isLastNameFocused, setIsLastNameFocused] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPhoneNumberFocused, setIsPhoneNumberFocused] = useState(false);
  const [isUsernameFocused, setIsUsernameFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isReTypePasswordFocused, setIsReTypePasswordFocused] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-green-400 justify-center items-center p-4">
      <View className="w-full max-w-sm items-center mb-8">
        {/* Logo Circle */}
        <View className="w-24 h-24 bg-green-700 rounded-full justify-center items-center overflow-hidden">
          <Image
            source={require("../assets/images/QuickRide.png")}
            className="w-24 h-24 object-contain"
          />
        </View>
      </View>

      {/* Form Fields */}
      <View className="w-full">
        {/* First Name Input */}
        <View className="relative mb-4">
          <TextInput
            className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-800"
            placeholder=""
            value={firstName}
            onChangeText={setFirstName}
            onFocus={() => setIsFirstNameFocused(true)}
            onBlur={() => setIsFirstNameFocused(false)}
          />
          <Text
            className={`absolute left-4 transition-all text-sm ${
              isFirstNameFocused || firstName
                ? "-top-2.5 text-gray-600"
                : "top-3.5 text-gray-400"
            }`}
          >
            First Name
          </Text>
        </View>

        {/* Last Name Input */}
        <View className="relative mb-4">
          <TextInput
            className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-800"
            placeholder=""
            value={lastName}
            onChangeText={setLastName}
            onFocus={() => setIsLastNameFocused(true)}
            onBlur={() => setIsLastNameFocused(false)}
          />
          <Text
            className={`absolute left-4 transition-all text-sm ${
              isLastNameFocused || lastName
                ? "-top-2.5 text-gray-600"
                : "top-3.5 text-gray-400"
            }`}
          >
            Last Name
          </Text>
        </View>

        {/* Email Input */}
        <View className="relative mb-4">
          <TextInput
            className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-800"
            placeholder=""
            value={email}
            onChangeText={setEmail}
            onFocus={() => setIsEmailFocused(true)}
            onBlur={() => setIsEmailFocused(false)}
          />
          <Text
            className={`absolute left-4 transition-all text-sm ${
              isEmailFocused || email
                ? "-top-2.5 text-gray-600"
                : "top-3.5 text-gray-400"
            }`}
          >
            Email
          </Text>
        </View>

        {/* Phone Number Input */}
        <View className="relative mb-4">
          <TextInput
            className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-800"
            placeholder=""
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            onFocus={() => setIsPhoneNumberFocused(true)}
            onBlur={() => setIsPhoneNumberFocused(false)}
          />
          <Text
            className={`absolute left-4 transition-all text-sm ${
              isPhoneNumberFocused || phoneNumber
                ? "-top-2.5 text-gray-600"
                : "top-3.5 text-gray-400"
            }`}
          >
            Phone Number
          </Text>
        </View>

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

        {/* Re-type Password Input */}
        <View className="relative mb-4">
          <TextInput
            className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-800 pr-12"
            placeholder=""
            secureTextEntry={!showReTypePassword}
            value={reTypePassword}
            onChangeText={setReTypePassword}
            onFocus={() => setIsReTypePasswordFocused(true)}
            onBlur={() => setIsReTypePasswordFocused(false)}
          />
          <Text
            className={`absolute left-4 transition-all text-sm ${
              isReTypePasswordFocused || reTypePassword
                ? "-top-2.5 text-gray-600"
                : "top-3.5 text-gray-400"
            }`}
          >
            Re-type Password
          </Text>
          <TouchableOpacity
            onPress={() => setShowReTypePassword(!showReTypePassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            {showReTypePassword ? (
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
          <Text className="text-white text-center text-lg">Register</Text>
        </TouchableOpacity>

        {/* Login Link */}
        <TouchableOpacity
          className="w-full bg-white text-gray-800 py-3 rounded-lg hover:bg-gray-50 transition-colors"
          onPress={() => navigation.navigate("sign-in")}
        >
          <Text className="text-gray-800 text-center text-lg">
            Already have an account? <Text className="underline">Login</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default Register;
