import { ID, Query } from "react-native-appwrite"
import { databases, config } from "./appwrite"
import type { BusInfo, PassengerInfo, InspectionRecord } from "./types"

// Get the collection IDs
const getRoutesCollectionId = () => {
  return process.env.EXPO_PUBLIC_APPWRITE_ROUTES_COLLECTION_ID || "routes"
}

const getTripsCollectionId = () => {
  return process.env.EXPO_PUBLIC_APPWRITE_TRIPS_COLLECTION_ID || ""
}

const getInspectionsCollectionId = () => {
  return process.env.EXPO_PUBLIC_APPWRITE_INSPECTIONS_COLLECTION_ID || "inspections"
}

// Helper function to get a safe conductor name
const getSafeConductorName = (doc: any): string => {
  // Check if conductorName exists and is not empty
  if (doc.conductorName && doc.conductorName.trim() !== "") {
    return doc.conductorName
  }

  // Check if conductorId exists
  if (doc.conductorId) {
    // Return a partial ID if available
    try {
      return `Conductor (ID: ${doc.conductorId.substring(0, 8)}...)`
    } catch (e) {
      // If substring fails, return the full ID
      return `Conductor (ID: ${doc.conductorId})`
    }
  }

  // Fallback if neither name nor ID is available
  return "Unknown Conductor"
}

// Search for a bus by number
export async function searchBusByNumber(busNumber: string): Promise<BusInfo[]> {
  try {
    const databaseId = config.databaseId
    const collectionId = getRoutesCollectionId()

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing")
    }

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("busNumber", busNumber),
      Query.orderDesc("timestamp"),
    ])

    return response.documents.map((doc) => ({
      id: doc.$id,
      busNumber: doc.busNumber,
      conductorId: doc.conductorId || "",
      conductorName: getSafeConductorName(doc),
      from: doc.from,
      to: doc.to,
      active: doc.active === true,
      timestamp: doc.timestamp, // Keep as string from Appwrite
    }))
  } catch (error) {
    console.error("Error searching for bus:", error)
    return []
  }
}

// Get passengers for a specific bus
export async function getBusPassengers(busId: string, conductorId: string): Promise<PassengerInfo[]> {
  try {
    const databaseId = config.databaseId
    const collectionId = getTripsCollectionId()

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing")
    }

    // Get the bus details first to get the route information
    const busDetails = await databases.getDocument(databaseId, getRoutesCollectionId(), busId)

    // Get all trips for this conductor on this bus route
    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("conductorId", conductorId),
      Query.equal("from", busDetails.from),
      Query.equal("to", busDetails.to),
      Query.orderDesc("timestamp"),
      // Limit to recent trips (e.g., last 24 hours)
      Query.greaterThan("timestamp", (Date.now() - 24 * 60 * 60 * 1000).toString()),
    ])

    return response.documents.map((doc) => ({
      id: doc.$id,
      name: doc.passengerName || "Unknown Passenger",
      fare: doc.fare || "₱0.00",
      from: doc.from || "Unknown",
      to: doc.to || "Unknown",
      timestamp: doc.timestamp || Date.now().toString(), // Keep as string from Appwrite
      paymentMethod: doc.paymentMethod || "QR",
    }))
  } catch (error) {
    console.error("Error getting bus passengers:", error)
    return []
  }
}

// Mark a bus as cleared after inspection
export async function markBusAsCleared(
  busId: string,
  inspectorId: string,
  inspectionFrom: string,
  inspectionTo: string,
): Promise<boolean> {
  try {
    const databaseId = config.databaseId
    const collectionId = getInspectionsCollectionId()
    const routesCollectionId = getRoutesCollectionId()

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing")
    }

    // Get bus details
    const busDetails = await databases.getDocument(databaseId, routesCollectionId, busId)

    // Get passenger count
    const passengers = await getBusPassengers(busId, busDetails.conductorId)

    // Create inspection record - All values as strings for Appwrite
    const inspectionRecord = {
      inspectorId,
      busId,
      busNumber: busDetails.busNumber,
      conductorId: busDetails.conductorId || "",
      conductorName: getSafeConductorName(busDetails),
      timestamp: Date.now().toString(), // Already a string
      inspectionFrom,
      inspectionTo,
      passengerCount: passengers.length.toString(), // Convert to string for Appwrite
      status: "cleared",
    }

    await databases.createDocument(databaseId, collectionId, ID.unique(), inspectionRecord)

    return true
  } catch (error) {
    console.error("Error marking bus as cleared:", error)
    return false
  }
}

// Get inspection history for an inspector
export async function getInspectionHistory(inspectorId: string): Promise<InspectionRecord[]> {
  try {
    const databaseId = config.databaseId
    const collectionId = getInspectionsCollectionId()

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing")
    }

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("inspectorId", inspectorId),
      Query.orderDesc("timestamp"),
    ])

    return response.documents.map((doc) => ({
      id: doc.$id,
      inspectorId: doc.inspectorId,
      busId: doc.busId,
      busNumber: doc.busNumber,
      conductorId: doc.conductorId || "",
      conductorName: getSafeConductorName(doc),
      timestamp: doc.timestamp, // Keep as string from Appwrite
      inspectionFrom: doc.inspectionFrom,
      inspectionTo: doc.inspectionTo,
      passengerCount: doc.passengerCount, // Keep as string from Appwrite
      status: doc.status || "cleared",
    }))
  } catch (error) {
    console.error("Error getting inspection history:", error)
    return []
  }
}

// Get inspector statistics
export async function getInspectorStats(inspectorId: string): Promise<{
  totalInspections: string
  totalBusesCleared: string
  lastActive: string
}> {
  try {
    const databaseId = config.databaseId
    const collectionId = getInspectionsCollectionId()

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing")
    }

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("inspectorId", inspectorId),
      Query.orderDesc("timestamp"),
    ])

    const inspections = response.documents

    // Calculate statistics - all values as strings for Appwrite
    const totalInspections = inspections.length.toString()
    const totalBusesCleared = inspections.filter((doc) => doc.status === "cleared").length.toString()

    // Get last active timestamp - handle as string
    const lastActiveTimestamp = inspections.length > 0 ? inspections[0].timestamp : Date.now().toString()
    // Convert to Date for formatting, but keep original as string
    // Fix: Convert string to number before passing to Date constructor
    const lastActive = new Date(Number(lastActiveTimestamp)).toLocaleDateString()

    return {
      totalInspections,
      totalBusesCleared,
      lastActive,
    }
  } catch (error) {
    console.error("Error getting inspector stats:", error)
    return {
      totalInspections: "0",
      totalBusesCleared: "0",
      lastActive: new Date().toLocaleDateString(),
    }
  }
}

