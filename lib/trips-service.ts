import { databases, config } from "./appwrite"
import { Query } from "react-native-appwrite"

export interface Trip {
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
  passengerType?: string
  kilometer?: string
}

// Get the collection ID for trips
const getTripsCollectionId = () => {
  return process.env.EXPO_PUBLIC_APPWRITE_TRIPS_COLLECTION_ID || ""
}

// Generate a numeric transaction number (no letters)
export function generateTripId(): string {
  // Generate a 10-digit numeric transaction ID
  return Math.floor(1000000000 + Math.random() * 9000000000).toString()
}

// Get trip history for a conductor
export async function getTripHistory(conductorId: string): Promise<Trip[]> {
  try {
    const databaseId = config.databaseId
    const collectionId = getTripsCollectionId()

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing")
      return []
    }

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("conductorId", conductorId),
      Query.orderDesc("timestamp"),
    ])

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
      passengerType: doc.passengerType,
      kilometer: doc.kilometer,
    }))
  } catch (error) {
    console.error("Error getting trip history:", error)
    return []
  }
}

// Get trip details
export async function getTripDetails(tripId: string): Promise<Trip | null> {
  try {
    const databaseId = config.databaseId
    const collectionId = getTripsCollectionId()

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing")
    }

    const document = await databases.getDocument(databaseId, collectionId, tripId)

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
      passengerType: document.passengerType,
      kilometer: document.kilometer,
    }
  } catch (error) {
    console.error("Error getting trip details:", error)
    return null
  }
}

// Save a new trip
export async function saveTrip(trip: Omit<Trip, "id">): Promise<string | null> {
  try {
    const databaseId = config.databaseId
    const collectionId = getTripsCollectionId()

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing")
    }

    const result = await databases.createDocument(databaseId, collectionId, "unique()", trip)

    return result.$id
  } catch (error) {
    console.error("Error saving trip:", error)
    return null
  }
}

// Get trips by date range
export async function getTripsByDateRange(conductorId: string, startDate: Date, endDate: Date): Promise<Trip[]> {
  try {
    const databaseId = config.databaseId
    const collectionId = getTripsCollectionId()

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing")
      return []
    }

    // Convert dates to timestamps
    const startTimestamp = startDate.getTime().toString()
    const endTimestamp = endDate.setHours(23, 59, 59, 999).toString()

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("conductorId", conductorId),
      Query.greaterThanEqual("timestamp", startTimestamp),
      Query.lessThanEqual("timestamp", endTimestamp),
      Query.orderDesc("timestamp"),
    ])

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
      passengerType: doc.passengerType,
      kilometer: doc.kilometer,
    }))
  } catch (error) {
    console.error("Error getting trips by date range:", error)
    return []
  }
}

