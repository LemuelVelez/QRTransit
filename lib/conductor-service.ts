import { databases, config } from "./appwrite";
import { Query } from "react-native-appwrite";

interface ConductorStats {
  totalTrips: string;
  totalPassengers: string;
  totalRevenue: string;
  lastActive: string;
}

// Get the collection ID for transactions
const getTransactionsCollectionId = () => {
  return process.env.EXPO_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "";
};

// Get user statistics for the conductor profile
export async function getUserStats(
  conductorId: string
): Promise<ConductorStats> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getTransactionsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    // Get all transactions for this conductor
    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("conductorId", conductorId),
      Query.orderDesc("timestamp"),
    ]);

    const transactions = response.documents;

    // Calculate statistics
    let totalRevenue = 0;
    const uniqueTrips = new Set();

    // Process transactions
    transactions.forEach((transaction) => {
      // Add trip to unique trips set (from-to combination)
      uniqueTrips.add(`${transaction.from}-${transaction.to}`);

      // Add fare to total revenue (remove ₱ symbol and convert to number)
      const fareAmount =
        Number.parseFloat(transaction.fare.replace("₱", "")) || 0;
      totalRevenue += fareAmount;
    });

    // Get last active timestamp
    const lastActiveTimestamp =
      transactions.length > 0
        ? Number.parseInt(transactions[0].timestamp)
        : Date.now();

    const lastActive = new Date(lastActiveTimestamp).toLocaleDateString();

    return {
      totalTrips: uniqueTrips.size.toString(),
      totalPassengers: transactions.length.toString(),
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
