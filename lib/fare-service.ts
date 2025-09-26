// lib/fare-service.ts
import { ID, Query } from "react-native-appwrite";
import { databases, config } from "./appwrite";
import Constants from "expo-constants";

export interface FareConfig {
  id?: string;
  fare: string;
  kilometer: string;
  active: boolean;
  description?: string;
  createdAt?: string;
  busType?: string;
}

// Robust env read (backup if config is missing)
const readEnv = (key: string): string | undefined => {
  const v1 = (process.env as any)?.[key];
  if (v1 != null) return String(v1);
  const extra =
    (Constants?.expoConfig as any)?.extra ||
    (Constants as any)?.manifest2?.extra ||
    (Constants as any)?.manifest?.extra ||
    {};
  const naked = key.replace(/^EXPO_PUBLIC_/, "");
  const v2 = extra?.[key] ?? extra?.[naked];
  return v2 != null ? String(v2) : undefined;
};

const getFareCollectionId = () =>
  config.fareCollectionId ||
  readEnv("EXPO_PUBLIC_APPWRITE_FARE_COLLECTION_ID") ||
  "";

const getDatabaseId = () => config.databaseId || "";

// ---- pagination controls (safe defaults) ----
const PAGE_LIMIT = 100; // 1..100 per Appwrite
const HARD_CAP = 1000; // overall ceiling to avoid overloading API

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

// Utility functions
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
const parseFloat = (str: string | number): number => {
  const num = Number(str);
  return Number.isFinite(num) ? num : 0;
};

// CRUD Operations
export async function getFareConfigurations(): Promise<FareConfig[]> {
  try {
    const db = getDatabaseId();
    const col = getFareCollectionId();
    if (!db || !col) return [];

    // Fetch ALL fare rows (no conductor-specific filtering)
    const docs = await listAllDocuments(db, col, [
      Query.orderDesc("$createdAt"),
    ]);

    return docs.map((doc: any) => {
      const item: FareConfig = {
        id: doc.$id,
        fare: String(doc.fare || "0"),
        kilometer: String(doc.kilometer || "0"),
        active: !!doc.active,
        description: doc.description || "",
        createdAt: doc.$createdAt,
      };
      if (typeof doc.busType === "string" && doc.busType.trim().length > 0) {
        item.busType = String(doc.busType).trim();
      }
      return item;
    });
  } catch (e) {
    console.error("getFareConfigurations error:", e);
    return [];
  }
}

export async function saveFareConfiguration(
  data: Omit<FareConfig, "id" | "createdAt">
): Promise<string | null> {
  try {
    const db = getDatabaseId();
    const col = getFareCollectionId();
    if (!db || !col) {
      console.error("Fare collection configuration missing");
      return null;
    }

    const payload: any = {
      fare: String(data.fare || "0"),
      kilometer: String(data.kilometer || "0"),
      active: !!data.active,
      description: data.description || "",
    };

    if (data.busType && data.busType.trim()) {
      payload.busType = data.busType.trim();
    }

    const res = await databases.createDocument(db, col, ID.unique(), payload);
    return res.$id || null;
  } catch (e) {
    console.error("saveFareConfiguration error:", e);
    return null;
  }
}

export async function updateFareConfiguration(
  id: string,
  data: Partial<Omit<FareConfig, "id" | "createdAt">>
): Promise<boolean> {
  const db = getDatabaseId();
  const col = getFareCollectionId();
  if (!db || !col) return false;

  const payload: any = {};
  if (data.fare !== undefined) payload.fare = String(data.fare);
  if (data.kilometer !== undefined) payload.kilometer = String(data.kilometer);
  if (data.active !== undefined) payload.active = !!data.active;
  if (data.description !== undefined) payload.description = data.description;
  if (data.busType !== undefined) {
    const cleaned = String(data.busType).trim();
    if (cleaned.length > 0) payload.busType = cleaned;
    else payload.busType = null; // clear if empty string provided
  }

  try {
    await databases.updateDocument(db, col, id, payload);
    return true;
  } catch (e) {
    console.error("updateFareConfiguration error:", e);
    return false;
  }
}

export async function deleteFareConfiguration(id: string): Promise<boolean> {
  const db = getDatabaseId();
  const col = getFareCollectionId();
  if (!db || !col) return false;

  try {
    await databases.deleteDocument(db, col, id);
    return true;
  } catch (e) {
    console.error("deleteFareConfiguration error:", e);
    return false;
  }
}

// Fare Calculation Helpers
export async function getFareForDistance(distance: number): Promise<number> {
  try {
    const configs = await getFareConfigurations();
    const activeConfigs = configs.filter((c) => c.active);

    if (activeConfigs.length === 0) {
      // Default fallback calculation
      return 15 + distance * 2.5;
    }

    // Sort by kilometer ascending to find the best match
    const sortedConfigs = activeConfigs.sort(
      (a, b) => parseFloat(a.kilometer) - parseFloat(b.kilometer)
    );

    // Find the fare configuration that best matches the distance
    let bestConfig = sortedConfigs[0];

    for (const config of sortedConfigs) {
      const configKm = parseFloat(config.kilometer);
      if (distance >= configKm) {
        bestConfig = config;
      } else {
        break;
      }
    }

    // Calculate fare based on the selected configuration
    const baseKm = parseFloat(bestConfig.kilometer);
    const baseFare = parseFloat(bestConfig.fare);

    if (distance <= baseKm) {
      return baseFare;
    } else {
      // For distances beyond the base, use a rate per additional km
      const additionalKm = distance - baseKm;
      const ratePerKm = baseFare / Math.max(baseKm, 1); // Avoid division by zero
      return baseFare + additionalKm * ratePerKm;
    }
  } catch (e) {
    console.warn("getFareForDistance error (fallback used):", e);
    // Fallback calculation
    return 15 + distance * 2.5;
  }
}

export async function calculateFareWithModifiers(
  distance: number,
  passengerType: string = "",
  busType: string = ""
): Promise<{
  baseFare: number;
  finalFare: number;
  discountApplied: number;
  busMultiplier: number;
}> {
  // Import discount service functions
  const {
    getDiscountPercentage,
    getBusTypeFareMultiplier,
  } = require("./discount-service");

  const baseFare = await getFareForDistance(distance);

  // Get passenger discount and bus multiplier
  const [discountPct, busMult] = await Promise.all([
    getDiscountPercentage(passengerType, busType),
    getBusTypeFareMultiplier(busType),
  ]);

  // Apply bus type multiplier first, then discount
  let finalFare = baseFare * (busMult || 1);
  finalFare = finalFare * (1 - (discountPct || 0) / 100);

  return {
    baseFare,
    finalFare,
    discountApplied: discountPct || 0,
    busMultiplier: busMult || 1,
  };
}

// Get available fare ranges for display
export async function getFareRanges(): Promise<
  Array<{ kilometer: string; fare: string; active: boolean }>
> {
  try {
    const configs = await getFareConfigurations();
    return configs
      .map((c) => ({
        kilometer: c.kilometer,
        fare: c.fare,
        active: c.active,
      }))
      .sort((a, b) => parseFloat(a.kilometer) - parseFloat(b.kilometer));
  } catch (e) {
    console.warn("getFareRanges error:", e);
    return [{ kilometer: "1", fare: "17.5", active: true }];
  }
}
