// Service to handle transaction records with Appwrite
import { ID, Query } from "react-native-appwrite";
import { databases, config } from "./appwrite";
import { getCurrentUser } from "./appwrite";

// Transaction types
export type TransactionType = "CASH_IN" | "CASH_OUT" | "SEND" | "RECEIVE";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  paymentId?: string;
  timestamp: number;
  reference?: string;
  userId: string; // User ID for filtering transactions
}

// Get collection ID from environment variables
const getTransactionsCollectionId = () => {
  return process.env.EXPO_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "";
};

// Save a new transaction
export async function saveTransaction(transaction: Transaction): Promise<void> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getTransactionsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    // Convert numeric values to strings for Appwrite
    // This fixes the "Invalid document structure" errors
    await databases.createDocument(databaseId, collectionId, ID.unique(), {
      transactionId: transaction.id,
      type: transaction.type,
      amount: transaction.amount.toString(), // Convert to string
      description: transaction.description,
      status: transaction.status,
      paymentId: transaction.paymentId || "",
      timestamp: transaction.timestamp.toString(), // Convert to string
      reference: transaction.reference || "",
      userId: transaction.userId,
    });
  } catch (error) {
    console.error("Error saving transaction to Appwrite:", error);
    throw error;
  }
}

// Get all transactions for the current user
export async function getUserTransactions(): Promise<Transaction[]> {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || !currentUser.$id) {
      throw new Error("No authenticated user found");
      return [];
    }

    return getTransactions(currentUser.$id);
  } catch (error) {
    console.error("Error getting user transactions:", error);
    return [];
  }
}

// Get all transactions for a specific user ID
export async function getTransactions(userId: string): Promise<Transaction[]> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getTransactionsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
      return [];
    }

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("userId", userId),
      Query.orderDesc("timestamp"),
    ]);

    return response.documents.map((doc) => ({
      id: doc.transactionId,
      type: doc.type,
      amount: Number.parseFloat(doc.amount), // Convert string back to number
      description: doc.description,
      status: doc.status,
      paymentId: doc.paymentId,
      timestamp: Number.parseInt(doc.timestamp, 10), // Convert string back to number
      reference: doc.reference,
      userId: doc.userId,
    }));
  } catch (error) {
    console.error("Error getting transactions from Appwrite:", error);
    return [];
  }
}

// Update transaction status
export async function updateTransactionStatus(
  transactionId: string,
  status: "PENDING" | "COMPLETED" | "FAILED"
): Promise<void> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getTransactionsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    // First, find the document with this transactionId
    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("transactionId", transactionId),
    ]);

    if (response.documents.length === 0) {
      throw new Error("Transaction not found");
    }

    const documentId = response.documents[0].$id;

    // Update the document
    await databases.updateDocument(databaseId, collectionId, documentId, {
      status,
    });
  } catch (error) {
    console.error("Error updating transaction status in Appwrite:", error);
    throw error;
  }
}

// Generate a unique transaction ID
export function generateTransactionId(): string {
  return (
    "txn_" +
    Math.random()
      .toString(36)
      .substring(2, 15) +
    Math.random()
      .toString(36)
      .substring(2, 15)
  );
}
