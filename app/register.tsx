import React, { useState } from "react";
import {
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { registerUser } from "../lib/appwrite";

// Define your stack navigator types
type RootStackParamList = {
  "sign-in": undefined;
  "register-pin": undefined;
};

const Register = () => {
  const navigation = useNavigation<
    NativeStackNavigationProp<RootStackParamList>
  >();

  const [showPassword, setShowPassword] = useState(false);
  const [showReTypePassword, setShowReTypePassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [reTypePassword, setReTypePassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [isFirstNameFocused, setIsFirstNameFocused] = useState(false);
  const [isLastNameFocused, setIsLastNameFocused] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPhoneNumberFocused, setIsPhoneNumberFocused] = useState(false);
  const [isUsernameFocused, setIsUsernameFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isReTypePasswordFocused, setIsReTypePasswordFocused] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validate first name
    if (!firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    // Validate last name
    if (!lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(email)) {
      newErrors.email = "Please enter a valid email";
    }

    // Validate phone number
    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    }

    // Validate username
    if (!username.trim()) {
      newErrors.username = "Username is required";
    }

    // Validate password
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    // Validate re-type password
    if (password !== reTypePassword) {
      newErrors.reTypePassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const user = await registerUser(
        email,
        password,
        firstName,
        lastName,
        username,
        phoneNumber
      );

      if (user) {
        // Registration successful
        navigation.navigate("register-pin");
      } else {
        Alert.alert("Registration Failed", "Unable to create account. Please try again.");
      }
    } catch (error: any) {
      // Handle specific error cases
      if (error.message?.includes("email already exists")) {
        Alert.alert("Registration Failed", "This email is already registered.");
      } else if (error.message?.includes("username already exists")) {
        Alert.alert("Registration Failed", "This username is already taken.");
      } else {
        Alert.alert(
          "Registration Failed",
          "An error occurred during registration. Please try again."
        );
      }
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderErrorMessage = (field: string) => {
    if (errors[field]) {
      return <Text className="text-red-500 text-xs mt-1">{errors[field]}</Text>;
    }
    return null;
  };

  return (
    <SafeAreaView className="flex-1 bg-green-400 justify-center items-center p-4">
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
      />
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
            className={`w-full px-4 py-3 rounded-lg border ${errors.firstName ? "border-red-500" : "border-gray-200"
              } bg-white text-gray-800`}
            placeholder=""
            value={firstName}
            onChangeText={setFirstName}
            onFocus={() => setIsFirstNameFocused(true)}
            onBlur={() => setIsFirstNameFocused(false)}
          />
          <Text
            className={`absolute left-4 transition-all text-sm ${isFirstNameFocused || firstName
              ? "-top-2.5 text-gray-600"
              : "top-3.5 text-gray-400"
              }`}
          >
            First Name
          </Text>
          {renderErrorMessage("firstName")}
        </View>

        {/* Last Name Input */}
        <View className="relative mb-4">
          <TextInput
            className={`w-full px-4 py-3 rounded-lg border ${errors.lastName ? "border-red-500" : "border-gray-200"
              } bg-white text-gray-800`}
            placeholder=""
            value={lastName}
            onChangeText={setLastName}
            onFocus={() => setIsLastNameFocused(true)}
            onBlur={() => setIsLastNameFocused(false)}
          />
          <Text
            className={`absolute left-4 transition-all text-sm ${isLastNameFocused || lastName
              ? "-top-2.5 text-gray-600"
              : "top-3.5 text-gray-400"
              }`}
          >
            Last Name
          </Text>
          {renderErrorMessage("lastName")}
        </View>

        {/* Email Input */}
        <View className="relative mb-4">
          <TextInput
            className={`w-full px-4 py-3 rounded-lg border ${errors.email ? "border-red-500" : "border-gray-200"
              } bg-white text-gray-800`}
            placeholder=""
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            onFocus={() => setIsEmailFocused(true)}
            onBlur={() => setIsEmailFocused(false)}
          />
          <Text
            className={`absolute left-4 transition-all text-sm ${isEmailFocused || email
              ? "-top-2.5 text-gray-600"
              : "top-3.5 text-gray-400"
              }`}
          >
            Email
          </Text>
          {renderErrorMessage("email")}
        </View>

        {/* Phone Number Input */}
        <View className="relative mb-4">
          <TextInput
            className={`w-full px-4 py-3 rounded-lg border ${errors.phoneNumber ? "border-red-500" : "border-gray-200"
              } bg-white text-gray-800`}
            placeholder=""
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            onFocus={() => setIsPhoneNumberFocused(true)}
            onBlur={() => setIsPhoneNumberFocused(false)}
          />
          <Text
            className={`absolute left-4 transition-all text-sm ${isPhoneNumberFocused || phoneNumber
              ? "-top-2.5 text-gray-600"
              : "top-3.5 text-gray-400"
              }`}
          >
            Phone Number
          </Text>
          {renderErrorMessage("phoneNumber")}
        </View>

        {/* Username Input */}
        <View className="relative mb-4">
          <TextInput
            className={`w-full px-4 py-3 rounded-lg border ${errors.username ? "border-red-500" : "border-gray-200"
              } bg-white text-gray-800`}
            placeholder=""
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            onFocus={() => setIsUsernameFocused(true)}
            onBlur={() => setIsUsernameFocused(false)}
          />
          <Text
            className={`absolute left-4 transition-all text-sm ${isUsernameFocused || username
              ? "-top-2.5 text-gray-600"
              : "top-3.5 text-gray-400"
              }`}
          >
            Username
          </Text>
          {renderErrorMessage("username")}
        </View>

        {/* Password Input */}
        <View className="relative mb-4">
          <TextInput
            className={`w-full px-4 py-3 rounded-lg border ${errors.password ? "border-red-500" : "border-gray-200"
              } bg-white text-gray-800 pr-12`}
            placeholder=""
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            onFocus={() => setIsPasswordFocused(true)}
            onBlur={() => setIsPasswordFocused(false)}
          />
          <Text
            className={`absolute left-4 transition-all text-sm ${isPasswordFocused || password
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
              <Icon name="visibility-off" size={24} color="#6B7280" />
            ) : (
              <Icon name="visibility" size={24} color="#6B7280" />
            )}
          </TouchableOpacity>
          {renderErrorMessage("password")}
        </View>

        {/* Re-type Password Input */}
        <View className="relative mb-4">
          <TextInput
            className={`w-full px-4 py-3 rounded-lg border ${errors.reTypePassword ? "border-red-500" : "border-gray-200"
              } bg-white text-gray-800 pr-12`}
            placeholder=""
            secureTextEntry={!showReTypePassword}
            value={reTypePassword}
            onChangeText={setReTypePassword}
            onFocus={() => setIsReTypePasswordFocused(true)}
            onBlur={() => setIsReTypePasswordFocused(false)}
          />
          <Text
            className={`absolute left-4 transition-all text-sm ${isReTypePasswordFocused || reTypePassword
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
              <Icon name="visibility-off" size={24} color="#6B7280" />
            ) : (
              <Icon name="visibility" size={24} color="#6B7280" />
            )}
          </TouchableOpacity>
          {renderErrorMessage("reTypePassword")}
        </View>

        {/* Buttons */}
        <TouchableOpacity
          className={`w-full ${isLoading ? "bg-blue-400" : "bg-blue-600"
            } py-3 rounded-lg hover:bg-blue-700 transition-colors mb-4`}
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center text-lg">Register</Text>
          )}
        </TouchableOpacity>

        {/* Login Link */}
        <TouchableOpacity
          className="w-full bg-white text-gray-800 py-3 rounded-lg hover:bg-gray-50 transition-colors"
          onPress={() => navigation.navigate("sign-in")}
          disabled={isLoading}
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