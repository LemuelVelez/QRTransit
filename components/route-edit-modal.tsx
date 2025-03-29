"use client"

import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, Switch } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { RouteInfo } from "@/lib/route-service"
import LocationInput from "./location-input"

interface RouteEditModalProps {
  visible: boolean
  route: RouteInfo
  onClose: () => void
  onSave: (updatedRoute: RouteInfo) => void
}

export default function RouteEditModal({ visible, route, onClose, onSave }: RouteEditModalProps) {
  const [from, setFrom] = useState(route.from)
  const [to, setTo] = useState(route.to)
  const [busNumber, setBusNumber] = useState(route.busNumber)
  const [active, setActive] = useState(route.active === true) // Ensure boolean value
  const [saving, setSaving] = useState(false)

  const handleSave = () => {
    if (!from || !to || !busNumber) {
      return
    }

    setSaving(true)

    const updatedRoute: RouteInfo = {
      ...route,
      from,
      to,
      busNumber,
      active,
    }

    console.log("Saving route with active status:", active)
    onSave(updatedRoute)
    setSaving(false)
  }

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white w-[90%] max-w-md rounded-xl p-6">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-bold text-gray-800">Edit Route</Text>
            <TouchableOpacity onPress={onClose} disabled={saving}>
              <Ionicons name="close" size={24} color="#059669" />
            </TouchableOpacity>
          </View>

          <LocationInput label="From" value={from} onChange={setFrom} placeholder="Starting point" />

          <LocationInput label="To" value={to} onChange={setTo} placeholder="Destination" />

          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">Bus Number</Text>
            <TextInput
              className="border border-gray-300 rounded-md p-3 bg-gray-50"
              value={busNumber}
              onChangeText={setBusNumber}
              placeholder="Bus number"
              editable={!saving}
            />
          </View>

          <View className="mb-6 flex-row justify-between items-center">
            <Text className="text-gray-700 font-medium">Route Active</Text>
            <Switch
              value={active}
              onValueChange={setActive}
              trackColor={{ false: "#d1d5db", true: "#10b981" }}
              thumbColor="#ffffff"
              disabled={saving}
            />
          </View>

          <TouchableOpacity
            className="bg-emerald-500 py-3 rounded-lg items-center"
            onPress={handleSave}
            disabled={saving || !from || !to || !busNumber}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-bold">Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

