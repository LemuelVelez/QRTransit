// lib/discount-service.ts
import { ID, Query } from "react-native-appwrite";
import { databases, config } from "./appwrite";

export interface DiscountConfig {
  id?: string;
  passengerType: string; // e.g., "Regular", "Student", "Senior", "PWD"
  busType: string; // e.g., "Regular", "Aircon", "Deluxe"
  discountPercentage: string; // 0..100
  description?: string;
  active: boolean;
  createdAt?: string;
}

const getCollectionId = () =>
  process.env.EXPO_PUBLIC_APPWRITE_DISCOUNTS_COLLECTION_ID || "";

// ---------- CRUD ----------
export async function getDiscountConfigurations(): Promise<DiscountConfig[]> {
  try {
    const databaseId = config.databaseId!;
    const collectionId = getCollectionId();
    if (!databaseId || !collectionId) return [];

    const res = await databases.listDocuments(databaseId, collectionId, []);
    return res.documents.map((doc: any) => ({
      id: doc.$id,
      passengerType: doc.passengerType,
      busType: doc.busType,
      discountPercentage: String(doc.discountPercentage) || 0,
      description: doc.description || "",
      active: !!doc.active,
      createdAt: doc.$createdAt,
    }));
  } catch (e) {
    console.error("getDiscountConfigurations error:", e);
    return [];
  }
}

export async function saveDiscountConfiguration(
  data: Omit<DiscountConfig, "id" | "createdAt">
): Promise<string | null> {
  try {
    const databaseId = config.databaseId!;
    const collectionId = getCollectionId();
    if (!databaseId || !collectionId) return null;

    const payload = {
      passengerType: data.passengerType,
      busType: data.busType,
      discountPercentage: String(data.discountPercentage) || 0,
      description: data.description || "",
      active: !!data.active,
    };

    const res = await databases.createDocument(
      databaseId,
      collectionId,
      ID.unique(),
      payload
    );
    return res.$id || null;
  } catch (e) {
    console.error("saveDiscountConfiguration error:", e);
    return null;
  }
}

export async function updateDiscountConfiguration(
  id: string,
  data: Partial<Omit<DiscountConfig, "id" | "createdAt">>
): Promise<boolean> {
  try {
    const databaseId = config.databaseId!;
    const collectionId = getCollectionId();
    if (!databaseId || !collectionId) return false;

    const payload: any = {};
    if (data.passengerType !== undefined)
      payload.passengerType = data.passengerType;
    if (data.busType !== undefined) payload.busType = data.busType;
    if (data.discountPercentage !== undefined)
      payload.discountPercentage = Number(data.discountPercentage) || 0;
    if (data.description !== undefined) payload.description = data.description;
    if (data.active !== undefined) payload.active = !!data.active;

    await databases.updateDocument(databaseId, collectionId, id, payload);
    return true;
  } catch (e) {
    console.error("updateDiscountConfiguration error:", e);
    return false;
  }
}

export async function deleteDiscountConfiguration(
  id: string
): Promise<boolean> {
  try {
    const databaseId = config.databaseId!;
    const collectionId = getCollectionId();
    if (!databaseId || !collectionId) return false;
    await databases.deleteDocument(databaseId, collectionId, id);
    return true;
  } catch (e) {
    console.error("deleteDiscountConfiguration error:", e);
    return false;
  }
}

// ---------- Queries / Helpers ----------

/**
 * Get discount percentage for a (passengerType, busType) combination.
 * Fallback order:
 *  1) exact (passengerType + busType)
 *  2) passengerType with "Any" busType
 *  3) "Regular" passengerType with exact busType
 *  4) no discount (0)
 */
export async function getDiscountPercentage(
  passengerType: string,
  busType?: string
): Promise<number> {
  const all = await getDiscountConfigurations();
  const bt = busType || "Regular";

  // 1) exact
  const exact = all.find(
    (d) => d.active && eq(d.passengerType, passengerType) && eq(d.busType, bt)
  );
  if (exact) return clampPct(exact.discountPercentage);

  // 2) passengerType + Any
  const any = all.find(
    (d) => d.active && eq(d.passengerType, passengerType) && isAny(d.busType)
  );
  if (any) return clampPct(any.discountPercentage);

  // 3) fallback Regular + exact busType
  const fallback = all.find(
    (d) => d.active && eq(d.passengerType, "Regular") && eq(d.busType, bt)
  );
  if (fallback) return clampPct(fallback.discountPercentage);

  return 0;
}

/**
 * Returns a de-duplicated list of bus types with an overall active flag.
 * The "active" is true if there exists at least one active discount document for that busType.
 */
export async function getBusTypeConfigurations(): Promise<
  Array<{ busType: string; active: boolean }>
> {
  const all = await getDiscountConfigurations();
  const map: Record<string, boolean> = {};
  for (const d of all) {
    const key = (d.busType || "Regular").trim();
    if (!map[key]) map[key] = false;
    // mark active if any active doc uses this busType
    if (d.active) map[key] = true;
  }
  // Ensure at least "Regular" exists
  if (!("Regular" in map)) map["Regular"] = true;
  return Object.keys(map).map((k) => ({ busType: k, active: map[k] }));
}

/**
 * Multiplier to uplift fares by bus type.
 * Tries to infer from special docs where passengerType === "BASE" (optional),
 * otherwise falls back to a constant mapping.
 *
 * Example (optional) document for Aircon uplift:
 *   { passengerType: "BASE", busType: "Aircon", discountPercentage: 20, active: true }
 * which means +20% uplift for Aircon.
 */
export async function getBusTypeFareMultiplier(
  busType: string
): Promise<number> {
  const FALLBACK: Record<string, number> = {
    Regular: 1.0,
    Aircon: 1.2, // +20%
    Deluxe: 1.35, // +35%
    Premium: 1.5, // +50%
  };

  const bt = (busType || "Regular").trim();
  try {
    const all = await getDiscountConfigurations();
    // Look for a "BASE" rule for this busType
    const base = all.find(
      (d) => d.active && eq(d.passengerType, "BASE") && eq(d.busType, bt)
    );
    if (base) {
      const upliftPct = clampPct(base.discountPercentage); // interpret as uplift percent
      return 1 + upliftPct / 100;
    }
  } catch (e) {
    console.warn("getBusTypeFareMultiplier fallback:", e);
  }
  return FALLBACK[bt] ?? 1.0;
}

// ---------- utils ----------
const eq = (a?: string, b?: string) =>
  (a || "").toLowerCase().trim() === (b || "").toLowerCase().trim();
const isAny = (v?: string) =>
  ["*", "any", "all"].includes((v || "").toLowerCase().trim());
const clampPct = (n: number) => Math.max(0, Math.min(100, Number(n) || 0));
