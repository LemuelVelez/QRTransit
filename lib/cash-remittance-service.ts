// lib/cash-remittance-service.ts
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
  revenueId?: string;
  verificationTimestamp?: string;
}

// Read collection ids straight from Expo public env
const CASH_REMITTANCE_COLLECTION_ID =
  process.env.EXPO_PUBLIC_APPWRITE_CASH_REMITTANCE_COLLECTION_ID ?? "";

const TRIPS_COLLECTION_ID =
  process.env.EXPO_PUBLIC_APPWRITE_TRIPS_COLLECTION_ID ?? "";

// Collections (read via unified helpers)
const getCashRemittanceCollectionId = () => CASH_REMITTANCE_COLLECTION_ID;
const getTripsCollectionId = () => TRIPS_COLLECTION_ID;

// Helpers
const generateRevenueId = () =>
  `rev_${Date.now()}_${Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0")}`;

function parseAmount(v: any): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (!v) return 0;
  const n = Number(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Latest verification cutoff across all buses for this conductor.
 * Trips AFTER this timestamp are considered "unremitted".
 */
async function getLatestVerificationCutoff(
  conductorId: string
): Promise<number> {
  try {
    const databaseId = config.databaseId;
    const col = getCashRemittanceCollectionId();
    if (!databaseId || !col) return 0;

    const res = await databases.listDocuments(databaseId, col, [
      Query.equal("conductorId", conductorId),
      Query.equal("status", "remitted"),
      Query.orderDesc("verificationTimestamp"),
      Query.limit(1),
    ]);

    if (res.documents.length === 0) return 0;
    const ts = Number(res.documents[0].verificationTimestamp || 0);
    return Number.isFinite(ts) ? ts : 0;
  } catch {
    return 0;
  }
}

export async function submitCashRemittance(
  remittance: Omit<CashRemittance, "id" | "timestamp" | "revenueId">
): Promise<string | null> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getCashRemittanceCollectionId();
    if (!databaseId || !collectionId)
      throw new Error("Appwrite configuration missing");

    const timestamp = Date.now().toString();
    const data = {
      ...remittance,
      timestamp,
      revenueId: generateRevenueId(),
      status: "pending" as const,
    };

    const result = await databases.createDocument(
      databaseId,
      collectionId,
      ID.unique(),
      data
    );
    return result.$id;
  } catch (error) {
    console.error("Error submitting cash remittance:", error);
    return null;
  }
}

export async function updateRemittanceStatus(
  remittanceId: string,
  status: "pending" | "remitted"
): Promise<boolean> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getCashRemittanceCollectionId();
    if (!databaseId || !collectionId)
      throw new Error("Appwrite configuration missing");

    const update: Record<string, any> = { status };
    if (status === "remitted")
      update.verificationTimestamp = Date.now().toString();

    await databases.updateDocument(
      databaseId,
      collectionId,
      remittanceId,
      update
    );
    return true;
  } catch (error) {
    console.error("Error updating remittance status:", error);
    return false;
  }
}

export async function getRemittanceStatus(
  busId: string,
  conductorId: string
): Promise<CashRemittance | null> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getCashRemittanceCollectionId();
    if (!databaseId || !collectionId)
      throw new Error("Appwrite configuration missing");

    const res = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("busId", busId),
      Query.equal("conductorId", conductorId),
      Query.orderDesc("timestamp"),
      Query.limit(1),
    ]);

    if (res.documents.length === 0) return null;

    const doc = res.documents[0];
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

export async function getRemittanceHistory(
  conductorId: string
): Promise<CashRemittance[]> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getCashRemittanceCollectionId();
    if (!databaseId || !collectionId)
      throw new Error("Appwrite configuration missing");

    const res = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("conductorId", conductorId),
      Query.orderDesc("timestamp"),
    ]);

    return res.documents.map((doc) => ({
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

export async function getTotalRemittedAmount(
  _conductorId: string
): Promise<string> {
  try {
    // Not required for the fix; leaving as simple placeholder.
    return "0.00";
  } catch (error) {
    console.error("Error calculating total remitted amount:", error);
    return "0.00";
  }
}

export async function getPendingRemittances(
  conductorId: string
): Promise<CashRemittance[]> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getCashRemittanceCollectionId();
    if (!databaseId || !collectionId)
      throw new Error("Appwrite configuration missing");

    const res = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("conductorId", conductorId),
      Query.equal("status", "pending"),
      Query.orderDesc("timestamp"),
    ]);

    return res.documents.map((doc) => ({
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
 * Sum unremitted CASH trips for the conductor (across all buses) using existing string fields.
 */
export async function getConductorRevenue(
  conductorId: string
): Promise<number> {
  try {
    const databaseId = config.databaseId;
    const tripsCol = getTripsCollectionId();
    if (!databaseId || !tripsCol)
      throw new Error("Appwrite configuration missing");

    const cutoff = await getLatestVerificationCutoff(conductorId);

    // Keep queries index-friendly: filter by conductorId in DB, then filter by method+cutoff in memory.
    const res = await databases.listDocuments(databaseId, tripsCol, [
      Query.equal("conductorId", conductorId),
      Query.orderDesc("timestamp"),
    ]);

    const total = res.documents
      .filter((doc: any) => (doc.paymentMethod || "").toLowerCase() === "cash")
      .filter((doc: any) => {
        const ts = Number(doc.timestamp || 0);
        return cutoff > 0 ? ts > cutoff : true;
      })
      .reduce((sum: number, doc: any) => {
        const amt = parseAmount(doc.totalFare || doc.fare);
        return sum + (Number.isFinite(amt) ? amt : 0);
      }, 0);

    return total;
  } catch (error) {
    console.error("Error getting conductor revenue:", error);
    return 0;
  }
}

/**
 * Sum unremitted CASH trips for a specific bus, using existing string fields.
 */
export async function getUnremittedCashByBus(
  conductorId: string,
  busNumber: string
): Promise<number> {
  try {
    const databaseId = config.databaseId;
    const tripsCol = getTripsCollectionId();
    if (!databaseId || !tripsCol)
      throw new Error("Appwrite configuration missing");

    const cutoff = await getLatestVerificationCutoff(conductorId);

    const res = await databases.listDocuments(databaseId, tripsCol, [
      Query.equal("conductorId", conductorId),
      Query.equal("busNumber", busNumber || ""),
      Query.orderDesc("timestamp"),
    ]);

    const total = res.documents
      .filter((doc: any) => (doc.paymentMethod || "").toLowerCase() === "cash")
      .filter((doc: any) => {
        const ts = Number(doc.timestamp || 0);
        return cutoff > 0 ? ts > cutoff : true;
      })
      .reduce((sum: number, doc: any) => {
        const amt = parseAmount(doc.totalFare || doc.fare);
        return sum + (Number.isFinite(amt) ? amt : 0);
      }, 0);

    return total;
  } catch (error) {
    console.error("Error getting unremitted cash by bus:", error);
    return 0;
  }
}

/** ✅ NEW: Provide the function your UI expects */
export async function hasUnremittedRevenue(
  conductorId: string,
  busNumber?: string
): Promise<boolean> {
  try {
    if (busNumber && busNumber.trim() !== "") {
      const t = await getUnremittedCashByBus(conductorId, busNumber);
      return t > 0;
    }
    const total = await getConductorRevenue(conductorId);
    return total > 0;
  } catch {
    return false;
  }
}
