"use client"

import React, { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, FlatList, SafeAreaView, ActivityIndicator } from "react-native"
import { getAllUserTransactions, getAuthUserId } from "@/lib/transaction-service"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import DateRangePicker from "@/components/date-range-picker"

// Updated transaction type to match our new model without status
type Transaction = {
  id: string
  date: string
  time: string
  type: string
  amount: number
  reference?: string
  balance?: number // Added balance field
}

export default function TransactionHistory() {
  const [searchQuery] = useState("")
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
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [userId, setUserId] = useState<string>("")
  const router = useRouter()

  // Format transaction type to be more readable
  const formatTransactionType = (type: string): string => {
    switch (type) {
      case "CASH_IN":
        return "Cash In"
      case "CASH_OUT":
        return "Cash Out"
      case "SEND":
        return "Send"
      case "RECEIVE":
        return "Receive"
      default:
        return type.replace("_", " ")
    }
  }

  // Load transactions from Appwrite
  const loadTransactions = async () => {
    try {
      setLoading(true)

      // Get the auth user ID directly instead of using getCurrentUser
      // This ensures we're using the same ID as in transaction-service.ts
      const authUserId = await getAuthUserId()
      setUserId(authUserId)

      if (!authUserId) {
        console.log("No authenticated user found")
        setTransactions([])
        return
      }

      console.log("Loading transactions for auth user ID:", authUserId)

      // Use the getAllUserTransactions function which now uses the correct auth user ID
      const appwriteTransactions = await getAllUserTransactions()

      console.log(`Retrieved ${appwriteTransactions.length} transactions`)

      // Filter by date range if set
      let filteredTransactions = appwriteTransactions
      if (startDate && endDate) {
        const startTimestamp = startDate.setHours(0, 0, 0, 0)
        const endTimestamp = endDate.setHours(23, 59, 59, 999)

        filteredTransactions = appwriteTransactions.filter(
          (transaction) => transaction.timestamp >= startTimestamp && transaction.timestamp <= endTimestamp,
        )
      }

      // Convert Appwrite transactions to match your UI format
      const formattedTransactions: Transaction[] = filteredTransactions.map((transaction) => {
        const date = new Date(transaction.timestamp)

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
          // Use only the transaction type, not the description
          type: transaction.type,
          // For CASH_IN and RECEIVE, amount is positive; for CASH_OUT and SEND, amount is negative
          amount:
            transaction.type === "CASH_IN" || transaction.type === "RECEIVE" ? transaction.amount : -transaction.amount,
          reference: transaction.reference,
          balance: transaction.balance, // Include the balance
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
  }, [startDate, endDate])

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
        transaction.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

  const handleSelectDates = (start: Date | null, end: Date | null) => {
    setStartDate(start)
    setEndDate(end)
    setShowDatePicker(false)
  }

  const clearDateFilter = () => {
    setStartDate(null)
    setEndDate(null)
  }

  const handleTransactionPress = (transaction: Transaction) => {
    router.push({
      pathname: "/transaction-detail",
      params: {
        id: transaction.id,
        userId: userId,
      },
    })
  }

  const renderTransaction = ({ item: transaction }: { item: Transaction }) => (
    <TouchableOpacity
      className="p-3 bg-gray-50 rounded-lg mb-2 active:bg-gray-100"
      onPress={() => handleTransactionPress(transaction)}
    >
      <View className="flex-row justify-between items-start">
        <View>
          <Text className="font-medium">{formatTransactionType(transaction.type)}</Text>
          <Text className="text-sm text-gray-500">{transaction.time}</Text>
          {transaction.reference && <Text className="text-xs text-gray-400">Ref: {transaction.reference}</Text>}
          {transaction.balance !== undefined && (
            <Text className="text-xs text-gray-500">Balance: {formatPeso(transaction.balance)}</Text>
          )}
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
    <SafeAreaView className="flex-1 mb-[50px] bg-emerald-500">
      <View className="flex-1 bg-white mt-8">
        <View className="bg-emerald-500 p-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-2xl font-bold text-white">Transaction</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className="bg-emerald-600 px-3 py-1.5 rounded-full flex-row items-center"
            >
              <Ionicons name="calendar-outline" size={16} color="white" />
              <Text className="text-white ml-1">Filter</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View className="px-4 py-2 bg-emerald-600/50">
          <View className="flex-row justify-between items-center">
            <Text className="text-sm text-white">As of {currentDate}</Text>
            {(startDate || endDate) && (
              <View className="flex-row items-center">
                <Text className="text-white text-sm">
                  {startDate?.toLocaleDateString()} - {endDate?.toLocaleDateString()}
                </Text>
                <TouchableOpacity onPress={clearDateFilter} className="ml-2">
                  <Ionicons name="close-circle" size={16} color="white" />
                </TouchableOpacity>
              </View>
            )}
          </View>
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
                {(startDate || endDate) && (
                  <TouchableOpacity className="mt-4 bg-emerald-100 px-4 py-2 rounded-lg" onPress={clearDateFilter}>
                    <Text className="text-emerald-600">Clear date filter</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        )}
      </View>

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

