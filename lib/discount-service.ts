// lib/discount-service.ts
import { ID } from "react-native-appwrite";
import { databases, config, listAllDocuments } from "./appwrite";
import Constants from "expo-constants";

export interface DiscountConfig {
  id?: string;
  passengerType: string; // passenger type label OR "BASE" for bus rules
  busType?: string; // Only present for bus type rows
  discountPercentage: string;
  description?: string;
  active: boolean;
  createdAt?: string;
}

const BASE = "BASE";

// ------- robust env read (backup if config is missing) -------
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

const getPassengerCollectionId = () => config.discountsCollectionId || "";
const getBusTypeCollectionId = () =>
  config.busTypeCollectionId ||
  readEnv("EXPO_PUBLIC_APPWRITE_BUS_TYPE_COLLECTION_ID") ||
  "";
const getDatabaseId = () => config.databaseId || "";

// ---------------- utils ----------------
const eq = (a?: string, b?: string) =>
  (a || "").toLowerCase().trim() === (b || "").toLowerCase().trim();

const clampPct = (n: string | number) =>
  Math.max(0, Math.min(100, Number(n) || 0));
const toMultiplierStrFromPct = (pct: string | number): string => {
  const n = Number(pct);
  if (!Number.isFinite(n)) return "1";
  const clamped = clampPct(n);
  return String(Number((1 + clamped / 100).toFixed(4)));
};
const toPctStrFromMultiplier = (mult: string | number): string => {
  const m = Number(mult);
  if (!Number.isFinite(m) || m <= 0) return "0";
  return String(Number(((m - 1) * 100).toFixed(2)));
};

// -------- shared readers with fallback --------
async function listPassengerDocs(): Promise<any[]> {
  const db = getDatabaseId();
  const col = getPassengerCollectionId();
  if (!db || !col) return [];
  const docs = await listAllDocuments(db, col, [], {
    batchSize: 100,
    maxDocs: 2000,
  });
  return docs || [];
}

async function listBusTypeDocs(): Promise<any[]> {
  const db = getDatabaseId();
  const busCol = getBusTypeCollectionId();

  if (db && busCol) {
    try {
      const r = await listAllDocuments(db, busCol, [], {
        batchSize: 100,
        maxDocs: 2000,
      });
      return r || [];
    } catch (e) {
      console.warn(
        "listBusTypeDocs: bus collection read failed, trying fallback",
        e
      );
    }
  }

  try {
    const passenger = await listPassengerDocs();
    return (passenger || []).filter(
      (d: any) => d && typeof d.busType === "string" && d.busType.trim() !== ""
    );
  } catch (e) {
    console.warn("listBusTypeDocs: fallback read failed", e);
  }

  return [];
}

// ---------------- CRUD ----------------
export async function getDiscountConfigurations(): Promise<DiscountConfig[]> {
  try {
    const passengerDocs = (await listPassengerDocs()).map((doc: any) => ({
      id: doc.$id,
      passengerType: doc.passengerType,
      discountPercentage:
        doc.discountPercentage !== undefined && doc.discountPercentage !== null
          ? String(doc.discountPercentage)
          : "0",
      description: doc.description || "",
      active: !!doc.active,
      createdAt: doc.$createdAt,
    }));

    const busDocs = (await listBusTypeDocs()).map((doc: any) => {
      const pctString = doc.multiplier
        ? toPctStrFromMultiplier(String(doc.multiplier))
        : doc.discountPercentage !== undefined &&
          doc.discountPercentage !== null
        ? String(doc.discountPercentage)
        : "0";
      return {
        id: doc.$id,
        passengerType: BASE,
        busType: doc.busType,
        discountPercentage: pctString,
        description: doc.description || "",
        active: !!doc.active,
        createdAt: doc.$createdAt,
      } as DiscountConfig;
    });

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
    const db = getDatabaseId();
    if (!db) return null;

    const isBus =
      !!String(data.busType ?? "").trim() ||
      (data.passengerType || "").toUpperCase() === BASE;

    if (isBus) {
      const busCol = getBusTypeCollectionId();
      if (!busCol) {
        console.error(
          "saveDiscountConfiguration: Bus Types collection ID missing. Set config.busTypeCollectionId or EXPO_PUBLIC_APPWRITE_BUS_TYPE_COLLECTION_ID."
        );
        return null;
      }
      const payload = {
        busType: String(data.busType || "").trim(), // ⛔ no "Regular" default
        multiplier: toMultiplierStrFromPct(data.discountPercentage ?? "0"),
        description: data.description || "",
        active: !!data.active,
      };
      const res = await databases.createDocument(
        db,
        busCol,
        ID.unique(),
        payload
      );
      return res.$id || null;
    }

    const passengerCol = getPassengerCollectionId();
    if (!passengerCol) return null;

    const payload = {
      passengerType: data.passengerType,
      discountPercentage: String(data.discountPercentage ?? "0"),
      description: data.description || "",
      active: !!data.active,
    };
    const res = await databases.createDocument(
      db,
      passengerCol,
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
  const db = getDatabaseId();
  if (!db) return false;

  const passengerPayload: any = {};
  if (data.passengerType !== undefined)
    passengerPayload.passengerType = data.passengerType;
  if (data.discountPercentage !== undefined)
    passengerPayload.discountPercentage = String(data.discountPercentage);
  if (data.description !== undefined)
    passengerPayload.description = data.description;
  if (data.active !== undefined) passengerPayload.active = !!data.active;

  const busPayload: any = {};
  if (data.busType !== undefined) busPayload.busType = data.busType;
  if (data.discountPercentage !== undefined)
    busPayload.multiplier = toMultiplierStrFromPct(data.discountPercentage);
  if (data.description !== undefined) busPayload.description = data.description;
  if (data.active !== undefined) busPayload.active = !!data.active;

  try {
    const passengerCol = getPassengerCollectionId();
    if (passengerCol) {
      await databases.updateDocument(db, passengerCol, id, passengerPayload);
      return true;
    }
  } catch {
    // fallthrough
  }

  try {
    const busCol = getBusTypeCollectionId();
    if (busCol) {
      await databases.updateDocument(db, busCol, id, busPayload);
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
  const db = getDatabaseId();
  if (!db) return false;

  try {
    const passengerCol = getPassengerCollectionId();
    if (passengerCol) {
      await databases.deleteDocument(db, passengerCol, id);
      return true;
    }
  } catch {
    // try bus col next
  }

  try {
    const busCol = getBusTypeCollectionId();
    if (busCol) {
      await databases.deleteDocument(db, busCol, id);
      return true;
    }
  } catch (e) {
    console.error("deleteDiscountConfiguration error:", e);
  }

  return false;
}

// ---------------- Queries / Helpers ----------------
export async function getDiscountPercentage(
  passengerType: string,
  _busType: string
): Promise<number> {
  const all = await getDiscountConfigurations();
  const passengerOnly = all.filter((d) => d.active && d.passengerType !== BASE);

  // Only exact passengerType discount; ⛔ no fallback to "Regular"
  const exact = passengerOnly.find((d) => eq(d.passengerType, passengerType));
  if (exact) return clampPct(exact.discountPercentage);

  return 0; // no available discount
}

export async function getBusTypeConfigurations(): Promise<
  Array<{ busType: string; active: boolean }>
> {
  try {
    const docs = await listBusTypeDocs();
    const map: Record<string, boolean> = {};
    for (const doc of docs) {
      const key = String(doc.busType || "").trim();
      if (!key) continue;
      if (!map[key]) map[key] = false;
      if (doc.active) map[key] = true;
    }
    // ⛔ Do not inject "Regular" or any placeholder
    return Object.keys(map).map((k) => ({ busType: k, active: map[k] }));
  } catch (e) {
    console.warn("getBusTypeConfigurations error:", e);
    return []; // ⛔ no placeholder
  }
}

export async function getBusTypeFareMultiplier(
  busType: string
): Promise<number> {
  // Allow some common types as safety fallback if explicitly chosen,
  // but do NOT assume any default when busType is empty.
  const FALLBACK: Record<string, number> = {
    Aircon: 1.2,
    "Air-Conditioned": 1.2,
    "Air Conditioned": 1.2,
    Deluxe: 1.35,
    Premium: 1.5,
  };

  const bt = (busType || "").trim();
  if (!bt) return 1.0; // ⛔ no default name; neutral multiplier

  try {
    const docs = await listBusTypeDocs();
    const match = docs.find((d: any) => eq(d.busType, bt));
    if (match && match.active) {
      if (match.multiplier) {
        const m = Number(match.multiplier);
        if (Number.isFinite(m) && m > 0) return m;
      }
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
  return FALLBACK[bt] ?? 1.0;
}
