// lib/appwrite-payment-service.ts
import { ID, Query } from "react-native-appwrite";
import { databases, config, client, listAllDocuments } from "./appwrite";

const PAYMENT_REQUESTS_COLLECTION_ID =
  process.env.EXPO_PUBLIC_APPWRITE_PAYMENT_REQUESTS_COLLECTION_ID ?? "";

const getPaymentRequestsCollectionId = () => PAYMENT_REQUESTS_COLLECTION_ID;

export interface PaymentRequest {
  id: string;
  conductorId: string;
  conductorName: string;
  passengerId: string;
  passengerName: string;
  fare: string; // total (legacy)
  from: string;
  to: string;
  timestamp: string;
  status:
    | "pending"
    | "approved"
    | "declined"
    | "completed"
    | "expired"
    | "viewed";
  transactionId?: string;
  busNumber?: string;
  busType?: string;
  ticketCount?: string;
  farePerPassenger?: string;
  totalFare?: string;
  /** ✅ NEW: carry selected passenger type through QR flow */
  passengerType?: string;
}

export async function createPaymentRequest(
  conductorId: string,
  conductorName: string,
  passengerId: string,
  passengerName: string,
  totalFare: string,
  from: string,
  to: string,
  busNumber?: string,
  busType?: string,
  ticketCount?: string,
  farePerPassenger?: string,
  /** ✅ NEW */
  passengerType?: string
): Promise<PaymentRequest> {
  const databaseId = config.databaseId;
  const collectionId = getPaymentRequestsCollectionId();
  if (!databaseId || !collectionId)
    throw new Error("Appwrite configuration missing");

  const requestId = ID.unique();
  const timestamp = new Date().toISOString();

  const payload = {
    conductorId,
    conductorName,
    passengerId,
    passengerName,
    fare: totalFare,
    totalFare,
    farePerPassenger: farePerPassenger || "",
    ticketCount: ticketCount ?? "1",
    from,
    to,
    timestamp,
    status: "pending" as const,
    busNumber: busNumber || "",
    busType: busType || "Regular",
    /** ✅ include passengerType in the document */
    passengerType: passengerType || "Regular",
  };

  const response: any = await databases.createDocument(
    databaseId,
    collectionId,
    requestId,
    payload
  );

  return {
    id: response.$id,
    conductorId: response.conductorId,
    conductorName: response.conductorName,
    passengerId: response.passengerId,
    passengerName: response.passengerName,
    fare: response.fare,
    from: response.from,
    to: response.to,
    timestamp: response.timestamp,
    status: response.status,
    transactionId: response.transactionId,
    busNumber: response.busNumber,
    busType: response.busType,
    ticketCount: String(response.ticketCount ?? "1"),
    farePerPassenger: response.farePerPassenger || "",
    totalFare: response.totalFare || response.fare,
    /** ✅ map back */
    passengerType: response.passengerType || "Regular",
  };
}

export async function updatePaymentRequestStatus(
  requestId: string,
  status: "approved" | "declined" | "completed" | "expired" | "viewed",
  transactionId?: string
): Promise<void> {
  const databaseId = config.databaseId;
  const collectionId = getPaymentRequestsCollectionId();
  if (!databaseId || !collectionId)
    throw new Error("Appwrite configuration missing");

  const updateData: any = { status };
  if (transactionId) updateData.transactionId = transactionId;

  await databases.updateDocument(
    databaseId,
    collectionId,
    requestId,
    updateData
  );
}

export async function getPaymentRequests(
  userId: string,
  role: "passenger" | "conductor",
  status?: string
): Promise<PaymentRequest[]> {
  const databaseId = config.databaseId;
  const collectionId = getPaymentRequestsCollectionId();
  if (!databaseId || !collectionId)
    throw new Error("Appwrite configuration missing");

  const baseQueries = [
    Query.equal(role === "passenger" ? "passengerId" : "conductorId", userId),
    Query.orderDesc("timestamp"),
  ];
  if (status) baseQueries.push(Query.equal("status", status));

  const documents = await listAllDocuments(
    databaseId,
    collectionId,
    baseQueries,
    {
      batchSize: 100,
      maxDocs: 1000,
    }
  );

  return documents.map((doc: any) => ({
    id: doc.$id,
    conductorId: doc.conductorId,
    conductorName: doc.conductorName,
    passengerId: doc.passengerId,
    passengerName: doc.passengerName,
    fare: doc.fare,
    from: doc.from,
    to: doc.to,
    timestamp: doc.timestamp,
    status: doc.status,
    transactionId: doc.transactionId,
    busNumber: doc.busNumber,
    busType: doc.busType,
    ticketCount: String(doc.ticketCount ?? "1"),
    farePerPassenger: doc.farePerPassenger || "",
    totalFare: doc.totalFare || doc.fare,
    /** ✅ include */
    passengerType: doc.passengerType || "Regular",
  }));
}

export async function getPaymentRequest(
  requestId: string
): Promise<PaymentRequest | null> {
  if (!requestId) return null;
  const databaseId = config.databaseId;
  const collectionId = getPaymentRequestsCollectionId();
  if (!databaseId || !collectionId)
    throw new Error("Appwrite configuration missing");

  const doc: any = await databases.getDocument(
    databaseId,
    collectionId,
    requestId
  );

  return {
    id: doc.$id,
    conductorId: doc.conductorId,
    conductorName: doc.conductorName,
    passengerId: doc.passengerId,
    passengerName: doc.passengerName,
    fare: doc.fare,
    from: doc.from,
    to: doc.to,
    timestamp: doc.timestamp,
    status: doc.status,
    transactionId: doc.transactionId,
    busNumber: doc.busNumber,
    busType: doc.busType,
    ticketCount: String(doc.ticketCount ?? "1"),
    farePerPassenger: doc.farePerPassenger || "",
    totalFare: doc.totalFare || doc.fare,
    /** ✅ include */
    passengerType: doc.passengerType || "Regular",
  };
}

export function subscribeToPaymentRequests(
  userId: string,
  role: "passenger" | "conductor",
  callback: (paymentRequest: PaymentRequest) => void
) {
  const databaseId = config.databaseId;
  const collectionId = getPaymentRequestsCollectionId();

  if (!config.endpoint || !config.projectId || !databaseId || !collectionId) {
    console.warn("[Appwrite] Realtime disabled (missing configuration).");
    return () => {};
  }

  const channel = `databases.${databaseId}.collections.${collectionId}.documents.*`;

  try {
    const unsubscribe = client.subscribe(channel, (response: any) => {
      const document = response?.payload;
      if (!document || typeof document.$id !== "string") return;

      const matchesRole =
        (role === "passenger" && document.passengerId === userId) ||
        (role === "conductor" && document.conductorId === userId);

      if (!matchesRole) return;

      const paymentRequest: PaymentRequest = {
        id: document.$id,
        conductorId: document.conductorId,
        conductorName: document.conductorName,
        passengerId: document.passengerId,
        passengerName: document.passengerName,
        fare: document.fare,
        from: document.from,
        to: document.to,
        timestamp: document.timestamp,
        status: document.status,
        transactionId: document.transactionId,
        busNumber: document.busNumber,
        busType: document.busType,
        ticketCount: String(document.ticketCount ?? "1"),
        farePerPassenger: document.farePerPassenger || "",
        totalFare: document.totalFare || document.fare,
        /** ✅ include */
        passengerType: document.passengerType || "Regular",
      };

      callback(paymentRequest);
    });

    return unsubscribe;
  } catch (error) {
    console.error("Error subscribing to payment requests:", error);
    return () => {};
  }
}
