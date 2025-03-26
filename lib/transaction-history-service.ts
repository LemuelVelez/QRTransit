import { databases, config } from "./appwrite";
import { Query } from "react-native-appwrite";

interface Transaction {
  id: string;
  passengerName: string;
  fare: string;
  from: string;
  to: string;
  timestamp: number;
  paymentMethod: string;
  transactionId: string;
  conductorId: string;
  passengerPhoto?: string;
}

// Get the collection ID for transactions
const getTransactionsCollectionId = () => {
  return process.env.EXPO_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "";
};

// Generate a numeric transaction number (no letters)
export function generateTransactionId(): string {
  // Generate a 10-digit numeric transaction ID
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

// Get transaction history for a conductor
export async function getTransactionHistory(
  conductorId: string
): Promise<Transaction[]> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getTransactionsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
      return [];
    }

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("conductorId", conductorId),
      Query.orderDesc("timestamp"),
    ]);

    return response.documents.map((doc) => ({
      id: doc.$id,
      passengerName: doc.passengerName || "Unknown Passenger",
      fare: doc.fare || "₱0.00",
      from: doc.from || "Unknown",
      to: doc.to || "Unknown",
      timestamp: Number.parseInt(doc.timestamp) || Date.now(),
      paymentMethod: doc.paymentMethod || "QR",
      transactionId: doc.transactionId || "0000000000",
      conductorId: doc.conductorId,
      passengerPhoto: doc.passengerPhoto,
    }));
  } catch (error) {
    console.error("Error getting transaction history:", error);
    return [];
  }
}

// Get transaction details
export async function getTransactionDetails(
  transactionId: string
): Promise<Transaction | null> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getTransactionsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    const document = await databases.getDocument(
      databaseId,
      collectionId,
      transactionId
    );

    return {
      id: document.$id,
      passengerName: document.passengerName || "Unknown Passenger",
      fare: document.fare || "₱0.00",
      from: document.from || "Unknown",
      to: document.to || "Unknown",
      timestamp: Number.parseInt(document.timestamp) || Date.now(),
      paymentMethod: document.paymentMethod || "QR",
      transactionId: document.transactionId || "0000000000",
      conductorId: document.conductorId,
      passengerPhoto: document.passengerPhoto,
    };
  } catch (error) {
    console.error("Error getting transaction details:", error);
    return null;
  }
}

// Save a new transaction
export async function saveTransaction(
  transaction: Omit<Transaction, "id">
): Promise<string | null> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getTransactionsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    const result = await databases.createDocument(
      databaseId,
      collectionId,
      "unique()",
      transaction
    );

    return result.$id;
  } catch (error) {
    console.error("Error saving transaction:", error);
    return null;
  }
}

// Get transactions by date range
export async function getTransactionsByDateRange(
  conductorId: string,
  startDate: Date,
  endDate: Date
): Promise<Transaction[]> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getTransactionsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
      return [];
    }

    // Convert dates to timestamps
    const startTimestamp = startDate.getTime().toString();
    const endTimestamp = endDate.setHours(23, 59, 59, 999).toString();

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("conductorId", conductorId),
      Query.greaterThanEqual("timestamp", startTimestamp),
      Query.lessThanEqual("timestamp", endTimestamp),
      Query.orderDesc("timestamp"),
    ]);

    return response.documents.map((doc) => ({
      id: doc.$id,
      passengerName: doc.passengerName || "Unknown Passenger",
      fare: doc.fare || "₱0.00",
      from: doc.from || "Unknown",
      to: doc.to || "Unknown",
      timestamp: Number.parseInt(doc.timestamp) || Date.now(),
      paymentMethod: doc.paymentMethod || "QR",
      transactionId: doc.transactionId || "0000000000",
      conductorId: doc.conductorId,
      passengerPhoto: doc.passengerPhoto,
    }));
  } catch (error) {
    console.error("Error getting transactions by date range:", error);
    return [];
  }
}
