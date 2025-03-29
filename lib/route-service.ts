import { ID, Query } from "react-native-appwrite";
import { databases, config } from "./appwrite";

export interface RouteInfo {
  id?: string;
  from: string;
  to: string;
  busNumber: string;
  timestamp: number;
  active?: boolean;
  endTimestamp?: number;
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
        active: routeInfo.active === true, // Ensure boolean value
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
      Query.equal("conductorId", conductorId),
      Query.equal("active", true),
      Query.orderDesc("timestamp"), // Order by timestamp descending to get the latest
      Query.limit(1), // Limit to 1 result
    ]);

    if (response.documents.length === 0) {
      return null;
    }

    const route = response.documents[0];
    return {
      id: route.$id,
      from: route.from,
      to: route.to,
      busNumber: route.busNumber,
      timestamp: Number.parseInt(route.timestamp),
      active: route.active === true, // Ensure boolean value
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

// Get all routes for a conductor
export async function getAllRoutes(conductorId: string): Promise<RouteInfo[]> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getRoutesCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
      return [];
    }

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("conductorId", conductorId),
      Query.orderDesc("timestamp"),
    ]);

    return response.documents.map((route) => ({
      id: route.$id,
      from: route.from,
      to: route.to,
      busNumber: route.busNumber,
      timestamp: Number.parseInt(route.timestamp),
      active: route.active === true, // Ensure boolean value
      endTimestamp: route.endTimestamp
        ? Number.parseInt(route.endTimestamp)
        : undefined,
    }));
  } catch (error) {
    console.error("Error getting all routes:", error);
    return [];
  }
}

// Update route information
export async function updateRoute(
  routeId: string,
  updates: Partial<RouteInfo>
): Promise<boolean> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getRoutesCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    // Prepare update data
    const updateData: Record<string, any> = {};
    if (updates.from !== undefined) updateData.from = updates.from;
    if (updates.to !== undefined) updateData.to = updates.to;
    if (updates.busNumber !== undefined)
      updateData.busNumber = updates.busNumber;

    // Explicitly handle the active field as a boolean
    if (updates.active !== undefined) {
      updateData.active = updates.active === true;
      console.log("Setting active status to:", updateData.active);
    }

    await databases.updateDocument(
      databaseId,
      collectionId,
      routeId,
      updateData
    );

    return true;
  } catch (error) {
    console.error("Error updating route:", error);
    return false;
  }
}

// Delete a route
export async function deleteRoute(routeId: string): Promise<boolean> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getRoutesCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    await databases.deleteDocument(databaseId, collectionId, routeId);

    return true;
  } catch (error) {
    console.error("Error deleting route:", error);
    return false;
  }
}
