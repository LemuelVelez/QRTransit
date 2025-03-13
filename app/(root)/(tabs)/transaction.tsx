"use client"

import React, { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, FlatList, SafeAreaView, TextInput, ActivityIndicator } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { getUserTransactions } from "@/lib/transaction-service"
import { getCurrentUser } from "@/lib/appwrite"

// Updated transaction type to only have completed or failed status
type Transaction = {
  id: string
  date: string
  time: string
  description: string
  amount: number
  type: string
  reference?: string
}

export default function TransactionHistory() {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentDate] = useState(
    new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  )

  // Load transactions from Appwrite
  const loadTransactions = async () => {
    try {
      setLoading(true)
      const user = await getCurrentUser()

      if (!user) {
        console.log("No authenticated user found")
        setTransactions([])
        return
      }

      const appwriteTransactions = await getUserTransactions()

      // Convert Appwrite transactions to match your UI format
      const formattedTransactions: Transaction[] = appwriteTransactions.map((transaction) => {
        const date = new Date(transaction.timestamp)

        // Map any "pending" status to "failed" or handle as needed
        let status = transaction.status.toLowerCase()
        if (status !== "completed") {
          status = "failed"
        }

        return {
          id: transaction.id,
          date: date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          time: date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }),
          description:
            transaction.type.replace("_", " ").charAt(0) + transaction.type.replace("_", " ").slice(1).toLowerCase(),
          // For CASH_IN and RECEIVE, amount is positive; for CASH_OUT and SEND, amount is negative
          amount:
            transaction.type === "CASH_IN" || transaction.type === "RECEIVE" ? transaction.amount : -transaction.amount,
          status: status as "completed" | "failed",
          type: transaction.type,
          reference: transaction.reference,
        }
      })

      setTransactions(formattedTransactions)
    } catch (error) {
      console.error("Error loading transactions:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Load transactions on component mount
  useEffect(() => {
    loadTransactions()
  }, [])

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true)
    loadTransactions()
  }

  // Group transactions by date
  const groupedTransactions = transactions.reduce((groups: Record<string, Transaction[]>, transaction) => {
    if (!groups[transaction.date]) {
      groups[transaction.date] = []
    }
    groups[transaction.date].push(transaction)
    return groups
  }, {})

  // Filter transactions based on search query
  const filteredTransactions = Object.entries(groupedTransactions).filter(([date, transactions]) => {
    return transactions.some(
      (transaction) =>
        transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.amount.toString().includes(searchQuery) ||
        (transaction.reference && transaction.reference.toLowerCase().includes(searchQuery.toLowerCase())),
    )
  })

  const formatPeso = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount))
  }

  const renderTransaction = ({ item: transaction }: { item: Transaction }) => (
    <TouchableOpacity className="p-3 bg-gray-50 rounded-lg mb-2 active:bg-gray-100">
      <View className="flex-row justify-between items-start">
        <View>
          <Text className="font-medium">{transaction.description}</Text>
          <Text className="text-sm text-gray-500">{transaction.time}</Text>
          {transaction.reference && <Text className="text-xs text-gray-400">Ref: {transaction.reference}</Text>}
        </View>
        <View className="items-end">
          <Text className={`font-mono text-lg ${transaction.amount < 0 ? "text-red-600" : "text-emerald-600"}`}>
            {transaction.amount < 0 ? "-" : "+"}
            {formatPeso(transaction.amount)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  const renderDateGroup = ({
    item: [date, dayTransactions],
  }: {
    item: [string, Transaction[]]
  }) => (
    <View className="mb-6">
      <Text className="text-sm font-medium text-gray-500 mb-2">{date}</Text>
      {dayTransactions.map((transaction) => (
        <React.Fragment key={transaction.id}>{renderTransaction({ item: transaction })}</React.Fragment>
      ))}
    </View>
  )

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
          <Text className="text-sm text-white">As of {currentDate}</Text>
        </View>

        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#10b981" />
            <Text className="mt-4 text-emerald-700">Loading transactions...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredTransactions}
            renderItem={renderDateGroup}
            keyExtractor={([date]) => date}
            contentContainerStyle={{ padding: 16 }}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            ListEmptyComponent={
              <View className="p-8 items-center">
                <Text className="text-gray-500">No transactions found</Text>
                <TouchableOpacity className="mt-4 bg-emerald-500 px-4 py-2 rounded-lg" onPress={handleRefresh}>
                  <Text className="text-white">Refresh</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  )
}

