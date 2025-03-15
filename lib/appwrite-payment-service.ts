import { ID, Query } from "react-native-appwrite";
import { databases, config, client } from "./appwrite";

// Define the collection IDs
const getPaymentRequestsCollectionId = () => {
  return process.env.EXPO_PUBLIC_APPWRITE_PAYMENT_REQUESTS_COLLECTION_ID || "";
};

// Payment request interface
export interface PaymentRequest {
  id: string;
  conductorId: string;
  conductorName: string;
  passengerId: string;
  passengerName: string;
  fare: string;
  from: string;
  to: string;
  timestamp: number;
  status: "pending" | "approved" | "declined" | "completed" | "expired";
  transactionId?: string;
}

// Create a new payment request
export async function createPaymentRequest(
  conductorId: string,
  conductorName: string,
  passengerId: string,
  passengerName: string,
  fare: string,
  from: string,
  to: string
): Promise<PaymentRequest> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getPaymentRequestsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    const requestId = ID.unique();
    const timestamp = Date.now();

    const paymentRequest = {
      conductorId,
      conductorName,
      passengerId,
      passengerName,
      fare,
      from,
      to,
      timestamp: timestamp,
      status: "pending",
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
    };
  } catch (error) {
    console.error("Error creating payment request:", error);
    throw error;
  }
}

// Update payment request status
export async function updatePaymentRequestStatus(
  requestId: string,
  status: "approved" | "declined" | "completed" | "expired",
  transactionId?: string
): Promise<void> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getPaymentRequestsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    const updateData: any = { status };
    if (transactionId) {
      updateData.transactionId = transactionId;
    }

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

// Get payment requests for a user (either as passenger or conductor)
export async function getPaymentRequests(
  userId: string,
  role: "passenger" | "conductor",
  status?: string
): Promise<PaymentRequest[]> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getPaymentRequestsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    const queries = [
      Query.equal(role === "passenger" ? "passengerId" : "conductorId", userId),
    ];

    if (status) {
      queries.push(Query.equal("status", status));
    }

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
    }));
  } catch (error) {
    console.error("Error getting payment requests:", error);
    return [];
  }
}

// Get a specific payment request by ID
export async function getPaymentRequest(
  requestId: string
): Promise<PaymentRequest | null> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getPaymentRequestsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

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
    };
  } catch (error) {
    console.error("Error getting payment request:", error);
    return null;
  }
}

// Subscribe to payment request updates
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
    // Create a channel string for the collection
    const channel = `databases.${databaseId}.collections.${collectionId}.documents`;

    // Subscribe to the channel using the client
    const unsubscribe = client.subscribe(channel, (response: any) => {
      // Check if this is a relevant document
      const document = response.payload;

      if (
        document &&
        ((role === "passenger" && document.passengerId === userId) ||
          (role === "conductor" && document.conductorId === userId))
      ) {
        // Convert to PaymentRequest type
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
        };

        // Call the callback with the payment request
        callback(paymentRequest);
      }
    });

    return unsubscribe;
  } catch (error) {
    console.error("Error subscribing to payment requests:", error);
    return () => {};
  }
}

// Clean up expired payment requests (utility function)
export async function cleanupExpiredPaymentRequests(): Promise<number> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getPaymentRequestsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    // Get pending requests older than 10 minutes
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("status", "pending"),
      Query.lessThan("timestamp", tenMinutesAgo),
    ]);

    let updatedCount = 0;

    // Update each expired request
    for (const doc of response.documents) {
      await databases.updateDocument(databaseId, collectionId, doc.$id, {
        status: "expired",
      });
      updatedCount++;
    }

    return updatedCount;
  } catch (error) {
    console.error("Error cleaning up expired payment requests:", error);
    return 0;
  }
}
