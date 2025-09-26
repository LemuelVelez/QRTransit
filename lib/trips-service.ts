import { databases, config } from "./appwrite";
import { ID, Query } from "react-native-appwrite";

export interface Trip {
  id: string;
  passengerName: string;
  fare: string; // keep total for backward compatibility
  from: string;
  to: string;
  timestamp: number;
  paymentMethod: string;
  transactionId: string;
  conductorId: string;
  passengerPhoto?: string;
  passengerType?: string;
  kilometer?: string;
  totalTrips?: string;
  totalPassengers?: string; // source of truth for group size
  busNumber?: string;
  busType?: string; // ✅ added

  // Back-compat + explicit fields
  passengerCount?: string; // kept for backward compatibility
  farePerPassenger?: string;
  totalFare?: string; // explicit total
}

// Helpers to read env/config safely
const getTripsCollectionId = (): string =>
  (process.env.EXPO_PUBLIC_APPWRITE_TRIPS_COLLECTION_ID as
    | string
    | undefined) ?? "";

const getDatabaseId = (): string =>
  (config.databaseId as string | undefined) ?? "";

/** ---------- Pagination helpers (unlimited) ---------- */
const PAGE_SIZE = 100;

/**
 * Fetch all documents for a given query by paging with cursorAfter.
 * Ensure you pass a stable order in baseQueries, e.g., orderDesc("timestamp").
 */
async function listAllDocuments(
  databaseId: string,
  collectionId: string,
  baseQueries: string[],
  opts?: { pageSize?: number }
): Promise<any[]> {
  const limit = Math.min(Math.max(opts?.pageSize ?? PAGE_SIZE, 1), 100);

  const all: any[] = [];
  let cursor: string | null = null;

  while (true) {
    const queries = [...baseQueries, Query.limit(limit)];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const res = await databases.listDocuments(
      databaseId,
      collectionId,
      queries
    );
    const docs = res.documents ?? [];
    all.push(...docs);

    if (docs.length < limit) break;
    cursor = docs[docs.length - 1].$id;

    // Be gentle to API
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 25));
  }
  return all;
}
/** -------------------------------------------------------------------- */

export function generateTripId(): string {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

// ---- helpers ----
const safeParseTimestamp = (v: any): number => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  if (Number.isFinite(n) && n > 0) return n;
  const p = Date.parse(String(v));
  return Number.isFinite(p) ? p : Date.now();
};

// Attempt create; if Appwrite complains about an unknown attribute, strip it and retry.
async function createDocumentWithSchemaFallback(
  databaseId: string,
  collectionId: string,
  payload: Record<string, any>,
  maxStrips = 5
): Promise<string> {
  let data = { ...payload };
  for (let i = 0; i < maxStrips; i++) {
    try {
      const res = await databases.createDocument(
        databaseId,
        collectionId,
        ID.unique(),
        data
      );
      return res.$id;
    } catch (err) {
      // ✅ Safely extract error message without assuming shape
      let msg = "";
      if (typeof err === "object" && err !== null && "message" in err) {
        msg = String((err as any).message);
      } else {
        msg = String(err);
      }

      const match = msg.match(/Unknown attribute:\s*"([^"]+)"/);
      if (match) {
        const badKey = match[1];
        if (Object.prototype.hasOwnProperty.call(data, badKey)) {
          delete (data as any)[badKey];
          continue;
        }
      }
      throw err;
    }
  }
  const res = await databases.createDocument(
    databaseId,
    collectionId,
    ID.unique(),
    {}
  );
  return res.$id;
}

export async function getTripHistory(conductorId: string): Promise<Trip[]> {
  try {
    const databaseId = getDatabaseId();
    const collectionId = getTripsCollectionId();
    if (databaseId === "" || collectionId === "") {
      throw new Error(
        "Appwrite configuration missing (check EXPO_PUBLIC_APPWRITE_TRIPS_COLLECTION_ID and databaseId)"
      );
    }

    const docs = await listAllDocuments(databaseId, collectionId, [
      Query.equal("conductorId", conductorId),
      Query.orderDesc("timestamp"),
    ]);

    return docs.map((doc: any) => {
      const tpRaw = (doc.totalPassengers ?? doc.passengerCount) as
        | string
        | undefined;
      const totalPassengers =
        tpRaw && String(tpRaw).trim() !== "" ? String(tpRaw) : "1";

      return {
        id: doc.$id,
        passengerName: doc.passengerName ?? "Unknown Passenger",
        fare: doc.fare ?? "₱0.00",
        totalFare: doc.totalFare ?? doc.fare,
        farePerPassenger: doc.farePerPassenger,
        totalPassengers,
        passengerCount: totalPassengers,
        from: doc.from ?? "Unknown",
        to: doc.to ?? "Unknown",
        timestamp: safeParseTimestamp(doc.timestamp),
        paymentMethod: doc.paymentMethod ?? "QR",
        transactionId: doc.transactionId ?? "0000000000",
        conductorId: doc.conductorId,
        passengerPhoto: doc.passengerPhoto,
        passengerType: doc.passengerType,
        kilometer: doc.kilometer,
        totalTrips: doc.totalTrips,
        busNumber: doc.busNumber,
        busType: doc.busType ?? "Regular",
      } as Trip;
    });
  } catch (error) {
    console.error("Error getting trip history:", error);
    return [];
  }
}

export async function getTripDetails(tripId: string): Promise<Trip | null> {
  try {
    const databaseId = getDatabaseId();
    const collectionId = getTripsCollectionId();
    if (databaseId === "" || collectionId === "") {
      throw new Error(
        "Appwrite configuration missing (check EXPO_PUBLIC_APPWRITE_TRIPS_COLLECTION_ID and databaseId)"
      );
    }

    const document: any = await databases.getDocument(
      databaseId,
      collectionId,
      tripId
    );
    const tpRaw = (document.totalPassengers ?? document.passengerCount) as
      | string
      | undefined;
    const totalPassengers =
      tpRaw && String(tpRaw).trim() !== "" ? String(tpRaw) : "1";

    return {
      id: document.$id,
      passengerName: document.passengerName ?? "Unknown Passenger",
      fare: document.fare ?? "₱0.00",
      totalFare: document.totalFare ?? document.fare,
      farePerPassenger: document.farePerPassenger,
      totalPassengers,
      passengerCount: totalPassengers,
      from: document.from ?? "Unknown",
      to: document.to ?? "Unknown",
      timestamp: safeParseTimestamp(document.timestamp),
      paymentMethod: document.paymentMethod ?? "QR",
      transactionId: document.transactionId ?? "0000000000",
      conductorId: document.conductorId,
      passengerPhoto: document.passengerPhoto,
      passengerType: document.passengerType,
      kilometer: document.kilometer,
      totalTrips: document.totalTrips,
      busNumber: document.busNumber,
      busType: document.busType ?? "Regular",
    } as Trip;
  } catch (error) {
    console.error("Error getting trip details:", error);
    return null;
  }
}

export async function saveTrip(trip: Omit<Trip, "id">): Promise<string | null> {
  try {
    const databaseId = getDatabaseId();
    const collectionId = getTripsCollectionId();
    if (databaseId === "" || collectionId === "") {
      throw new Error(
        "Appwrite configuration missing (check EXPO_PUBLIC_APPWRITE_TRIPS_COLLECTION_ID and databaseId)"
      );
    }

    const ts =
      Number.isFinite(trip.timestamp) && trip.timestamp > 0
        ? trip.timestamp
        : Date.now();

    const totalPassengers = String(
      trip.totalPassengers ?? trip.passengerCount ?? "1"
    );

    const tripData: Record<string, any> = {
      passengerName: trip.passengerName ?? "Unknown Passenger",
      fare: trip.fare ?? trip.totalFare ?? "₱0.00",
      totalFare: trip.totalFare ?? trip.fare ?? "₱0.00",
      farePerPassenger: trip.farePerPassenger ?? "",
      totalPassengers,
      passengerCount: totalPassengers,
      from: trip.from ?? "Unknown",
      to: trip.to ?? "Unknown",
      timestamp: ts.toString(),
      paymentMethod: trip.paymentMethod ?? "QR",
      transactionId: trip.transactionId ?? "0000000000",
      conductorId: trip.conductorId,
      passengerPhoto: trip.passengerPhoto ?? "",
      passengerType: trip.passengerType ?? "Regular",
      kilometer: trip.kilometer ?? "0",
      totalTrips: "1",
      busNumber: trip.busNumber ?? "",
      busType: trip.busType ?? "Regular",
    };

    const newId = await createDocumentWithSchemaFallback(
      databaseId,
      collectionId,
      tripData
    );
    return newId;
  } catch (error) {
    console.error("Error saving trip:", error);
    return null;
  }
}

export async function getTripsByDateRange(
  conductorId: string,
  startDate: Date,
  endDate: Date
): Promise<Trip[]> {
  try {
    const databaseId = getDatabaseId();
    const collectionId = getTripsCollectionId();
    if (databaseId === "" || collectionId === "") {
      throw new Error(
        "Appwrite configuration missing (check EXPO_PUBLIC_APPWRITE_TRIPS_COLLECTION_ID and databaseId)"
      );
    }

    const startTimestamp = startDate.getTime().toString();
    const endTimestamp = endDate.setHours(23, 59, 59, 999).toString();

    const docs = await listAllDocuments(databaseId, collectionId, [
      Query.equal("conductorId", conductorId),
      Query.greaterThanEqual("timestamp", startTimestamp),
      Query.lessThanEqual("timestamp", endTimestamp),
      Query.orderDesc("timestamp"),
    ]);

    return docs.map((doc: any) => {
      const tpRaw = (doc.totalPassengers ?? doc.passengerCount) as
        | string
        | undefined;
      const totalPassengers =
        tpRaw && String(tpRaw).trim() !== "" ? String(tpRaw) : "1";

      return {
        id: doc.$id,
        passengerName: doc.passengerName ?? "Unknown Passenger",
        fare: doc.fare ?? "₱0.00",
        totalFare: doc.totalFare ?? doc.fare,
        farePerPassenger: doc.farePerPassenger,
        totalPassengers,
        passengerCount: totalPassengers,
        from: doc.from ?? "Unknown",
        to: doc.to ?? "Unknown",
        timestamp: safeParseTimestamp(doc.timestamp),
        paymentMethod: doc.paymentMethod ?? "QR",
        transactionId: doc.transactionId ?? "0000000000",
        conductorId: doc.conductorId,
        passengerPhoto: doc.passengerPhoto,
        passengerType: doc.passengerType,
        kilometer: doc.kilometer,
        totalTrips: doc.totalTrips,
        busNumber: doc.busNumber,
        busType: doc.busType ?? "Regular",
      } as Trip;
    });
  } catch (error) {
    console.error("Error getting trips by date range:", error);
    return [];
  }
}
