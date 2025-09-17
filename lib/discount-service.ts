// lib/discount-service.ts
import { ID } from "react-native-appwrite";
import { databases, config } from "./appwrite";

export interface DiscountConfig {
  id?: string;
  passengerType: string; // e.g., "Regular", "Student", "Senior", "PWD" OR "BASE" for bus-type rules
  // busType is now ONLY for Bus Types collection entries
  busType?: string; // e.g., "Regular", "Air-Conditioned", "Deluxe" (present only for BASE rows)
  // UI expects a percentage string for both passenger and bus entries
  discountPercentage: string;
  description?: string;
  active: boolean;
  createdAt?: string;
}

const ANY = "Any";
const BASE = "BASE";

// Collection resolvers
const getPassengerCollectionId = () => config.discountsCollectionId || "";
const getBusTypeCollectionId = () =>
  config.busTypeCollectionId ||
  process.env.EXPO_PUBLIC_APPWRITE_BUS_TYPE_COLLECTION_ID ||
  "";

// ---------- utils ----------
const eq = (a?: string, b?: string) =>
  (a || "").toLowerCase().trim() === (b || "").toLowerCase().trim();

const isAny = (v?: string) =>
  ["*", "any", "all", ANY.toLowerCase()].includes(
    (v || "").toLowerCase().trim()
  );

const clampPct = (n: string | number) =>
  Math.max(0, Math.min(100, Number(n) || 0));

function toMultiplierStrFromPct(pct: string | number): string {
  const n = Number(pct);
  if (!Number.isFinite(n)) return "1";
  const clamped = clampPct(n);
  const mult = 1 + clamped / 100;
  return String(Number(mult.toFixed(4))); // normalized string like "1.2"
}

function toPctStrFromMultiplier(mult: string | number): string {
  const m = Number(mult);
  if (!Number.isFinite(m) || m <= 0) return "0";
  const pct = (m - 1) * 100;
  const clamped = Math.max(0, Math.min(100, pct));
  return String(Number(clamped.toFixed(2))); // "20" or "20.5"
}

// ---------- CRUD ----------

/**
 * Returns a merged list:
 *  - Passenger discounts from Passenger collection (NO busType field)
 *  - Bus type rules from Bus Type collection, surfaced as percentage strings in `discountPercentage`
 *    (UI continues to show “Uplift %”, but backend stores `multiplier` string)
 */
export async function getDiscountConfigurations(): Promise<DiscountConfig[]> {
  try {
    const databaseId = config.databaseId!;
    const passengerCol = getPassengerCollectionId();
    const busCol = getBusTypeCollectionId();
    if (!databaseId) return [];

    // Passenger discount docs (no busType persisted anymore)
    const passengerDocs: DiscountConfig[] = [];
    if (passengerCol) {
      const res = await databases.listDocuments(databaseId, passengerCol, []);
      passengerDocs.push(
        ...res.documents.map((doc: any) => ({
          id: doc.$id,
          passengerType: doc.passengerType,
          // NOTE: busType intentionally omitted for passenger docs
          discountPercentage:
            doc.discountPercentage !== undefined &&
            doc.discountPercentage !== null
              ? String(doc.discountPercentage)
              : "0",
          description: doc.description || "",
          active: !!doc.active,
          createdAt: doc.$createdAt,
        }))
      );
    }

    // Bus type docs — convert multiplier(string) -> percentage(string) for UI
    const busDocs: DiscountConfig[] = [];
    if (busCol) {
      const res2 = await databases.listDocuments(databaseId, busCol, []);
      busDocs.push(
        ...res2.documents.map((doc: any) => {
          // Primary: multiplier (string). Back-compat: discountPercentage (percent) if present.
          const pctString = doc.multiplier
            ? toPctStrFromMultiplier(String(doc.multiplier))
            : doc.discountPercentage !== undefined &&
              doc.discountPercentage !== null
            ? String(doc.discountPercentage)
            : "0";

          return {
            id: doc.$id,
            passengerType: BASE, // synthesized
            busType: doc.busType,
            discountPercentage: pctString, // UI uses this as uplift %
            description: doc.description || "",
            active: !!doc.active,
            createdAt: doc.$createdAt,
          };
        })
      );
    }

    return [...passengerDocs, ...busDocs];
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
    if (!databaseId) return null;

    const isBus = (data.passengerType || "").toUpperCase() === BASE;
    const collectionId = isBus
      ? getBusTypeCollectionId()
      : getPassengerCollectionId();
    if (!collectionId) return null;

    if (isBus) {
      // Store multiplier as STRING in Bus Types collection
      const payload = {
        busType: data.busType,
        multiplier: toMultiplierStrFromPct(data.discountPercentage ?? "0"),
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
    } else {
      // Passenger discounts stored WITHOUT busType
      const payload = {
        passengerType: data.passengerType,
        discountPercentage: String(data.discountPercentage ?? "0"),
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
    }
  } catch (e) {
    console.error("saveDiscountConfiguration error:", e);
    return null;
  }
}

export async function updateDiscountConfiguration(
  id: string,
  data: Partial<Omit<DiscountConfig, "id" | "createdAt">>
): Promise<boolean> {
  const databaseId = config.databaseId!;
  if (!databaseId) return false;

  // Passenger payload (percentage string) — NO busType field anymore
  const passengerPayload: any = {};
  if (data.passengerType !== undefined)
    passengerPayload.passengerType = data.passengerType;
  if (data.discountPercentage !== undefined) {
    passengerPayload.discountPercentage = String(data.discountPercentage);
  }
  if (data.description !== undefined)
    passengerPayload.description = data.description;
  if (data.active !== undefined) passengerPayload.active = !!data.active;

  // Bus payload (multiplier string)
  const busPayload: any = {};
  if (data.busType !== undefined) busPayload.busType = data.busType;
  if (data.discountPercentage !== undefined) {
    // Convert incoming percentage string from UI -> multiplier string
    busPayload.multiplier = toMultiplierStrFromPct(data.discountPercentage);
  }
  if (data.description !== undefined) busPayload.description = data.description;
  if (data.active !== undefined) busPayload.active = !!data.active;

  // Try updating in Passenger collection first
  try {
    const passengerCol = getPassengerCollectionId();
    if (passengerCol) {
      await databases.updateDocument(
        databaseId,
        passengerCol,
        id,
        passengerPayload
      );
      return true;
    }
  } catch {
    // fall through to try bus collection
  }

  // Then try Bus Types collection
  try {
    const busCol = getBusTypeCollectionId();
    if (busCol) {
      await databases.updateDocument(databaseId, busCol, id, busPayload);
      return true;
    }
  } catch (e2) {
    console.error("updateDiscountConfiguration error:", e2);
  }

  return false;
}

export async function deleteDiscountConfiguration(
  id: string
): Promise<boolean> {
  const databaseId = config.databaseId!;
  if (!databaseId) return false;

  // Try passenger collection first
  try {
    const passengerCol = getPassengerCollectionId();
    if (passengerCol) {
      await databases.deleteDocument(databaseId, passengerCol, id);
      return true;
    }
  } catch {
    // try bus col
  }

  try {
    const busCol = getBusTypeCollectionId();
    if (busCol) {
      await databases.deleteDocument(databaseId, busCol, id);
      return true;
    }
  } catch (e) {
    console.error("deleteDiscountConfiguration error:", e);
  }

  return false;
}

// ---------- Queries / Helpers ----------

/**
 * Get discount percentage for a passengerType.
 * Passenger discounts ONLY, now independent of bus type.
 */
export async function getDiscountPercentage(
  passengerType: string,
  _busType?: string // ignored for backward compatibility
): Promise<number> {
  const all = await getDiscountConfigurations();

  // Consider passenger-only (exclude BASE)
  const passengerOnly = all.filter((d) => d.active && d.passengerType !== BASE);

  // 1) exact passengerType
  const exact = passengerOnly.find((d) => eq(d.passengerType, passengerType));
  if (exact) return clampPct(exact.discountPercentage);

  // 2) fallback to Regular
  const regular = passengerOnly.find((d) => eq(d.passengerType, "Regular"));
  if (regular) return clampPct(regular.discountPercentage);

  return 0;
}

/**
 * Returns a de-duplicated list of bus types with an overall active flag.
 * Reads directly from the Bus Types collection.
 */
export async function getBusTypeConfigurations(): Promise<
  Array<{ busType: string; active: boolean }>
> {
  const databaseId = config.databaseId!;
  const busCol = getBusTypeCollectionId();
  if (!databaseId || !busCol) {
    return [{ busType: "Regular", active: true }];
  }

  try {
    const res = await databases.listDocuments(databaseId, busCol, []);
    const map: Record<string, boolean> = {};
    for (const doc of res.documents) {
      const key = (doc.busType || "Regular").trim();
      if (!map[key]) map[key] = false;
      if (doc.active) map[key] = true;
    }
    if (!("Regular" in map)) map["Regular"] = true;
    return Object.keys(map).map((k) => ({ busType: k, active: map[k] }));
  } catch (e) {
    console.warn("getBusTypeConfigurations error:", e);
    return [{ busType: "Regular", active: true }];
  }
}

/**
 * Multiplier to uplift fares by bus type.
 * Reads from Bus Types collection: `multiplier` (string).
 * Back-compat: if a legacy `discountPercentage` exists, interpret it as uplift %.
 */
export async function getBusTypeFareMultiplier(
  busType: string
): Promise<number> {
  const FALLBACK: Record<string, number> = {
    Regular: 1.0,
    Aircon: 1.2, // +20%
    "Air-Conditioned": 1.2, // +20%
    "Air Conditioned": 1.2, // +20%
    Deluxe: 1.35, // +35%
    Premium: 1.5, // +50%
  };

  const bt = (busType || "Regular").trim();
  const databaseId = config.databaseId!;
  const busCol = getBusTypeCollectionId();

  if (databaseId && busCol) {
    try {
      const res = await databases.listDocuments(databaseId, busCol, []);
      const match = res.documents.find((d: any) => eq(d.busType, bt));
      if (match && match.active) {
        if (match.multiplier) {
          const m = Number(match.multiplier);
          if (Number.isFinite(m) && m > 0) return m;
        }
        // Back-compat: legacy percent field
        if (
          match.discountPercentage !== undefined &&
          match.discountPercentage !== null
        ) {
          const pct = clampPct(match.discountPercentage);
          return 1 + pct / 100;
        }
      }
    } catch (e) {
      console.warn("getBusTypeFareMultiplier error (fallback used):", e);
    }
  }
  return FALLBACK[bt] ?? 1.0;
}
