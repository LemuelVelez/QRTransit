import { ID } from "react-native-appwrite";
import { databases, config } from "./appwrite";

interface RouteInfo {
  from: string;
  to: string;
  busNumber: string;
  timestamp: number;
}

// Get the collection ID for routes
const getRoutesCollectionId = () => {
  return process.env.EXPO_PUBLIC_APPWRITE_ROUTES_COLLECTION_ID || "routes";
};

// Save route information
export async function saveRouteInfo(
  conductorId: string,
  routeInfo: RouteInfo
): Promise<string> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getRoutesCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    const result = await databases.createDocument(
      databaseId,
      collectionId,
      ID.unique(),
      {
        conductorId,
        from: routeInfo.from,
        to: routeInfo.to,
        busNumber: routeInfo.busNumber,
        timestamp: routeInfo.timestamp.toString(),
        active: true,
      }
    );

    return result.$id;
  } catch (error) {
    console.error("Error saving route info:", error);
    throw error;
  }
}

// Get active route for conductor
export async function getActiveRoute(
  conductorId: string
): Promise<RouteInfo | null> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getRoutesCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    const response = await databases.listDocuments(databaseId, collectionId, [
      // Query.equal("conductorId", conductorId),
      // Query.equal("active", true),
      // Query.orderDesc("timestamp"),
      // Query.limit(1)
    ]);

    if (response.documents.length === 0) {
      return null;
    }

    const route = response.documents[0];
    return {
      from: route.from,
      to: route.to,
      busNumber: route.busNumber,
      timestamp: Number.parseInt(route.timestamp),
    };
  } catch (error) {
    console.error("Error getting active route:", error);
    return null;
  }
}

// End active route
export async function endRoute(routeId: string): Promise<boolean> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getRoutesCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    await databases.updateDocument(databaseId, collectionId, routeId, {
      active: false,
      endTimestamp: Date.now().toString(),
    });

    return true;
  } catch (error) {
    console.error("Error ending route:", error);
    return false;
  }
}
