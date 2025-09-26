import { databases, config, listAllDocuments } from "./appwrite";
import { Query } from "react-native-appwrite";

interface ConductorStats {
  totalTrips: string;
  totalPassengers: string;
  totalRevenue: string;
  lastActive: string;
}

const getTripsCollectionId = () => {
  return process.env.EXPO_PUBLIC_APPWRITE_TRIPS_COLLECTION_ID || "";
};

const getUsersCollectionId = () => {
  return process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID || "";
};

const getCashRemittanceCollectionId = () => {
  return process.env.EXPO_PUBLIC_APPWRITE_CASH_REMITTANCE_COLLECTION_ID || "";
};

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

    const trips = await listAllDocuments(
      databaseId,
      collectionId,
      [Query.equal("conductorId", conductorId), Query.orderDesc("timestamp")],
      { batchSize: 100 }
    );

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

    let cutoffTimestamp = "0";
    if (remittanceResponse.documents.length > 0) {
      const latestRemittance = remittanceResponse.documents[0];
      cutoffTimestamp = latestRemittance.verificationTimestamp || "0";
    }

    let totalRevenue = 0;
    const uniqueTrips = new Set<string>();
    let passengerSum = 0;

    trips.forEach((trip: any) => {
      if (Number(trip.timestamp) > Number(cutoffTimestamp)) {
        uniqueTrips.add(`${trip.from}-${trip.to}`);

        // Prefer totalFare if present
        const totalStr = (trip.totalFare || trip.fare || "₱0").toString();
        const amount = Number(String(totalStr).replace(/[^\d.]/g, "")) || 0;
        totalRevenue += amount;

        // Sum passengers using passengerCount if available, else 1
        const pCount = parseInt(trip.passengerCount || "1", 10);
        passengerSum += isNaN(pCount) ? 1 : Math.max(1, pCount);
      }
    });

    const lastActiveTimestamp =
      trips.length > 0 ? Number.parseInt(trips[0].timestamp) : Date.now();

    const lastActive = new Date(lastActiveTimestamp).toLocaleDateString();

    return {
      totalTrips: uniqueTrips.size.toString(),
      totalPassengers: passengerSum.toString(),
      totalRevenue: totalRevenue.toFixed(2),
      lastActive: lastActive,
    };
  } catch (error) {
    console.error("Error getting user stats:", error);
    return {
      totalTrips: "0",
      totalPassengers: "0",
      totalRevenue: "0.00",
      lastActive: new Date().toLocaleDateString(),
    };
  }
}

export async function getConductorName(conductorId: string): Promise<string> {
  try {
    const databaseId = config.databaseId;
    const usersCollectionId = getUsersCollectionId();

    if (!databaseId || !usersCollectionId) {
      throw new Error("Appwrite configuration missing");
    }

    const response = await databases.listDocuments(
      databaseId,
      usersCollectionId,
      [Query.equal("userId", conductorId), Query.limit(1)]
    );

    if (response.documents.length === 0) {
      return "Unknown Conductor";
    }

    const user = response.documents[0];

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
