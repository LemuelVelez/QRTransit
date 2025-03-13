"use client"

import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useNavigation } from "@react-navigation/native"
import { useState, useEffect } from "react"
import { getCurrentUser, updateUserProfile } from "../lib/appwrite"
import * as ImagePicker from "expo-image-picker"

// Define interface for personal info
interface PersonalInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  avatar?: string
  //   address: string
  //   dateOfBirth: string
}

const PersonalInfo = () => {
  const navigation = useNavigation()
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    avatar: "",
    // address: "",
    // dateOfBirth: "",
  })

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true)
        const userData = await getCurrentUser()

        if (userData) {
          setPersonalInfo({
            firstName: userData.firstname || "",
            lastName: userData.lastname || "",
            email: userData.email || "",
            phone: userData.phonenumber || "",
            avatar: userData.avatar || "",
            // address: "", // Not provided by getCurrentUser
            // dateOfBirth: "", // Not provided by getCurrentUser
          })
        }
      } catch (err) {
        console.error("Error fetching user data:", err)
        setError("Failed to load user data. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [])

  // Add type annotations to handleChange parameters
  const handleChange = (field: keyof PersonalInfo, value: string) => {
    setPersonalInfo((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (status !== "granted") {
        Alert.alert("Permission Required", "Sorry, we need camera roll permissions to make this work!")
        return
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0]
        setSelectedImage(selectedAsset.uri)
      }
    } catch (err) {
      console.error("Error picking image:", err)
      Alert.alert("Error", "Failed to select image. Please try again.")
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Map the PersonalInfo state to the userData object expected by updateUserProfile
      const userData = {
        firstname: personalInfo.firstName,
        lastname: personalInfo.lastName,
        email: personalInfo.email,
        phonenumber: personalInfo.phone,
        // Note: username is not included as it's not part of the PersonalInfo interface
      }

      // Prepare avatar file if selected
      let avatarFile = undefined
      if (selectedImage) {
        try {
          // Get file info
          const response = await fetch(selectedImage)
          const blob = await response.blob()

          // Create file object with required properties
          avatarFile = {
            name: `avatar-${Date.now()}.${selectedImage.split(".").pop() || "jpg"}`,
            type: blob.type || "image/jpeg",
            size: blob.size,
            uri: selectedImage,
          }
        } catch (fileErr) {
          console.error("Error preparing file:", fileErr)
          // Continue without avatar update if file preparation fails
        }
      }

      // Call the updateUserProfile function with avatar if available
      const updatedUser = await updateUserProfile(userData, avatarFile)

      if (updatedUser) {
        Alert.alert("Success", "Personal information saved successfully!")
        navigation.goBack()
      } else {
        throw new Error("Failed to update profile")
      }
    } catch (err: any) {
      console.error("Error saving user data:", err)
      Alert.alert("Error", err.message || "Failed to save changes. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (loading && personalInfo.firstName === "") {
    return (
      <SafeAreaView className="flex-1 bg-emerald-200 justify-center items-center">
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
        <ActivityIndicator size="large" color="#047857" />
        <Text className="mt-4 text-emerald-800">Loading your information...</Text>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-emerald-200 justify-center items-center p-4">
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
        <Icon name="error-outline" size={48} color="#B91C1C" />
        <Text className="mt-4 text-red-700 text-center">{error}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-6 bg-emerald-600 py-3 px-6 rounded-lg">
          <Text className="text-white font-medium">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  // Determine which avatar to display
  const avatarSource = selectedImage || personalInfo.avatar

  return (
    <SafeAreaView className="flex-1 bg-emerald-200">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

      {/* Header */}
      <View className="bg-emerald-200 mt-12 p-4 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Icon name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text className="text-black text-xl font-semibold">Personal Information</Text>
      </View>

      <ScrollView className="flex-1 px-4">
        <View className="mt-4">

          {/* Avatar Section */}
          <View className="items-center mb-6">
            <View className="relative">
              {avatarSource ? (
                <Image
                  source={{ uri: avatarSource }}
                  className="w-24 h-24 rounded-full"
                  style={{ width: 96, height: 96, borderRadius: 48 }}
                />
              ) : (
                <View
                  className="w-24 h-24 rounded-full bg-emerald-300 items-center justify-center"
                  style={{ width: 96, height: 96, borderRadius: 48 }}
                >
                  <Text className="text-emerald-800 text-2xl font-bold">
                    {personalInfo.firstName && personalInfo.lastName
                      ? `${personalInfo.firstName.charAt(0)}${personalInfo.lastName.charAt(0)}`
                      : "?"}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                onPress={pickImage}
                className="absolute bottom-0 right-0 bg-emerald-600 rounded-full p-2"
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  backgroundColor: "#047857",
                  borderRadius: 20,
                  padding: 8,
                }}
              >
                <Icon name="camera-alt" size={18} color="white" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={pickImage} className="mt-2">
              <Text className="text-emerald-700 font-medium">Change Profile Picture</Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View className="mb-4">
            <Text className="text-emerald-800 font-medium mb-1">First Name</Text>
            <TextInput
              value={personalInfo.firstName}
              onChangeText={(text) => handleChange("firstName", text)}
              className="bg-white p-3 rounded-lg border border-gray-300"
              placeholder="Enter your first name"
            />
          </View>

          <View className="mb-4">
            <Text className="text-emerald-800 font-medium mb-1">Last Name</Text>
            <TextInput
              value={personalInfo.lastName}
              onChangeText={(text) => handleChange("lastName", text)}
              className="bg-white p-3 rounded-lg border border-gray-300"
              placeholder="Enter your last name"
            />
          </View>

          <View className="mb-4">
            <Text className="text-emerald-800 font-medium mb-1">Email</Text>
            <TextInput
              value={personalInfo.email}
              onChangeText={(text) => handleChange("email", text)}
              keyboardType="email-address"
              className="bg-white p-3 rounded-lg border border-gray-300"
              placeholder="Enter your email"
            />
          </View>

          <View className="mb-4">
            <Text className="text-emerald-800 font-medium mb-1">Phone Number</Text>
            <TextInput
              value={personalInfo.phone}
              onChangeText={(text) => handleChange("phone", text)}
              keyboardType="phone-pad"
              className="bg-white p-3 rounded-lg border border-gray-300"
              placeholder="Enter your phone number"
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            className="bg-emerald-600 py-4 rounded-lg mt-6 mb-8"
            disabled={saving || loading}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-bold text-lg">Save Changes</Text>
            )}
          </TouchableOpacity>

          {/* Delete Account Button */}
          <TouchableOpacity className="py-4 rounded-lg border border-red-500 mt-4" disabled={saving || loading}>
            <Text className="text-red-500 text-center font-medium">Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default PersonalInfo

