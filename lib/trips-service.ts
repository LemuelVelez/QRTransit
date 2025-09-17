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
  totalPassengers?: string;
  busNumber?: string;

  // NEW
  passengerCount?: string; // store as string in Appwrite
  farePerPassenger?: string;
  totalFare?: string; // explicit total
}

const getTripsCollectionId = () => {
  return process.env.EXPO_PUBLIC_APPWRITE_TRIPS_COLLECTION_ID || "";
};

export function generateTripId(): string {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

export async function getTripHistory(conductorId: string): Promise<Trip[]> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getTripsCollectionId();
    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("conductorId", conductorId),
      Query.orderDesc("timestamp"),
    ]);

    return response.documents.map((doc) => ({
      id: doc.$id,
      passengerName: doc.passengerName || "Unknown Passenger",
      fare: doc.fare || "₱0.00",
      totalFare: doc.totalFare || doc.fare,
      farePerPassenger: doc.farePerPassenger,
      passengerCount: doc.passengerCount,
      from: doc.from || "Unknown",
      to: doc.to || "Unknown",
      timestamp: Number.parseInt(doc.timestamp) || Date.now(),
      paymentMethod: doc.paymentMethod || "QR",
      transactionId: doc.transactionId || "0000000000",
      conductorId: doc.conductorId,
      passengerPhoto: doc.passengerPhoto,
      passengerType: doc.passengerType,
      kilometer: doc.kilometer,
      totalTrips: doc.totalTrips,
      busNumber: doc.busNumber,
    }));
  } catch (error) {
    console.error("Error getting trip history:", error);
    return [];
  }
}

export async function getTripDetails(tripId: string): Promise<Trip | null> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getTripsCollectionId();
    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    const document = await databases.getDocument(
      databaseId,
      collectionId,
      tripId
    );

    return {
      id: document.$id,
      passengerName: document.passengerName || "Unknown Passenger",
      fare: document.fare || "₱0.00",
      totalFare: document.totalFare || document.fare,
      farePerPassenger: document.farePerPassenger,
      passengerCount: document.passengerCount,
      from: document.from || "Unknown",
      to: document.to || "Unknown",
      timestamp: Number.parseInt(document.timestamp) || Date.now(),
      paymentMethod: document.paymentMethod || "QR",
      transactionId: document.transactionId || "0000000000",
      conductorId: document.conductorId,
      passengerPhoto: document.passengerPhoto,
      passengerType: document.passengerType,
      kilometer: document.kilometer,
      totalTrips: document.totalTrips,
      busNumber: document.busNumber,
    };
  } catch (error) {
    console.error("Error getting trip details:", error);
    return null;
  }
}

export async function saveTrip(trip: Omit<Trip, "id">): Promise<string | null> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getTripsCollectionId();
    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    const tripData = {
      passengerName: trip.passengerName || "Unknown Passenger",
      fare: trip.fare || trip.totalFare || "₱0.00", // keep total in legacy field
      totalFare: trip.totalFare || trip.fare || "₱0.00",
      farePerPassenger: trip.farePerPassenger || "",
      passengerCount: trip.passengerCount || "1",
      from: trip.from || "Unknown",
      to: trip.to || "Unknown",
      timestamp: (trip.timestamp || Date.now()).toString(),
      paymentMethod: trip.paymentMethod || "QR",
      transactionId: trip.transactionId || "0000000000",
      conductorId: trip.conductorId,
      passengerPhoto: trip.passengerPhoto || "",
      passengerType: trip.passengerType || "Regular",
      kilometer: trip.kilometer || "0",
      totalTrips: "1",
      busNumber: trip.busNumber || "",
    };

    // ✅ Use a real unique id generator from the SDK
    const result = await databases.createDocument(
      databaseId,
      collectionId,
      ID.unique(),
      tripData
    );
    return result.$id;
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
    const databaseId = config.databaseId;
    const collectionId = getTripsCollectionId();
    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

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
      totalFare: doc.totalFare || doc.fare,
      farePerPassenger: doc.farePerPassenger,
      passengerCount: doc.passengerCount,
      from: doc.from || "Unknown",
      to: doc.to || "Unknown",
      timestamp: Number.parseInt(doc.timestamp) || Date.now(),
      paymentMethod: doc.paymentMethod || "QR",
      transactionId: doc.transactionId || "0000000000",
      conductorId: doc.conductorId,
      passengerPhoto: doc.passengerPhoto,
      passengerType: doc.passengerType,
      kilometer: doc.kilometer,
      totalTrips: doc.totalTrips,
      busNumber: doc.busNumber,
    }));
  } catch (error) {
    console.error("Error getting trips by date range:", error);
    return [];
  }
}
