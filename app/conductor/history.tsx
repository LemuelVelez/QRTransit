"use client"

import { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StatusBar, Alert } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { checkRoutePermission, getCurrentUser } from "@/lib/appwrite"
import DateRangePicker from "@/components/date-range-picker"
import { getTransactionHistory, getTransactionsByDateRange } from "@/lib/transaction-history-service"

interface Transaction {
  id: string
  passengerName: string
  fare: string
  from: string
  to: string
  timestamp: number
  paymentMethod: string
  transactionId: string
  conductorId: string
  passengerPhoto?: string
}

export default function TransactionHistoryScreen() {
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [conductorId, setConductorId] = useState("")
  const router = useRouter()

  useEffect(() => {
    async function checkAccess() {
      try {
        // Check if user has conductor role specifically
        const hasPermission = await checkRoutePermission("conductor")

        if (!hasPermission) {
          Alert.alert("Access Denied", "You don't have permission to access this screen.")
          // Redirect to home
          router.replace("/")
          return
        }

        // Load conductor info
        try {
          const user = await getCurrentUser()
          if (user) {
            setConductorId(user.$id || "")

            // Load transaction history
            await loadTransactions(user.$id || "")
          }
        } catch (userError) {
          console.error("Error loading conductor data:", userError)
        }
      } catch (error) {
        console.error("Error checking access:", error)
        Alert.alert("Error", "Failed to verify access permissions.")
        router.replace("/")
      }
    }

    checkAccess()
  }, [])

  useEffect(() => {
    if (startDate && endDate && conductorId) {
      filterTransactionsByDate()
    } else {
      setFilteredTransactions(transactions)
    }
  }, [startDate, endDate, transactions])

  const loadTransactions = async (id: string) => {
    try {
      setLoading(true)
      const history = await getTransactionHistory(id)
      setTransactions(history)
      setFilteredTransactions(history)
    } catch (error) {
      console.error("Error loading transaction history:", error)
      Alert.alert("Error", "Failed to load transaction history.")
    } finally {
      setLoading(false)
    }
  }

  const filterTransactionsByDate = async () => {
    if (!startDate || !endDate || !conductorId) return

    try {
      setLoading(true)
      const filtered = await getTransactionsByDateRange(conductorId, startDate, endDate)
      setFilteredTransactions(filtered)
    } catch (error) {
      console.error("Error filtering transactions:", error)
      Alert.alert("Error", "Failed to filter transactions.")
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setStartDate(null)
    setEndDate(null)
    setFilteredTransactions(transactions)
  }

  const handleViewDetails = (transaction: Transaction) => {
    router.push({
      pathname: "/conductor/transaction-details" as any,
      params: {
        id: transaction.id,
        passengerName: transaction.passengerName,
        fare: transaction.fare,
        from: transaction.from,
        to: transaction.to,
        timestamp: transaction.timestamp.toString(),
        paymentMethod: transaction.paymentMethod,
        transactionId: transaction.transactionId,
        passengerPhoto: transaction.passengerPhoto,
      },
    })
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-emerald-400">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <ActivityIndicator size="large" color="white" />
        <Text className="mt-4 text-white">Loading transactions...</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-emerald-400">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      <View className="mt-16 px-4">
        <Text className="text-white text-2xl font-bold mb-4 text-center">Transaction History</Text>

        {/* Date Filter */}
        <View className="bg-white rounded-lg p-4 mb-4">
          <TouchableOpacity
            className="flex-row items-center justify-between mb-2"
            onPress={() => setShowDatePicker(true)}
          >
            <Text className="text-black font-bold">Filter by Date</Text>
            <Ionicons name="calendar" size={24} color="#059669" />
          </TouchableOpacity>

          {(startDate || endDate) && (
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-700">
                {startDate ? startDate.toLocaleDateString() : "Any"} - {endDate ? endDate.toLocaleDateString() : "Any"}
              </Text>
              <TouchableOpacity onPress={clearFilters}>
                <Ionicons name="close-circle" size={20} color="#059669" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Transaction List */}
        {filteredTransactions.length === 0 ? (
          <View className="bg-white rounded-lg p-8 items-center justify-center">
            <Ionicons name="document-text-outline" size={48} color="#059669" />
            <Text className="text-gray-700 mt-4 text-center">No transactions found for the selected period.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredTransactions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity className="bg-white rounded-lg p-4 mb-3" onPress={() => handleViewDetails(item)}>
                <View className="flex-row justify-between mb-2">
                  <Text className="font-bold text-black">{item.passengerName}</Text>
                  <Text className="font-bold text-emerald-600">{item.fare}</Text>
                </View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-gray-600">From: {item.from}</Text>
                  <Text className="text-gray-600">To: {item.to}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-500">{formatDate(item.timestamp)}</Text>
                  <View className="flex-row items-center">
                    <Ionicons name={item.paymentMethod === "QR" ? "qr-code" : "cash"} size={16} color="#059669" />
                    <Text className="text-gray-500 ml-1">{item.paymentMethod}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* Date Range Picker Modal */}
      <DateRangePicker
        visible={showDatePicker}
        startDate={startDate}
        endDate={endDate}
        onSelectDates={(start, end) => {
          setStartDate(start)
          setEndDate(end)
          setShowDatePicker(false)
        }}
        onCancel={() => setShowDatePicker(false)}
      />
    </View>
  )
}

