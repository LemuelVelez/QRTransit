import { ID, Query } from "react-native-appwrite"
import { databases, config, client } from "./appwrite"
import { getConductorName } from "./conductor-service"
import { getDiscountConfigurations } from "./discount-service"
import type { BusInfo, PassengerInfo, InspectionRecord } from "./types"

// ---------- Collection IDs (env-aware) ----------
const getRoutesCollectionId = () =>
  process.env.EXPO_PUBLIC_APPWRITE_ROUTES_COLLECTION_ID || "routes"

const getTripsCollectionId = () =>
  process.env.EXPO_PUBLIC_APPWRITE_TRIPS_COLLECTION_ID || ""

const getInspectionsCollectionId = () =>
  process.env.EXPO_PUBLIC_APPWRITE_INSPECTIONS_COLLECTION_ID || "inspections"

// ---------- Helpers ----------
const getSafeConductorName = async (doc: any): Promise<string> => {
  if (doc.conductorName && String(doc.conductorName).trim() !== "") {
    return doc.conductorName
  }
  if (doc.conductorId) {
    try {
      const name = await getConductorName(doc.conductorId)
      if (name && name !== "Unknown Conductor") return name
    } catch (e) {
      console.error("Error getting conductor name:", e)
    }
    try {
      return `Conductor (ID: ${String(doc.conductorId).substring(0, 8)}...)`
    } catch {
      return `Conductor (ID: ${doc.conductorId})`
    }
  }
  return "Unknown Conductor"
}

const safeParseTimestamp = (timestamp: string | number): number => {
  if (typeof timestamp === "number") return timestamp
  const n = Number.parseInt(String(timestamp))
  return Number.isFinite(n) ? n : Date.now()
}

// Cache known passenger types from EXPO_PUBLIC_APPWRITE_DISCOUNTS_COLLECTION_ID
let _passengerTypeSet: Set<string> | null = null
async function getPassengerTypeSet(): Promise<Set<string>> {
  if (_passengerTypeSet) return _passengerTypeSet
  try {
    const cfgs = await getDiscountConfigurations()
    const set = new Set<string>()
    for (const c of cfgs) {
      if (c.passengerType && c.passengerType.toUpperCase() !== "BASE") {
        set.add(c.passengerType.toLowerCase())
      }
    }
    set.add("regular")
    _passengerTypeSet = set
    return set
  } catch {
    _passengerTypeSet = new Set(["regular", "student", "pwd", "senior"])
    return _passengerTypeSet
  }
}

function normalizePassengerType(pt: any, known: Set<string>): string {
  const s = String(pt || "").trim()
  if (!s) return "Regular"
  return known.has(s.toLowerCase()) ? s : "Regular"
}

function resolvePaymentMethod(doc: any): "QR" | "Cash" {
  const raw = (doc.paymentMethod ?? "").toString().trim()
  if (raw) return raw.toUpperCase() === "QR" ? "QR" : "Cash"
  const tx = (doc.transactionId ?? "").toString().trim()
  if (tx && tx !== "0000000000") return "QR"
  return "Cash"
}

// Build robust bus-number candidates: raw, no-leading-zeros, and zero-padded(5)
function makeBusNumberCandidates(raw: string): string[] {
  const s = String(raw || "").trim()
  const set = new Set<string>()
  if (!s) return []
  set.add(s)

  const digits = s.replace(/\D/g, "")
  if (digits) {
    // remove leading zeros
    const noZeros = digits.replace(/^0+/, "") || "0"
    set.add(noZeros)
    // common zero-pad length (5)
    if (digits.length < 5) set.add(digits.padStart(5, "0"))
  }

  return Array.from(set)
}

// ---------- Search a bus by number ----------
export async function searchBusByNumber(busNumber: string): Promise<BusInfo[]> {
  try {
    const databaseId = config.databaseId
    const collectionId = getRoutesCollectionId()

    if (!databaseId || !collectionId) throw new Error("Appwrite configuration missing")

    const clean = busNumber.trim()

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("busNumber", clean),
      Query.orderDesc("timestamp"),
    ])

    const results: BusInfo[] = []
    for (const doc of response.documents) {
      const conductorName = await getSafeConductorName(doc)
      results.push({
        id: doc.$id,
        busNumber: doc.busNumber,
        conductorId: doc.conductorId || "",
        conductorName,
        from: doc.from,
        to: doc.to,
        active: doc.active === true,
        timestamp: doc.timestamp,
      })
    }
    return results
  } catch (error) {
    console.error("Error searching for bus:", error)
    return []
  }
}

// ---------- Passengers (Trips) for a bus (robust busNumber matching) ----------
export async function getBusPassengers(busId: string, _conductorId: string): Promise<PassengerInfo[]> {
  try {
    const databaseId = config.databaseId
    const tripsCol = getTripsCollectionId()
    const routesCol = getRoutesCollectionId()

    if (!databaseId || !tripsCol) throw new Error("Appwrite configuration missing")

    // Read bus to get busNumber/from/to
    const bus = await databases.getDocument(databaseId, routesCol, busId)
    if (!bus) throw new Error("Bus details not found")

    const knownTypes = await getPassengerTypeSet()
    const busNumberRaw = String(bus.busNumber ?? "").trim()
    const candidates = makeBusNumberCandidates(busNumberRaw)

    // 1) Try by busNumber (with candidate variants), newest first
    for (const cand of candidates) {
      try {
        const resp = await databases.listDocuments(databaseId, tripsCol, [
          Query.equal("busNumber", cand),
          Query.orderDesc("timestamp"),
        ])
        if (resp.documents.length > 0) {
          return resp.documents.map((doc: any) => ({
            id: doc.$id,
            name: doc.passengerName || "Unknown Passenger",
            fare: doc.totalFare || doc.fare || "₱0.00",
            from: doc.from || "Unknown",
            to: doc.to || "Unknown",
            timestamp: doc.timestamp || Date.now().toString(),
            paymentMethod: resolvePaymentMethod(doc),
            passengerType: normalizePassengerType(doc.passengerType, knownTypes),
            passengerPhoto: doc.passengerPhoto || "",
          }))
        }
      } catch (e) {
        // continue to next candidate
      }
    }

    // 2) Fallback: use route (from/to). Prefer rows whose busNumber matches any candidate.
    try {
      const routeResp = await databases.listDocuments(databaseId, tripsCol, [
        Query.equal("from", bus.from),
        Query.equal("to", bus.to),
        Query.orderDesc("timestamp"),
      ])

      const rows = routeResp.documents.filter((doc: any) => {
        const bn = String(doc.busNumber ?? "").trim()
        if (!bn) return false // keep it strict to avoid mixing other buses
        return candidates.includes(bn)
      })

      if (rows.length > 0) {
        return rows.map((doc: any) => ({
          id: doc.$id,
          name: doc.passengerName || "Unknown Passenger",
          fare: doc.totalFare || doc.fare || "₱0.00",
          from: doc.from || "Unknown",
          to: doc.to || "Unknown",
          timestamp: doc.timestamp || Date.now().toString(),
          paymentMethod: resolvePaymentMethod(doc),
          passengerType: normalizePassengerType(doc.passengerType, knownTypes),
          passengerPhoto: doc.passengerPhoto || "",
        }))
      }
    } catch (e) {
      // swallow fallback errors
    }

    // Nothing found
    return []
  } catch (error) {
    console.error("Error getting bus passengers:", error)
    return []
  }
}

// ---------- Realtime subscription for passengers on a bus ----------
export function subscribeToBusPassengers(
  busNumber: string,
  _conductorId: string,
  onChange: () => void
): () => void {
  const databaseId = config.databaseId
  const tripsCol = getTripsCollectionId()
  if (!client || !databaseId || !tripsCol) {
    console.warn("[Realtime] disabled (missing Appwrite config).")
    return () => {}
  }

  const candidates = makeBusNumberCandidates(String(busNumber || ""))

  const channel = `databases.${databaseId}.collections.${tripsCol}.documents.*`
  try {
    const unsubscribe = client.subscribe(channel, (event: any) => {
      const doc = event?.payload
      if (!doc) return

      const bn = String(doc.busNumber ?? "").trim()
      if (!bn) return
      if (!candidates.includes(bn)) return

      // if any create/update/delete for this bus number occurs, refresh
      if (
        Array.isArray(event.events) &&
        event.events.some((e: string) =>
          e.endsWith(".create") || e.endsWith(".update") || e.endsWith(".delete")
        )
      ) {
        onChange()
      }
    })
    return unsubscribe
  } catch (e) {
    console.error("[Realtime] subscribe error:", e)
    return () => {}
  }
}

// ---------- Mark a bus as cleared ----------
export async function markBusAsCleared(
  busId: string,
  inspectorId: string,
  inspectionFrom: string,
  inspectionTo: string,
): Promise<boolean> {
  try {
    const databaseId = config.databaseId
    const collectionId = getInspectionsCollectionId()
    const routesCollectionId = getRoutesCollectionId()

    if (!databaseId || !collectionId) throw new Error("Appwrite configuration missing")

    const busDetails = await databases.getDocument(databaseId, routesCollectionId, busId)
    const passengers = await getBusPassengers(busId, busDetails.conductorId)
    const conductorName = await getSafeConductorName(busDetails)

    const inspectionRecord = {
      inspectorId,
      busId,
      busNumber: busDetails.busNumber,
      conductorId: busDetails.conductorId || "",
      conductorName,
      timestamp: Date.now().toString(),
      inspectionFrom,
      inspectionTo,
      passengerCount: passengers.length.toString(),
      status: "cleared",
    }

    await databases.createDocument(databaseId, collectionId, ID.unique(), inspectionRecord)
    return true
  } catch (error) {
    console.error("Error marking bus as cleared:", error)
    return false
  }
}

// ---------- Inspector history/stats ----------
export async function getInspectionHistory(inspectorId: string): Promise<InspectionRecord[]> {
  try {
    const databaseId = config.databaseId
    const collectionId = getInspectionsCollectionId()

    if (!databaseId || !collectionId) throw new Error("Appwrite configuration missing")

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("inspectorId", inspectorId),
      Query.orderDesc("timestamp"),
    ])

    const results: InspectionRecord[] = []
    for (const doc of response.documents) {
      const conductorName = await getSafeConductorName(doc)
      results.push({
        id: doc.$id,
        inspectorId: doc.inspectorId,
        busId: doc.busId,
        busNumber: doc.busNumber,
        conductorId: doc.conductorId || "",
        conductorName,
        timestamp: doc.timestamp,
        inspectionFrom: doc.inspectionFrom,
        inspectionTo: doc.inspectionTo,
        passengerCount: doc.passengerCount,
        status: doc.status || "cleared",
      })
    }
    return results
  } catch (error) {
    console.error("Error getting inspection history:", error)
    return []
  }
}

export async function getInspectorStats(inspectorId: string): Promise<{
  totalInspections: string
  totalBusesCleared: string
  lastActive: string
}> {
  try {
    const databaseId = config.databaseId
    const collectionId = getInspectionsCollectionId()

    if (!databaseId || !collectionId) throw new Error("Appwrite configuration missing")

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("inspectorId", inspectorId),
      Query.orderDesc("timestamp"),
    ])

    const inspections = response.documents
    const totalInspections = inspections.length.toString()
    const totalBusesCleared = inspections.filter((d: any) => d.status === "cleared").length.toString()

    const lastTs = inspections.length > 0 ? inspections[0].timestamp : Date.now().toString()
    const lastActive = new Date(safeParseTimestamp(lastTs)).toLocaleDateString()

    return { totalInspections, totalBusesCleared, lastActive }
  } catch (error) {
    console.error("Error getting inspector stats:", error)
    return {
      totalInspections: "0",
      totalBusesCleared: "0",
      lastActive: new Date().toLocaleDateString(),
    }
  }
}
