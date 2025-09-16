import { ID, Query } from "react-native-appwrite";
import { databases, config, client } from "./appwrite";

const getPaymentRequestsCollectionId = () => {
  return process.env.EXPO_PUBLIC_APPWRITE_PAYMENT_REQUESTS_COLLECTION_ID || "";
};

export interface PaymentRequest {
  id: string;
  conductorId: string;
  conductorName: string;
  passengerId: string;
  passengerName: string;
  fare: string; // total (kept for backward compatibility)
  from: string;
  to: string;
  timestamp: string;
  status: "pending" | "approved" | "declined" | "completed" | "expired";
  transactionId?: string;
  busNumber?: string;
  // NEW
  ticketCount?: number;
  farePerPassenger?: string;
  totalFare?: string; // mirrors `fare`
}

// include new params
export async function createPaymentRequest(
  conductorId: string,
  conductorName: string,
  passengerId: string,
  passengerName: string,
  totalFare: string, // total to charge
  from: string,
  to: string,
  busNumber?: string,
  ticketCount?: number,
  farePerPassenger?: string
): Promise<PaymentRequest> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getPaymentRequestsCollectionId();
    if (!databaseId || !collectionId)
      throw new Error("Appwrite configuration missing");

    const requestId = ID.unique();
    const timestamp = new Date().toISOString();

    const paymentRequest = {
      conductorId,
      conductorName,
      passengerId,
      passengerName,
      fare: totalFare, // store total in legacy field
      totalFare: totalFare,
      farePerPassenger: farePerPassenger || "",
      ticketCount: ticketCount ?? 1,
      from,
      to,
      timestamp,
      status: "pending",
      busNumber: busNumber || "",
    };

    const response = await databases.createDocument(
      databaseId,
      collectionId,
      requestId,
      paymentRequest
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
      // NEW fields back
      ticketCount: Number(response.ticketCount || 1),
      farePerPassenger: response.farePerPassenger || "",
      totalFare: response.totalFare || response.fare,
    };
  } catch (error) {
    console.error("Error creating payment request:", error);
    throw error;
  }
}

export async function updatePaymentRequestStatus(
  requestId: string,
  status: "approved" | "declined" | "completed" | "expired",
  transactionId?: string
): Promise<void> {
  try {
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
  } catch (error) {
    console.error("Error updating payment request:", error);
    throw error;
  }
}

export async function getPaymentRequests(
  userId: string,
  role: "passenger" | "conductor",
  status?: string
): Promise<PaymentRequest[]> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getPaymentRequestsCollectionId();
    if (!databaseId || !collectionId)
      throw new Error("Appwrite configuration missing");

    const queries = [
      Query.equal(role === "passenger" ? "passengerId" : "conductorId", userId),
    ];
    if (status) queries.push(Query.equal("status", status));

    const response = await databases.listDocuments(
      databaseId,
      collectionId,
      queries
    );

    return response.documents.map((doc) => ({
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
      ticketCount: Number(doc.ticketCount || 1),
      farePerPassenger: doc.farePerPassenger || "",
      totalFare: doc.totalFare || doc.fare,
    }));
  } catch (error) {
    console.error("Error getting payment requests:", error);
    return [];
  }
}

export async function getPaymentRequest(
  requestId: string
): Promise<PaymentRequest | null> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getPaymentRequestsCollectionId();
    if (!databaseId || !collectionId)
      throw new Error("Appwrite configuration missing");

    const doc = await databases.getDocument(
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
      ticketCount: Number(doc.ticketCount || 1),
      farePerPassenger: doc.farePerPassenger || "",
      totalFare: doc.totalFare || doc.fare,
    };
  } catch (error) {
    console.error("Error getting payment request:", error);
    return null;
  }
}

export function subscribeToPaymentRequests(
  userId: string,
  role: "passenger" | "conductor",
  callback: (paymentRequest: PaymentRequest) => void
) {
  const databaseId = config.databaseId;
  const collectionId = getPaymentRequestsCollectionId();

  if (!databaseId || !collectionId) {
    console.error("Appwrite configuration missing");
    return () => {};
  }

  try {
    const channel = `databases.${databaseId}.collections.${collectionId}.documents`;

    const unsubscribe = client.subscribe(channel, (response: any) => {
      const document = response.payload;

      if (
        document &&
        ((role === "passenger" && document.passengerId === userId) ||
          (role === "conductor" && document.conductorId === userId))
      ) {
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
          ticketCount: Number(document.ticketCount || 1),
          farePerPassenger: document.farePerPassenger || "",
          totalFare: document.totalFare || document.fare,
        };

        callback(paymentRequest);
      }
    });

    return unsubscribe;
  } catch (error) {
    console.error("Error subscribing to payment requests:", error);
    return () => {};
  }
}
