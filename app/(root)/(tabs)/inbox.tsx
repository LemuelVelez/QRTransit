import React from "react";
import { View, Text, ScrollView, SafeAreaView } from "react-native";
import { Entypo } from "@expo/vector-icons";

const notifications = [
  {
    id: 1,
    title: "Express Send Notification",
    message: "You have received PHP 300.00",
    date: "Feb 1, 2025",
  },
  {
    id: 2,
    title: "Express Send Notification",
    message: "You have received PHP 300.00",
    date: "Feb 1, 2025",
  },
  {
    id: 3,
    title: "Express Send Notification",
    message: "You have received PHP 300.00",
    date: "Feb 1, 2025",
  },
  {
    id: 4,
    title: "Express Send Notification",
    message: "You have received PHP 300.00",
    date: "Feb 1, 2025",
  },
  {
    id: 5,
    title: "Express Send Notification",
    message: "You have received PHP 300.00",
    date: "Feb 1, 2025",
  },
  {
    id: 6,
    title: "Express Send Notification",
    message: "You have received PHP 300.00",
    date: "Feb 1, 2025",
  },
  {
    id: 7,
    title: "Express Send Notification",
    message: "You have received PHP 300.00",
    date: "Feb 1, 2025",
  },
  {
    id: 8,
    title: "Express Send Notification",
    message: "You have received PHP 300.00",
    date: "Feb 1, 2025",
  },
];

export default function Inbox() {
  return (
    <SafeAreaView className="flex-1 bg-emerald-400">
      <View className="bg-emerald-600 p-4 items-center justify-center mt-9">
        <Text className="text-xl font-semibold text-white">Inbox</Text>
      </View>
      <View className="bg-emerald-300 px-4 py-2">
        <Text className="text-sm font-medium">Latest</Text>
      </View>
      <ScrollView>
        {notifications.map((notification) => (
          <View
            key={notification.id}
            className="flex-row items-start gap-3 bg-white px-4 py-3 border-b border-gray-200"
          >
            <Entypo name="mail" size={20} color="#4B5563" className="mt-1" />
            <View className="flex-1">
              <Text className="text-sm font-medium">{notification.title}</Text>
              <Text className="text-sm text-gray-600">
                {notification.message}
              </Text>
            </View>
            <Text className="text-xs text-gray-500">{notification.date}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
