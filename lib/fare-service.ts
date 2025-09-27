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
const eq = (a?: string, b?: string) =>
  (a || "").toLowerCase().trim() === (b || "").toLowerCase().trim();

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

// Fare Calculation Helpers (distance-tier fallback)
export async function getFareForDistance(distance: number): Promise<number> {
  try {
    const configs = await getFareConfigurations();
    const activeConfigs = configs.filter((c) => c.active && !c.busType);

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

/**
 * 🔎 NEW: Get per-kilometer rate for a specific bus type, derived from Fare collection.
 * - If a fare row has busType set, we interpret `fare/kilometer` as the per-km price.
 * - If `kilometer` is 0/blank, we treat it as 1 (so a row like fare=2.35, kilometer=1 → 2.35/km).
 * - If multiple rows exist for the same busType, we pick the most recently created one
 *   that yields a valid positive rate; otherwise we take the smallest positive rate.
 */
export async function getPerKmRateForBusType(
  busType: string
): Promise<number | null> {
  const bt = (busType || "").trim();
  if (!bt) return null;

  try {
    const configs = await getFareConfigurations();
    const matches = configs.filter(
      (c) => c.active && c.busType && eq(c.busType, bt)
    );

    if (matches.length === 0) return null;

    // Compute candidate rates
    const candidates = matches
      .map((c) => {
        const km = Math.max(1, parseFloat(c.kilometer)); // treat missing/0 as 1
        const perKm = parseFloat(c.fare) / km;
        const ts = Date.parse(c.createdAt || "") || 0;
        return { perKm, ts };
      })
      .filter((x) => Number.isFinite(x.perKm) && x.perKm > 0);

    if (candidates.length === 0) return null;

    // Prefer newest valid config
    candidates.sort((a, b) => b.ts - a.ts);
    const newest = candidates[0];

    // As a safety, also find the minimum rate to avoid accidental spikes
    const minPerKm = Math.min(...candidates.map((c) => c.perKm));

    // Heuristic: if newest perKm is wildly larger than the minimum (e.g., data entry mistake),
    // use the min. Otherwise use newest.
    const chosen = newest.perKm > minPerKm * 3 ? minPerKm : newest.perKm;

    return chosen;
  } catch (e) {
    console.warn("getPerKmRateForBusType error:", e);
    return null;
  }
}

/**
 * calculateFareWithModifiers
 * - ✅ Base fare now respects per-km rate from Fare collection for the chosen busType
 * - ❌ No bus-type multiplier (still removed per your earlier request)
 * - ✅ Passenger-type discount still applies
 */
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
  const dist = Math.max(0, Number(distance) || 0);

  // Try busType-specific per-km pricing first
  const perKm = await getPerKmRateForBusType(busType);

  let baseFare: number;
  if (perKm != null) {
    baseFare = dist * perKm;
  } else {
    // Fall back to distance-tier model (rows without busType)
    baseFare = await getFareForDistance(dist);
  }

  // Only passenger discount (no bus multiplier)
  const { getDiscountPercentage } = require("./discount-service");
  const discountPct = await getDiscountPercentage(passengerType, busType);

  const busMult = 1.0; // neutral
  let finalFare = baseFare * busMult;
  finalFare = finalFare * (1 - (discountPct || 0) / 100);

  return {
    baseFare,
    finalFare,
    discountApplied: discountPct || 0,
    busMultiplier: busMult,
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
