import {
    generateTransactionId,
    saveTransaction,
    createTransactionNotification,
    calculateUserBalance,
  } from "./transaction-service"
  
  interface QRData {
    userId: string
    name: string
  }
  
  interface PaymentResult {
    success: boolean
    transactionId?: string
    error?: string
    balance?: number
  }
  
  // Parse QR code data
  export function parseQRData(data: string): QRData | null {
    try {
      // Try to parse as JSON first
      try {
        const jsonData = JSON.parse(data)
        if (jsonData.userId) {
          return {
            userId: jsonData.userId,
            name: jsonData.name || "Unknown User",
          }
        }
      } catch (e) {
        // Not JSON, continue with URL parsing
      }
  
      // Check if it's a URL with query parameters
      if (data.includes("?")) {
        const url = new URL(data)
        const userId = url.searchParams.get("userId")
        const name = url.searchParams.get("name")
  
        if (userId) {
          return {
            userId,
            name: name || "Unknown User",
          }
        }
      }
  
      // If it's just a userId string
      if (data.startsWith("user_") || data.startsWith("auth_")) {
        return {
          userId: data,
          name: "Unknown User",
        }
      }
  
      return null
    } catch (error) {
      console.error("Error parsing QR data:", error)
      return null
    }
  }
  
  // Process payment
  export async function processPayment(
    passengerUserId: string,
    amount: number,
    description: string,
  ): Promise<PaymentResult> {
    try {
      // Check if user has sufficient balance
      const currentBalance = await calculateUserBalance(passengerUserId)
  
      if (currentBalance < amount) {
        return {
          success: false,
          error: `Insufficient balance. Current balance is ₱${currentBalance.toFixed(2)}`,
          balance: currentBalance,
        }
      }
  
      // Create transaction
      const transactionId = generateTransactionId()
      const timestamp = Date.now()
  
      const transaction = {
        id: transactionId,
        type: "CASH_OUT" as const,
        amount: amount,
        description: description || "Fare payment",
        timestamp: timestamp,
        userId: passengerUserId,
      }
  
      // Save transaction
      await saveTransaction(transaction)
  
      // Create notification
      await createTransactionNotification(transaction, passengerUserId)
  
      // Get updated balance
      const newBalance = await calculateUserBalance(passengerUserId)
  
      return {
        success: true,
        transactionId,
        balance: newBalance,
      }
    } catch (error) {
      console.error("Payment processing error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }
    }
  }
  
  