"use client";

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Transaction = {
  id: number;
  date: string;
  time: string;
  description: string;
  amount: number;
  status: "completed" | "pending" | "failed";
};

export default function TransactionHistory() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const transactions: Transaction[] = [
    {
      id: 1,
      date: "Feb 2, 2025",
      time: "8:23 AM",
      description: "Send Money",
      amount: -200.0,
      status: "completed",
    },
    {
      id: 2,
      date: "Feb 2, 2025",
      time: "7:45 AM",
      description: "Send Money",
      amount: 500.0,
      status: "completed",
    },
    {
      id: 3,
      date: "Jan 1, 2025",
      time: "3:30 PM",
      description: "Send Money",
      amount: 100.0,
      status: "completed",
    },
    {
      id: 4,
      date: "Jan 1, 2025",
      time: "1:15 PM",
      description: "Send Money",
      amount: -280.0,
      status: "completed",
    },
  ];

  const groupedTransactions = transactions.reduce(
    (groups: Record<string, Transaction[]>, transaction) => {
      if (!groups[transaction.date]) {
        groups[transaction.date] = [];
      }
      groups[transaction.date].push(transaction);
      return groups;
    },
    {}
  );

  const filteredTransactions = Object.entries(groupedTransactions).filter(
    ([date, transactions]) => {
      return transactions.some(
        (transaction) =>
          transaction.description
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          transaction.amount.toString().includes(searchQuery)
      );
    }
  );

  const formatPeso = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
  };

  const renderTransaction = ({ item: transaction }: { item: Transaction }) => (
    <TouchableOpacity className="p-3 bg-gray-50 rounded-lg mb-2 active:bg-gray-100">
      <View className="flex-row justify-between items-start">
        <View>
          <Text className="font-medium">{transaction.description}</Text>
          <Text className="text-sm text-gray-500">{transaction.time}</Text>
        </View>
        <Text
          className={`font-mono text-lg ${
            transaction.amount < 0 ? "text-red-600" : "text-emerald-600"
          }`}
        >
          {transaction.amount < 0 ? "-" : "+"}
          {formatPeso(transaction.amount)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderDateGroup = ({
    item: [date, dayTransactions],
  }: {
    item: [string, Transaction[]];
  }) => (
    <View className="mb-6">
      <Text className="text-sm font-medium text-gray-500 mb-2">{date}</Text>
      {dayTransactions.map((transaction) => (
        <React.Fragment key={transaction.id}>
          {renderTransaction({ item: transaction })}
        </React.Fragment>
      ))}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-emerald-500">
      <View className="flex-1 bg-white mt-8">
        <View className="bg-emerald-500 p-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-2xl font-bold text-white">Transaction</Text>
            <View className="flex-row">
              <TouchableOpacity
                className="mr-2 p-2 bg-emerald-600 rounded-full"
                onPress={() => setIsSearchOpen(!isSearchOpen)}
              >
                <Ionicons name="search" size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity className="p-2 bg-emerald-600 rounded-full">
                <Ionicons name="filter" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
          {isSearchOpen && (
            <TextInput
              className="bg-white/10 border border-white/20 text-white p-2 rounded-lg"
              placeholder="Search transactions..."
              placeholderTextColor="rgba(255, 255, 255, 0.6)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          )}
        </View>
        <View className="px-4 py-2 bg-emerald-600/50">
          <Text className="text-sm text-white">As of Feb 6, 2025</Text>
        </View>
        <FlatList
          data={filteredTransactions}
          renderItem={renderDateGroup}
          keyExtractor={([date]) => date}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View className="p-8 items-center">
              <Text className="text-gray-500">No transactions found</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}
