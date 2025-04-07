import { ID, Query } from "react-native-appwrite"
import { databases, config } from "./appwrite"
import { getConductorName } from "./conductor-service" // Import the getConductorName function
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
const getSafeConductorName = async (doc: any): Promise<string> => {
  // Check if conductorName exists and is not empty
  if (doc.conductorName && doc.conductorName.trim() !== "") {
    return doc.conductorName
  }

  // If conductorId exists, try to get the name from the users collection
  if (doc.conductorId) {
    try {
      const name = await getConductorName(doc.conductorId)
      if (name && name !== "Unknown Conductor") {
        return name
      }
    } catch (error) {
      console.error("Error getting conductor name:", error)
    }

    // Return a partial ID if available as fallback
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

// Helper function to safely parse timestamps
const safeParseTimestamp = (timestamp: string | number): number => {
  if (typeof timestamp === "number") {
    return timestamp
  }

  try {
    return Number.parseInt(timestamp)
  } catch (error) {
    return Date.now() // Fallback to current time if parsing fails
  }
}

// Search for a bus by number
export async function searchBusByNumber(busNumber: string): Promise<BusInfo[]> {
  try {
    const databaseId = config.databaseId
    const collectionId = getRoutesCollectionId()

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing")
    }

    // Clean the bus number input (trim whitespace)
    const cleanBusNumber = busNumber.trim()

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("busNumber", cleanBusNumber),
      Query.orderDesc("timestamp"),
    ])

    // Process each document to ensure conductor names are properly set
    const results = []
    for (const doc of response.documents) {
      const conductorName = await getSafeConductorName(doc)

      results.push({
        id: doc.$id,
        busNumber: doc.busNumber,
        conductorId: doc.conductorId || "",
        conductorName: conductorName,
        from: doc.from,
        to: doc.to,
        active: doc.active === true,
        timestamp: doc.timestamp, // Keep as string from Appwrite
      })
    }

    return results
  } catch (error) {
    console.error("Error searching for bus:", error)
    return []
  }
}

// Get passengers for a specific bus - FIXED to properly fetch passengers
export async function getBusPassengers(busId: string, conductorId: string): Promise<PassengerInfo[]> {
  try {
    const databaseId = config.databaseId
    const collectionId = getTripsCollectionId()
    const routesCollectionId = getRoutesCollectionId()

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing")
    }

    // Get the bus details first to get the route information
    const busDetails = await databases.getDocument(databaseId, routesCollectionId, busId)

    if (!busDetails) {
      throw new Error("Bus details not found")
    }

    // Key fix: Get all trips for this conductor with the bus number
    // This ensures we get all passengers associated with this bus
    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("conductorId", conductorId),
      Query.equal("busNumber", busDetails.busNumber),
      Query.orderDesc("timestamp"),
      // Get trips from last 48 hours to ensure we have current passengers
      Query.greaterThan("timestamp", (Date.now() - 48 * 60 * 60 * 1000).toString()),
    ])

    // Map the documents to PassengerInfo objects
    return response.documents.map((doc) => ({
      id: doc.$id,
      name: doc.passengerName || "Unknown Passenger",
      fare: doc.fare || "₱0.00",
      from: doc.from || "Unknown",
      to: doc.to || "Unknown",
      timestamp: doc.timestamp || Date.now().toString(),
      paymentMethod: doc.paymentMethod || "QR",
      passengerType: doc.passengerType || "Regular",
      passengerPhoto: doc.passengerPhoto || "",
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

    // Get the conductor name
    const conductorName = await getSafeConductorName(busDetails)

    // Create inspection record - All values as strings for Appwrite
    const inspectionRecord = {
      inspectorId,
      busId,
      busNumber: busDetails.busNumber,
      conductorId: busDetails.conductorId || "",
      conductorName: conductorName,
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

    // Process each document to ensure conductor names are properly set
    const results = []
    for (const doc of response.documents) {
      const conductorName = await getSafeConductorName(doc)

      results.push({
        id: doc.$id,
        inspectorId: doc.inspectorId,
        busId: doc.busId,
        busNumber: doc.busNumber,
        conductorId: doc.conductorId || "",
        conductorName: conductorName,
        timestamp: doc.timestamp, // Keep as string from Appwrite
        inspectionFrom: doc.inspectionFrom,
        inspectionTo: doc.inspectionTo,
        passengerCount: doc.passengerCount, // Keep as string from Appwrite
        status: doc.status || "cleared",
      })
    }

    return results
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
    // Safely parse the timestamp
    const lastActiveDate = new Date(safeParseTimestamp(lastActiveTimestamp))
    const lastActive = lastActiveDate.toLocaleDateString()

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

