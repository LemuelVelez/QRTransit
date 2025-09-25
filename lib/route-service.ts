// lib/route-service.ts
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
  conductorName?: string; // optional display-only
  busType?: string; // ✅ NEW: add busType to the model
}

// ---- pagination helpers ----
const PAGE_LIMIT = 100;
const HARD_CAP = 1000;

async function listAllDocuments(
  databaseId: string,
  collectionId: string,
  baseQueries: any[] = [],
  pageLimit = PAGE_LIMIT,
  hardCap = HARD_CAP
): Promise<any[]> {
  const out: any[] = [];
  let cursor: string | null = null;
  const limit = Math.max(1, Math.min(100, pageLimit));
  while (out.length < hardCap) {
    const q = [...baseQueries, Query.limit(limit)];
    if (cursor) q.push(Query.cursorAfter(cursor));
    const res = await databases.listDocuments(databaseId, collectionId, q);
    const docs = res?.documents ?? [];
    out.push(...docs);
    if (docs.length < limit) break;
    cursor = docs[docs.length - 1].$id;
  }
  return out.slice(0, hardCap);
}

// Get the collection ID for routes
const getRoutesCollectionId = () => {
  return process.env.EXPO_PUBLIC_APPWRITE_ROUTES_COLLECTION_ID || "";
};

// Save route information
export async function saveRouteInfo(
  conductorId: string,
  routeInfo: RouteInfo,
  conductorName?: string
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
        busType: routeInfo.busType || "Regular", // ✅ persist busType
        timestamp: routeInfo.timestamp.toString(),
        active: routeInfo.active === true,
        conductorName: conductorName || "",
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
      Query.orderDesc("timestamp"),
      Query.limit(1),
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
      busType: route.busType || "Regular", // ✅ map busType
      timestamp: Number.parseInt(route.timestamp),
      active: route.active === true,
      conductorName: route.conductorName || "",
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

// Get all routes for a conductor (paginated)
export async function getAllRoutes(conductorId: string): Promise<RouteInfo[]> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getRoutesCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    const docs = await listAllDocuments(databaseId, collectionId, [
      Query.equal("conductorId", conductorId),
      Query.orderDesc("timestamp"),
    ]);

    return docs.map((route: any) => ({
      id: route.$id,
      from: route.from,
      to: route.to,
      busNumber: route.busNumber,
      busType: route.busType || "Regular", // ✅ map busType
      timestamp: Number.parseInt(route.timestamp),
      active: route.active === true,
      endTimestamp: route.endTimestamp
        ? Number.parseInt(route.endTimestamp)
        : undefined,
      conductorName: route.conductorName || "",
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
    if (updates.busType !== undefined) updateData.busType = updates.busType; // ✅ allow busType patches
    if (updates.conductorName !== undefined)
      updateData.conductorName = updates.conductorName;

    // Explicitly handle the active field as a boolean
    if (updates.active !== undefined) {
      updateData.active = updates.active === true;
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
