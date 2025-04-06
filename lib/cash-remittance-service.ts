import { ID, Query } from "react-native-appwrite";
import { databases, config } from "./appwrite";

export interface CashRemittance {
  id?: string;
  busId: string;
  busNumber: string;
  conductorId: string;
  conductorName: string;
  status: "remitted" | "pending";
  amount: string;
  notes?: string;
  timestamp: string;
}

// Get the collection ID for cash remittance
const getCashRemittanceCollectionId = () => {
  return process.env.EXPO_PUBLIC_APPWRITE_CASH_REMITTANCE_COLLECTION_ID || "";
};

/**
 * Submit a cash remittance
 * @param remittance The remittance data to submit
 * @returns The ID of the created remittance document or null if failed
 */
export async function submitCashRemittance(
  remittance: Omit<CashRemittance, "id" | "timestamp">
): Promise<string | null> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getCashRemittanceCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    // Check if there's an existing remittance record for this bus and conductor
    const existingRemittanceResponse = await databases.listDocuments(
      databaseId,
      collectionId,
      [
        Query.equal("busId", remittance.busId),
        Query.equal("conductorId", remittance.conductorId),
        Query.limit(1),
      ]
    );

    const timestamp = Date.now().toString();
    const remittanceData = {
      ...remittance,
      timestamp: timestamp,
    };

    if (existingRemittanceResponse.documents.length > 0) {
      // Update existing record
      const existingRemittance = existingRemittanceResponse.documents[0];
      await databases.updateDocument(
        databaseId,
        collectionId,
        existingRemittance.$id,
        remittanceData
      );
      return existingRemittance.$id;
    } else {
      // Create new record
      const result = await databases.createDocument(
        databaseId,
        collectionId,
        ID.unique(),
        remittanceData
      );
      return result.$id;
    }
  } catch (error) {
    console.error("Error submitting cash remittance:", error);
    return null;
  }
}

/**
 * Get remittance status for a specific bus and conductor
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

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("busId", busId),
      Query.equal("conductorId", conductorId),
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
    const remittances = await getRemittanceHistory(conductorId);

    // Filter only remitted records
    const remittedRecords = remittances.filter((r) => r.status === "remitted");

    // Sum up the amounts
    const total = remittedRecords.reduce((sum, record) => {
      const amount = Number.parseFloat(record.amount) || 0;
      return sum + amount;
    }, 0);

    return total.toFixed(2);
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
    }));
  } catch (error) {
    console.error("Error getting pending remittances:", error);
    return [];
  }
}
