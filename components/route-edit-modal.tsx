"use client"

import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { RouteInfo } from "@/lib/route-service"

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
    }

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

          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">From</Text>
            <TextInput
              className="border border-gray-300 rounded-md p-3 bg-gray-50"
              value={from}
              onChangeText={setFrom}
              placeholder="Starting point"
              editable={!saving}
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">To</Text>
            <TextInput
              className="border border-gray-300 rounded-md p-3 bg-gray-50"
              value={to}
              onChangeText={setTo}
              placeholder="Destination"
              editable={!saving}
            />
          </View>

          <View className="mb-6">
            <Text className="text-gray-700 mb-1 font-medium">Bus Number</Text>
            <TextInput
              className="border border-gray-300 rounded-md p-3 bg-gray-50"
              value={busNumber}
              onChangeText={setBusNumber}
              placeholder="Bus number"
              editable={!saving}
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

