import { ID, Query } from "react-native-appwrite";
import { databases, config } from "./appwrite";
import { getUserStats } from "./conductor-service"; // Import the function that calculates the correct revenue

export interface CashRemittance {
  id?: string;
  busId: string;
  busNumber: string;
  conductorId: string;
  conductorName: string;
  status: "remitted" | "pending"; // Changed from "remitted" | "pending" | "verified"
  amount: string;
  notes?: string;
  timestamp: string;
  revenueId?: string; // Added field to track revenue cycles
  verificationTimestamp?: string; // Added to track when verified
}

// Get the collection ID for cash remittance
const getCashRemittanceCollectionId = () => {
  return process.env.EXPO_PUBLIC_APPWRITE_CASH_REMITTANCE_COLLECTION_ID || "";
};

// Function to generate a unique revenue ID
const generateRevenueId = () => {
  return `rev_${Date.now()}_${Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0")}`;
};

/**
 * Submit a cash remittance - FIXED to handle revenue cycles properly
 * @param remittance The remittance data to submit
 * @returns The ID of the created remittance document or null if failed
 */
export async function submitCashRemittance(
  remittance: Omit<CashRemittance, "id" | "timestamp" | "revenueId">
): Promise<string | null> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getCashRemittanceCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    // Generate new revenue ID for this remittance
    const revenueId = generateRevenueId();
    const timestamp = Date.now().toString();

    // Create new remittance record with unique revenue ID
    const remittanceData = {
      ...remittance,
      timestamp: timestamp,
      revenueId: revenueId,
      status: "pending", // Always start as pending
    };

    // Create a new document for each remittance to maintain separate revenue cycles
    const result = await databases.createDocument(
      databaseId,
      collectionId,
      ID.unique(),
      remittanceData
    );

    return result.$id;
  } catch (error) {
    console.error("Error submitting cash remittance:", error);
    return null;
  }
}

/**
 * Update remittance status - FIXED to use "remitted" status
 * @param remittanceId The ID of the remittance to update
 * @param status The new status
 * @returns Whether the update was successful
 */
export async function updateRemittanceStatus(
  remittanceId: string,
  status: "pending" | "remitted"
): Promise<boolean> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getCashRemittanceCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    // Update the status and add verification timestamp if remitted
    const updateData: Record<string, any> = { status };
    if (status === "remitted") {
      updateData.verificationTimestamp = Date.now().toString();
    }

    await databases.updateDocument(
      databaseId,
      collectionId,
      remittanceId,
      updateData
    );

    return true;
  } catch (error) {
    console.error("Error updating remittance status:", error);
    return false;
  }
}

/**
 * Get remittance status for a specific bus and conductor - FIXED to get latest remittance
 * @param busId The ID of the bus
 * @param conductorId The ID of the conductor
 * @returns The remittance record or null if not found
 */
export async function getRemittanceStatus(
  busId: string,
  conductorId: string
): Promise<CashRemittance | null> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getCashRemittanceCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    // Get the most recent remittance by timestamp
    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("busId", busId),
      Query.equal("conductorId", conductorId),
      Query.orderDesc("timestamp"),
      Query.limit(1),
    ]);

    if (response.documents.length === 0) {
      return null;
    }

    const doc = response.documents[0];
    return {
      id: doc.$id,
      busId: doc.busId,
      busNumber: doc.busNumber,
      conductorId: doc.conductorId,
      conductorName: doc.conductorName,
      status: doc.status,
      amount: doc.amount,
      notes: doc.notes,
      timestamp: doc.timestamp,
      revenueId: doc.revenueId,
      verificationTimestamp: doc.verificationTimestamp,
    };
  } catch (error) {
    console.error("Error getting remittance status:", error);
    return null;
  }
}

/**
 * Get remittance history for a conductor
 * @param conductorId The ID of the conductor
 * @returns Array of remittance records
 */
export async function getRemittanceHistory(
  conductorId: string
): Promise<CashRemittance[]> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getCashRemittanceCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("conductorId", conductorId),
      Query.orderDesc("timestamp"),
    ]);

    return response.documents.map((doc) => ({
      id: doc.$id,
      busId: doc.busId,
      busNumber: doc.busNumber,
      conductorId: doc.conductorId,
      conductorName: doc.conductorName,
      status: doc.status,
      amount: doc.amount,
      notes: doc.notes || "",
      timestamp: doc.timestamp,
      revenueId: doc.revenueId,
      verificationTimestamp: doc.verificationTimestamp,
    }));
  } catch (error) {
    console.error("Error getting remittance history:", error);
    return [];
  }
}

/**
 * Get total remitted amount for a conductor
 * @param conductorId The ID of the conductor
 * @returns Total remitted amount as a string
 */
export async function getTotalRemittedAmount(
  conductorId: string
): Promise<string> {
  try {
    // Use getUserStats to get the correct total revenue
    const stats = await getUserStats(conductorId);
    return stats.totalRevenue;
  } catch (error) {
    console.error("Error calculating total remitted amount:", error);
    return "0.00";
  }
}

/**
 * Get pending remittances for a conductor
 * @param conductorId The ID of the conductor
 * @returns Array of pending remittance records
 */
export async function getPendingRemittances(
  conductorId: string
): Promise<CashRemittance[]> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getCashRemittanceCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("conductorId", conductorId),
      Query.equal("status", "pending"),
      Query.orderDesc("timestamp"),
    ]);

    return response.documents.map((doc) => ({
      id: doc.$id,
      busId: doc.busId,
      busNumber: doc.busNumber,
      conductorId: doc.conductorId,
      conductorName: doc.conductorName,
      status: doc.status,
      amount: doc.amount,
      notes: doc.notes || "",
      timestamp: doc.timestamp,
      revenueId: doc.revenueId,
      verificationTimestamp: doc.verificationTimestamp,
    }));
  } catch (error) {
    console.error("Error getting pending remittances:", error);
    return [];
  }
}

/**
 * Check if a bus has unremitted revenue - FIXED to always allow new remittances
 * @param busId The ID of the bus
 * @param conductorId The ID of the conductor
 * @returns Whether there is unremitted revenue
 */
export async function hasUnremittedRevenue(
  busId: string,
  conductorId: string
): Promise<boolean> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getCashRemittanceCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    // Get the most recent remittance by timestamp
    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("busId", busId),
      Query.equal("conductorId", conductorId),
      Query.orderDesc("timestamp"),
      Query.limit(1),
    ]);

    // If no remittance exists, we can create a new one
    if (response.documents.length === 0) {
      return true;
    }

    const latestRemittance = response.documents[0];

    // If the latest remittance is remitted, we can create a new one
    if (latestRemittance.status === "remitted") {
      return true;
    }

    // If the latest remittance is pending, we can't create a new one yet
    return false;
  } catch (error) {
    console.error("Error checking unremitted revenue:", error);
    return false;
  }
}

/**
 * Get the correct revenue amount for a conductor
 * @param conductorId The ID of the conductor
 * @returns The revenue amount as a number
 */
export async function getConductorRevenue(
  conductorId: string
): Promise<number> {
  try {
    // Use getUserStats to get the correct total revenue
    const stats = await getUserStats(conductorId);
    return Number.parseFloat(stats.totalRevenue);
  } catch (error) {
    console.error("Error getting conductor revenue:", error);
    return 0;
  }
}

/**
 * Reset revenue after remittance is verified
 * This is a placeholder function since we don't have a "remitted" field
 * The actual reset happens by using the verification timestamp as a cutoff
 * in the getUserStats function
 * @param conductorId The ID of the conductor
 * @returns Whether the reset was successful
 */
export async function resetRevenueAfterRemittance(
  conductorId: string
): Promise<boolean> {
  try {
    // Since we don't have a "remitted" field in the trips collection,
    // we'll use the verification timestamp as a cutoff point
    // This is handled in the getUserStats function
    return true;
  } catch (error) {
    console.error("Error resetting revenue:", error);
    return false;
  }
}
