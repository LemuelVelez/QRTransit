"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native"
import { Entypo, Ionicons } from "@expo/vector-icons"
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type Notification,
} from "@/lib/transaction-service"
import { getCurrentUser, config, databases, account } from "@/lib/appwrite"
import { Query } from "react-native-appwrite"

export default function Inbox() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [allNotifications, setAllNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [userId, setUserId] = useState<string>("")
  const [showAllNotifications, setShowAllNotifications] = useState(false)

  // Add this function inside your Inbox component
  const debugUserIds = async () => {
    try {
      // Get user from getCurrentUser()
      const currentUser = await getCurrentUser()
      console.log("getCurrentUser() ID:", currentUser?.$id || "Not found")

      // Get user directly from account.get()
      try {
        const authUser = await account.get()
        console.log("Direct account.get() ID:", authUser.$id)
      } catch (authError) {
        console.error("Error getting auth user:", authError)
      }

      // Check account sessions
      try {
        const sessions = await account.listSessions()
        console.log("Active sessions:", sessions.total)
        sessions.sessions.forEach((session, index) => {
          console.log(`Session ${index + 1}:`, session.$id, session.provider, session.providerUid)
        })
      } catch (sessionError) {
        console.error("Error listing sessions:", sessionError)
      }
    } catch (error) {
      console.error("Debug error:", error)
    }
  }

  // Function to get all notifications regardless of user ID
  const getAllNotifications = async () => {
    try {
      const currentUser = await getCurrentUser()

      if (!currentUser || !currentUser.$id) {
        setDebugInfo("No authenticated user found")
        return []
      }

      setUserId(currentUser.$id)

      const databaseId = config.databaseId
      const collectionId = process.env.EXPO_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION_ID || ""

      if (!databaseId || !collectionId) {
        setDebugInfo("Appwrite configuration missing")
        return []
      }

      // Get all documents without filtering by user ID
      const allDocs = await databases.listDocuments(databaseId, collectionId)
      console.log("Total documents in collection:", allDocs.documents.length)

      if (allDocs.documents.length > 0) {
        // Map all notifications to the expected format
        const mappedNotifications = allDocs.documents.map((doc) => ({
          id: doc.$id,
          title: doc.title,
          message: doc.message,
          date: new Date(Number(doc.timestamp)).toLocaleString(),
          read: doc.read,
          type: doc.type || "SYSTEM",
          timestamp: Number(doc.timestamp),
          transactionId: doc.transactionId || undefined,
          userId: doc.userId || "unknown",
          priority: doc.priority,
          icon: doc.icon,
          data: doc.data ? JSON.parse(doc.data) : undefined,
        }))

        setAllNotifications(mappedNotifications)
        setDebugInfo(`Found ${mappedNotifications.length} total notifications in collection`)
        return mappedNotifications
      } else {
        setDebugInfo("No notifications found in collection")
        return []
      }
    } catch (error) {
      console.error("Error getting all notifications:", error)
      setDebugInfo(`Error: ${error instanceof Error ? error.message : String(error)}`)
      return []
    }
  }

  // Function to fix user IDs on notifications
  const fixNotificationUserIds = async () => {
    try {
      const currentUser = await getCurrentUser()

      if (!currentUser || !currentUser.$id) {
        Alert.alert("Error", "No authenticated user found")
        return
      }

      const databaseId = config.databaseId
      const collectionId = process.env.EXPO_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION_ID || ""

      if (!databaseId || !collectionId) {
        Alert.alert("Error", "Appwrite configuration missing")
        return
      }

      // Get all documents
      const allDocs = await databases.listDocuments(databaseId, collectionId)

      if (allDocs.documents.length === 0) {
        Alert.alert("Info", "No notifications found to update")
        return
      }

      // Ask for confirmation
      Alert.alert(
        "Update Notifications",
        `This will update ${allDocs.documents.length} notifications to be associated with your user ID (${currentUser.$id}). Continue?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Update",
            onPress: async () => {
              let updatedCount = 0

              // Update each notification
              for (const doc of allDocs.documents) {
                try {
                  await databases.updateDocument(databaseId, collectionId, doc.$id, {
                    userId: currentUser.$id,
                  })
                  updatedCount++
                } catch (updateError) {
                  console.error("Error updating notification:", updateError)
                }
              }

              Alert.alert("Success", `Updated ${updatedCount} notifications`)
              // Reload notifications
              loadNotifications()
            },
          },
        ],
      )
    } catch (error) {
      console.error("Error fixing notification user IDs:", error)
      Alert.alert("Error", `Failed to update notifications: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Function to directly check for notifications without using the service
  const checkNotificationsDirectly = async () => {
    try {
      const currentUser = await getCurrentUser()

      if (!currentUser || !currentUser.$id) {
        setDebugInfo("No authenticated user found")
        return
      }

      setUserId(currentUser.$id)

      const databaseId = config.databaseId
      const collectionId = process.env.EXPO_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION_ID || ""

      if (!databaseId || !collectionId) {
        setDebugInfo("Appwrite configuration missing")
        return
      }

      console.log("Checking notifications directly for user:", currentUser.$id)
      console.log("Using database ID:", databaseId)
      console.log("Using collection ID:", collectionId)

      // First try without any filters to see if the collection exists and has documents
      const allDocs = await databases.listDocuments(databaseId, collectionId)
      console.log("Total documents in collection:", allDocs.documents.length)

      // Then try with the user filter
      const response = await databases.listDocuments(databaseId, collectionId, [Query.equal("userId", currentUser.$id)])

      console.log("Documents for this user:", response.documents.length)

      if (response.documents.length > 0) {
        // We found notifications, map them to the expected format
        const mappedNotifications = response.documents.map((doc) => ({
          id: doc.$id,
          title: doc.title,
          message: doc.message,
          date: new Date(Number(doc.timestamp)).toLocaleString(),
          read: doc.read,
          type: doc.type || "SYSTEM",
          timestamp: Number(doc.timestamp),
          transactionId: doc.transactionId || undefined,
          userId: doc.userId,
          priority: doc.priority,
          icon: doc.icon,
          data: doc.data ? JSON.parse(doc.data) : undefined,
        }))

        setNotifications(mappedNotifications)
        setDebugInfo(`Found ${mappedNotifications.length} notifications directly`)
      } else {
        // If no notifications found for this user, get all notifications
        const allNotifications = await getAllNotifications()

        if (allNotifications.length > 0) {
          setDebugInfo(`Found ${allNotifications.length} total notifications, but none for user ${currentUser.$id}`)
        } else {
          setDebugInfo(`No notifications found for user ${currentUser.$id}`)
        }
      }
    } catch (error) {
      console.error("Error checking notifications directly:", error)
      setDebugInfo(`Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Function to load notifications
  const loadNotifications = async () => {
    try {
      setLoading(true)
      console.log("Fetching notifications...")
      const userNotifications = await getUserNotifications()
      console.log("Notifications received:", userNotifications.length)

      // Add debug info
      setDebugInfo(`Found ${userNotifications.length} notifications`)

      setNotifications(userNotifications)

      // If no notifications found using the service, try direct approach
      if (userNotifications.length === 0) {
        await checkNotificationsDirectly()
      }

      // Always get all notifications for debugging
      await getAllNotifications()
    } catch (error) {
      console.error("Error loading notifications:", error)
      setDebugInfo(`Error: ${error instanceof Error ? error.message : String(error)}`)

      // Try direct approach as fallback
      await checkNotificationsDirectly()
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Load notifications on component mount
  useEffect(() => {
    loadNotifications()
  }, [])

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

      // Also update in allNotifications if needed
      setAllNotifications((prevNotifications) =>
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

      // Also update in allNotifications if needed
      setAllNotifications((prevNotifications) => prevNotifications.map((n) => ({ ...n, read: true })))
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  // Toggle between showing all notifications or just user's notifications
  const toggleShowAll = () => {
    setShowAllNotifications(!showAllNotifications)
  }

  // Determine which notifications to display
  const displayNotifications = showAllNotifications ? allNotifications : notifications

  // Group notifications by date
  const groupedNotifications: { [key: string]: Notification[] } = {}
  displayNotifications.forEach((notification) => {
    // Extract just the date part for grouping
    const dateKey = notification.date.includes(" at ") ? notification.date.split(" at ")[0] : notification.date

    if (!groupedNotifications[dateKey]) {
      groupedNotifications[dateKey] = []
    }
    groupedNotifications[dateKey].push(notification)
  })

  return (
    <SafeAreaView className="flex-1 bg-emerald-400">
      <View className="bg-emerald-600 p-4 items-center justify-center mt-9">
        <Text className="text-xl font-semibold text-white">Inbox</Text>
      </View>

      {/* Mark all as read button */}
      <View className="bg-emerald-300 px-4 py-2 flex-row justify-between items-center">
        <Text className="text-sm font-medium">{showAllNotifications ? "All Notifications" : "Your Notifications"}</Text>
        <TouchableOpacity onPress={handleMarkAllAsRead}>
          <Text className="text-sm text-emerald-800">Mark all as read</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : displayNotifications.length === 0 ? (
        <View className="flex-1 justify-center items-center p-4">
          <Ionicons name="mail-open-outline" size={64} color="#059669" />
          <Text className="text-lg text-gray-700 mt-4">No notifications yet</Text>
          <Text className="text-sm text-gray-500 text-center mt-2">
            When you receive money or have account activity, you'll see notifications here.
          </Text>
          {/* Debug info */}
          <Text className="text-xs text-red-500 mt-4">{debugInfo}</Text>
          {userId && <Text className="text-xs text-blue-500 mt-1">User ID: {userId}</Text>}
          <View className="flex-row mt-4 gap-2">
            <TouchableOpacity onPress={loadNotifications} className="bg-emerald-600 px-4 py-2 rounded-md">
              <Text className="text-white">Retry</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={toggleShowAll} className="bg-emerald-700 px-4 py-2 rounded-md">
              <Text className="text-white">{showAllNotifications ? "Show Mine" : "Show All"}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={fixNotificationUserIds} className="mt-2 bg-red-600 px-4 py-2 rounded-md">
            <Text className="text-white">Fix User IDs</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={debugUserIds} className="mt-2 bg-blue-600 px-4 py-2 rounded-md">
            <Text className="text-white">Debug User IDs</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="flex-1">
          <View className="bg-emerald-500 px-4 py-2 flex-row justify-between items-center">
            <Text className="text-xs text-white">Found {displayNotifications.length} notifications</Text>
            <TouchableOpacity onPress={toggleShowAll}>
              <Text className="text-xs text-white underline">
                {showAllNotifications ? "Show Mine Only" : "Show All Notifications"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
            {Object.entries(groupedNotifications).map(([dateGroup, groupNotifications]) => (
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
                      {showAllNotifications && (
                        <Text className="text-xs text-gray-400 mt-1">
                          User: {notification.userId === userId ? "You" : notification.userId.substring(0, 8)}
                        </Text>
                      )}
                    </View>
                    <Text className="text-xs text-gray-500">
                      {notification.date.includes(" at ") ? notification.date.split(" at ")[1] : ""}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  )
}

