import { databases, config } from "./appwrite";
import { Query } from "react-native-appwrite";

interface ConductorStats {
  totalTrips: string;
  totalPassengers: string;
  totalRevenue: string;
  lastActive: string;
}

// Get the collection ID for trips
const getTripsCollectionId = () => {
  return process.env.EXPO_PUBLIC_APPWRITE_TRIPS_COLLECTION_ID || "";
};

// Get the collection ID for users
const getUsersCollectionId = () => {
  return process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID || "";
};

// Get the collection ID for cash remittance
const getCashRemittanceCollectionId = () => {
  return process.env.EXPO_PUBLIC_APPWRITE_CASH_REMITTANCE_COLLECTION_ID || "";
};

// Get user statistics for the conductor profile
export async function getUserStats(
  conductorId: string
): Promise<ConductorStats> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getTripsCollectionId();
    const remittanceCollectionId = getCashRemittanceCollectionId();

    if (!databaseId || !collectionId || !remittanceCollectionId) {
      throw new Error("Appwrite configuration missing");
    }

    // Get all trips for this conductor
    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("conductorId", conductorId),
      Query.orderDesc("timestamp"),
    ]);

    const trips = response.documents;

    // Get the latest remittance with status "remitted"
    const remittanceResponse = await databases.listDocuments(
      databaseId,
      remittanceCollectionId,
      [
        Query.equal("conductorId", conductorId),
        Query.equal("status", "remitted"),
        Query.orderDesc("verificationTimestamp"),
        Query.limit(1),
      ]
    );

    // If there's a remitted remittance, use its timestamp as cutoff
    let cutoffTimestamp = "0";
    if (remittanceResponse.documents.length > 0) {
      const latestRemittance = remittanceResponse.documents[0];
      cutoffTimestamp = latestRemittance.verificationTimestamp || "0";
    }

    // Calculate statistics
    let totalRevenue = 0;
    const uniqueTrips = new Set();

    // Process trips - only count trips after the latest remittance
    trips.forEach((trip) => {
      // Only count trips that occurred after the latest remittance
      if (Number(trip.timestamp) > Number(cutoffTimestamp)) {
        // Add trip to unique trips set (from-to combination)
        uniqueTrips.add(`${trip.from}-${trip.to}`);

        // Add fare to total revenue (remove ₱ symbol and convert to number)
        const fareAmount = Number.parseFloat(trip.fare.replace("₱", "")) || 0;
        totalRevenue += fareAmount;
      }
    });

    // Get last active timestamp
    const lastActiveTimestamp =
      trips.length > 0 ? Number.parseInt(trips[0].timestamp) : Date.now();

    const lastActive = new Date(lastActiveTimestamp).toLocaleDateString();

    return {
      totalTrips: uniqueTrips.size.toString(),
      totalPassengers: trips.length.toString(),
      totalRevenue: totalRevenue.toFixed(2),
      lastActive: lastActive,
    };
  } catch (error) {
    console.error("Error getting user stats:", error);
    // Return default values if there's an error
    return {
      totalTrips: "0",
      totalPassengers: "0",
      totalRevenue: "0.00",
      lastActive: new Date().toLocaleDateString(),
    };
  }
}

// Get conductor name from users collection
export async function getConductorName(conductorId: string): Promise<string> {
  try {
    const databaseId = config.databaseId;
    const usersCollectionId = getUsersCollectionId();

    if (!databaseId || !usersCollectionId) {
      throw new Error("Appwrite configuration missing");
      return "Unknown Conductor";
    }

    // Find the user document by userId
    const response = await databases.listDocuments(
      databaseId,
      usersCollectionId,
      [Query.equal("userId", conductorId), Query.limit(1)]
    );

    if (response.documents.length === 0) {
      return "Unknown Conductor";
    }

    const user = response.documents[0];

    // Return the conductor's name from firstname and lastname
    if (user.firstname && user.lastname) {
      return `${user.firstname} ${user.lastname}`;
    } else if (user.username) {
      return user.username;
    } else if (user.email) {
      return user.email;
    } else {
      return "Unknown Conductor";
    }
  } catch (error) {
    console.error("Error getting conductor name:", error);
    return "Unknown Conductor";
  }
}
