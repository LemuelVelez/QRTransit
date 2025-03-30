"use client"

import { useState, useEffect } from "react"
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native"
import { Entypo, Ionicons } from "@expo/vector-icons"
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type Notification,
} from "@/lib/transaction-service"
import DateRangePicker from "@/components/date-range-picker"

export default function Inbox() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)

  // Function to load notifications
  const loadNotifications = async () => {
    try {
      setLoading(true)
      console.log("Fetching notifications...")
      const userNotifications = await getUserNotifications()
      console.log("Notifications received:", userNotifications.length)
      setNotifications(userNotifications)

      // Apply date filter if set
      if (startDate && endDate) {
        filterNotificationsByDate(userNotifications)
      } else {
        setFilteredNotifications(userNotifications)
      }
    } catch (error) {
      console.error("Error loading notifications:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Load notifications on component mount
  useEffect(() => {
    loadNotifications()
  }, [])

  // Filter notifications when date range changes
  useEffect(() => {
    if (notifications.length > 0) {
      if (startDate && endDate) {
        filterNotificationsByDate(notifications)
      } else {
        setFilteredNotifications(notifications)
      }
    }
  }, [startDate, endDate])

  // Filter notifications by date range
  const filterNotificationsByDate = (notificationsToFilter: Notification[]) => {
    if (!startDate || !endDate) {
      setFilteredNotifications(notificationsToFilter)
      return
    }

    const startTimestamp = startDate.setHours(0, 0, 0, 0)
    const endTimestamp = endDate.setHours(23, 59, 59, 999)

    const filtered = notificationsToFilter.filter(
      (notification) => notification.timestamp >= startTimestamp && notification.timestamp <= endTimestamp,
    )

    setFilteredNotifications(filtered)
  }

  // Handle date selection
  const handleSelectDates = (start: Date | null, end: Date | null) => {
    setStartDate(start)
    setEndDate(end)
    setShowDatePicker(false)
  }

  // Clear date filter
  const clearDateFilter = () => {
    setStartDate(null)
    setEndDate(null)
    setFilteredNotifications(notifications)
  }

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true)
    await loadNotifications()
  }

  // Handle marking a notification as read
  const handleNotificationPress = async (notification: Notification) => {
    try {
      await markNotificationAsRead(notification.id)
      // Update the local state to mark this notification as read
      setNotifications((prevNotifications) =>
        prevNotifications.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      )
      setFilteredNotifications((prevNotifications) =>
        prevNotifications.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      )
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  // Handle marking all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead()
      // Update all notifications in local state
      setNotifications((prevNotifications) => prevNotifications.map((n) => ({ ...n, read: true })))
      setFilteredNotifications((prevNotifications) => prevNotifications.map((n) => ({ ...n, read: true })))
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  // Group notifications by date
  const groupedNotifications: { [key: string]: Notification[] } = {}
  filteredNotifications.forEach((notification) => {
    // Extract just the date part for grouping
    const dateKey = notification.date.includes(" at ") ? notification.date.split(" at ")[0] : notification.date

    if (!groupedNotifications[dateKey]) {
      groupedNotifications[dateKey] = []
    }
    groupedNotifications[dateKey].push(notification)
  })

  return (
    <SafeAreaView className="flex-1 mb-[65px] bg-emerald-400">
      <View className="bg-emerald-600 p-4 items-center justify-center mt-9">
        <Text className="text-xl font-semibold text-white">Inbox</Text>
      </View>

      {/* Filter and Mark all as read buttons */}
      <View className="bg-emerald-300 px-4 py-2 flex-row justify-between items-center">
        <View className="flex-row items-center">
          <Text className="text-sm font-medium">Your Notifications</Text>
          {(startDate || endDate) && (
            <View className="flex-row items-center ml-2">
              <Text className="text-xs text-emerald-800">
                {startDate?.toLocaleDateString()} - {endDate?.toLocaleDateString()}
              </Text>
              <TouchableOpacity onPress={clearDateFilter} className="ml-1">
                <Ionicons name="close-circle" size={14} color="#065f46" />
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View className="flex-row">
          <TouchableOpacity className="mr-3" onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={18} color="#065f46" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <Text className="text-sm text-emerald-800">Mark all as read</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={filteredNotifications.length === 0 ? { flexGrow: 1, justifyContent: "center" } : {}}
        >
          {filteredNotifications.length === 0 ? (
            <View className="items-center p-4">
              <Ionicons name="mail-open-outline" size={64} color="#059669" />
              <Text className="text-lg text-gray-700 mt-4">No notifications found</Text>
              <Text className="text-sm text-gray-500 text-center mt-2">
                {startDate || endDate
                  ? "No notifications found for the selected date range."
                  : "When you receive money or have account activity, you'll see notifications here."}
              </Text>
              {(startDate || endDate) && (
                <TouchableOpacity className="mt-4 bg-emerald-100 px-4 py-2 rounded-lg" onPress={clearDateFilter}>
                  <Text className="text-emerald-600">Clear date filter</Text>
                </TouchableOpacity>
              )}
              <Text className="text-xs text-gray-400 mt-6">Pull down to refresh</Text>
            </View>
          ) : (
            Object.entries(groupedNotifications).map(([dateGroup, groupNotifications]) => (
              <View key={dateGroup}>
                <View className="bg-emerald-300 px-4 py-2">
                  <Text className="text-sm font-medium">{dateGroup}</Text>
                </View>

                {groupNotifications.map((notification) => (
                  <TouchableOpacity
                    key={notification.id}
                    onPress={() => handleNotificationPress(notification)}
                    className={`flex-row items-start gap-3 bg-white px-4 py-3 border-b border-gray-200 ${notification.read ? "opacity-70" : ""
                      }`}
                  >
                    <View className="mt-1">
                      {!notification.read && (
                        <View className="absolute -right-1 -top-1 w-2 h-2 bg-emerald-600 rounded-full" />
                      )}
                      <Entypo
                        name={notification.type === "TRANSACTION" ? "wallet" : "mail"}
                        size={20}
                        color="#4B5563"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className={`text-sm font-medium ${notification.read ? "text-gray-500" : "text-gray-800"}`}>
                        {notification.title}
                      </Text>
                      <Text className={`text-sm ${notification.read ? "text-gray-400" : "text-gray-600"}`}>
                        {notification.message}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-500">
                      {notification.date.includes(" at ") ? notification.date.split(" at ")[1] : ""}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Date Range Picker Modal */}
      <DateRangePicker
        visible={showDatePicker}
        startDate={startDate}
        endDate={endDate}
        onSelectDates={handleSelectDates}
        onCancel={() => setShowDatePicker(false)}
      />
    </SafeAreaView>
  )
}

