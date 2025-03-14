// Service to handle transaction records with Appwrite
import { ID, Query } from "react-native-appwrite";
import { databases, config, account } from "./appwrite";
import { getCurrentUser } from "./appwrite";

// Transaction types
export type TransactionType = "CASH_IN" | "CASH_OUT" | "SEND" | "RECEIVE";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  paymentId?: string;
  timestamp: number;
  reference?: string;
  userId: string; // User ID for filtering transactions
  balance?: number; // Running balance after this transaction
  recipientId?: string; // Added for SEND transactions
}

// Add this new interface for notifications
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  transactionId?: string;
  type: "TRANSACTION" | "SYSTEM" | "PROMOTIONAL";
  timestamp: number;
  priority?: number;
  icon?: string;
  data?: any;
}

// Function to format date in a user-friendly way
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  // If it's today, show time
  if (date.toDateString() === now.toDateString()) {
    return `Today at ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  // If it's yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  // If it's within the last week, show day name
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  if (date > oneWeekAgo) {
    return date.toLocaleDateString([], { weekday: "long" });
  }

  // Otherwise show full date
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Function to convert a transaction to a notification
function transactionToNotification(
  transaction: Transaction
): Omit<Notification, "date" | "userId"> {
  let title = "Transaction Notification";
  let message = "";

  // Create appropriate message based on transaction type
  switch (transaction.type) {
    case "RECEIVE":
      title = "Money Received";
      message = `You have received ₱${transaction.amount.toFixed(2)}`;
      if (transaction.description) {
        message += ` - ${transaction.description}`;
      }
      break;
    case "SEND":
      title = "Money Sent";
      message = `You have sent ₱${transaction.amount.toFixed(2)}`;
      if (transaction.description) {
        message += ` - ${transaction.description}`;
      }
      break;
    case "CASH_IN":
      title = "Cash In Successful";
      message = `You have added ₱${transaction.amount.toFixed(
        2
      )} to your account`;
      break;
    case "CASH_OUT":
      title = "Cash Out Successful";
      message = `You have withdrawn ₱${transaction.amount.toFixed(
        2
      )} from your account`;
      break;
  }

  return {
    id: transaction.id,
    title,
    message,
    timestamp: transaction.timestamp,
    read: false, // Default to unread
    transactionId: transaction.id,
    type: "TRANSACTION",
  };
}

// Add this function to get the notifications collection ID
const getNotificationsCollectionId = () => {
  return process.env.EXPO_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION_ID || "";
};

// Get the authenticated user ID directly from account
// This ensures we always use the Auth user ID
export async function getAuthUserId(): Promise<string> {
  try {
    // Get user directly from account.get() instead of getCurrentUser()
    const authUser = await account.get();
    console.log("Auth User ID:", authUser.$id);
    return authUser.$id;
  } catch (error) {
    console.error("Error getting auth user ID:", error);

    // Fallback to getCurrentUser() if account.get() fails
    try {
      const currentUser = await getCurrentUser();
      if (currentUser && currentUser.$id) {
        console.log("Fallback User ID:", currentUser.$id);
        return currentUser.$id;
      }
    } catch (fallbackError) {
      console.error("Fallback error:", fallbackError);
    }

    throw new Error("Could not get authenticated user ID");
  }
}

// Create a notification in the database
export async function createNotification(
  notification: Omit<Notification, "date">
): Promise<string> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getNotificationsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    // Use getAuthUserId() if userId is not provided
    const userId = notification.userId || (await getAuthUserId());

    // Ensure read is a boolean value, not a string
    const isRead = notification.read === true;

    const result = await databases.createDocument(
      databaseId,
      collectionId,
      ID.unique(),
      {
        title: notification.title,
        message: notification.message,
        timestamp: notification.timestamp.toString(),
        read: isRead, // Ensure this is a boolean
        type: notification.type,
        userId: userId,
        transactionId: notification.transactionId || "",
        priority: (notification.priority || 2).toString(), // Convert priority to string
        icon: notification.icon || "",
        data: notification.data ? JSON.stringify(notification.data) : "",
      }
    );

    return result.$id;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

// Get notifications for the current user
export async function getUserNotifications(): Promise<Notification[]> {
  try {
    // Use getAuthUserId() instead of getCurrentUser()
    const userId = await getAuthUserId();

    const databaseId = config.databaseId;
    const collectionId = getNotificationsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
      return [];
    }

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("userId", userId),
      Query.orderDesc("timestamp"),
    ]);

    return response.documents.map((doc) => ({
      id: doc.$id,
      title: doc.title,
      message: doc.message,
      date: formatDate(Number(doc.timestamp)),
      read: doc.read === true || doc.read === "true", // Convert string "true" to boolean true
      type: doc.type,
      timestamp: Number(doc.timestamp),
      transactionId: doc.transactionId || undefined,
      userId: doc.userId,
      priority: doc.priority,
      icon: doc.icon,
      data: doc.data ? JSON.parse(doc.data) : undefined,
    }));
  } catch (error) {
    console.error("Error getting user notifications:", error);
    return [];
  }
}

// Get notifications for a specific time period
export async function getNotificationsByPeriod(
  days = 30
): Promise<Notification[]> {
  try {
    const notifications = await getUserNotifications();

    if (!notifications || notifications.length === 0) {
      return [];
    }

    // Calculate the cutoff date (e.g., 30 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffTimestamp = cutoffDate.getTime();

    // Filter notifications by date
    return notifications.filter(
      (notification) => notification.timestamp >= cutoffTimestamp
    );
  } catch (error) {
    console.error(`Error getting notifications for last ${days} days:`, error);
    return [];
  }
}

// Mark a notification as read
export async function markNotificationAsRead(
  notificationId: string
): Promise<void> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getNotificationsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    await databases.updateDocument(databaseId, collectionId, notificationId, {
      read: true, // This should be a boolean, not a string
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(): Promise<void> {
  try {
    // Use getAuthUserId() instead of getCurrentUser()
    const userId = await getAuthUserId();

    const databaseId = config.databaseId;
    const collectionId = getNotificationsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    // Get all unread notifications for the user
    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("userId", userId),
      Query.equal("read", false),
    ]);

    // Update each notification to mark as read
    const updatePromises = response.documents.map((doc) =>
      databases.updateDocument(databaseId, collectionId, doc.$id, {
        read: true,
      })
    );

    await Promise.all(updatePromises);
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
}

// Create a notification for a transaction
export async function createTransactionNotification(
  transaction: Transaction,
  specificUserId?: string
): Promise<void> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getNotificationsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    // Use the specificUserId if provided, otherwise use the transaction's userId
    const userId = specificUserId || transaction.userId;

    // Check if a notification for this transaction already exists for this user
    try {
      const existingNotifications = await databases.listDocuments(
        databaseId,
        collectionId,
        [
          Query.equal("transactionId", transaction.id),
          Query.equal("userId", userId),
          Query.limit(1),
        ]
      );

      if (existingNotifications.documents.length > 0) {
        console.log(
          `Notification for transaction ${transaction.id} and user ${userId} already exists. Skipping duplicate.`
        );
        return; // Exit early if notification already exists
      }
    } catch (checkError) {
      console.error("Error checking for existing notification:", checkError);
      // Continue with notification creation even if check fails
    }

    const notificationData = transactionToNotification(transaction);

    await createNotification({
      ...notificationData,
      userId: userId,
    });

    console.log(
      `Notification for transaction ${transaction.id} created for user ${userId}`
    );
  } catch (error) {
    console.error("Error creating transaction notification:", error);
  }
}

// Get collection ID from environment variables
const getTransactionsCollectionId = () => {
  return process.env.EXPO_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "";
};

const getUsersCollectionId = () => {
  return process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID || "";
};

// Calculate the new balance based on transaction type and previous balance
async function calculateNewBalance(
  userId: string,
  transaction: Transaction
): Promise<number> {
  try {
    // Get the most recent transaction to get the current balance
    const databaseId = config.databaseId;
    const collectionId = getTransactionsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("userId", userId),
      Query.orderDesc("timestamp"),
      Query.limit(1),
    ]);

    // Start with 0 if no previous transactions
    let currentBalance = 0;

    // If there's a previous transaction, use its balance
    if (response.documents.length > 0) {
      currentBalance = Number.parseFloat(response.documents[0].balance || "0");
    }

    // Calculate new balance based on transaction type
    let newBalance = currentBalance;

    if (transaction.type === "CASH_IN" || transaction.type === "RECEIVE") {
      newBalance += transaction.amount;
    } else if (transaction.type === "CASH_OUT" || transaction.type === "SEND") {
      newBalance -= transaction.amount;
    }

    return newBalance;
  } catch (error) {
    console.error("Error calculating new balance:", error);
    throw error;
  }
}

// Save a new transaction
export async function saveTransaction(transaction: Transaction): Promise<void> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getTransactionsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    // Check if a transaction with this ID already exists
    try {
      const existingTransactions = await databases.listDocuments(
        databaseId,
        collectionId,
        [Query.equal("transactionId", transaction.id), Query.limit(1)]
      );

      if (existingTransactions.documents.length > 0) {
        console.log(
          `Transaction with ID ${transaction.id} already exists. Skipping duplicate.`
        );
        return; // Exit early if transaction already exists
      }
    } catch (checkError) {
      console.error("Error checking for existing transaction:", checkError);
      // Continue with transaction creation even if check fails
    }

    // Calculate the new balance
    const balance = await calculateNewBalance(transaction.userId, transaction);

    // Convert numeric values to strings for Appwrite
    // This fixes the "Invalid document structure" errors
    await databases.createDocument(databaseId, collectionId, ID.unique(), {
      transactionId: transaction.id,
      type: transaction.type,
      amount: transaction.amount.toString(), // Convert to string
      description: transaction.description,
      paymentId: transaction.paymentId || "",
      timestamp: transaction.timestamp.toString(), // Convert to string
      reference: transaction.reference || "",
      userId: transaction.userId,
      balance: balance.toString(), // Store the running balance
      recipientId: transaction.recipientId || "", // Store recipient ID for SEND transactions
    });

    console.log(`Transaction ${transaction.id} saved successfully`);
  } catch (error) {
    console.error("Error saving transaction to Appwrite:", error);
    throw error;
  }
}

// Get all transactions for the current user
export async function getUserTransactions(): Promise<Transaction[]> {
  try {
    // Use getAuthUserId() instead of getCurrentUser()
    const userId = await getAuthUserId();

    return getTransactions(userId);
  } catch (error) {
    console.error("Error getting user transactions:", error);
    return [];
  }
}

// Get all transactions for a specific user ID
export async function getTransactions(userId: string): Promise<Transaction[]> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getTransactionsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
      return [];
    }

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("userId", userId),
      Query.orderDesc("timestamp"),
    ]);

    return response.documents.map((doc) => ({
      id: doc.transactionId,
      type: doc.type,
      amount: Number.parseFloat(doc.amount), // Convert string back to number
      description: doc.description,
      paymentId: doc.paymentId,
      timestamp: Number.parseInt(doc.timestamp, 10), // Convert string back to number
      reference: doc.reference,
      userId: doc.userId,
      balance: doc.balance ? Number.parseFloat(doc.balance) : undefined, // Convert balance string to number
      recipientId: doc.recipientId || undefined,
    }));
  } catch (error) {
    console.error("Error getting transactions from Appwrite:", error);
    return [];
  }
}

// Get all transactions for the current user without any filtering
export async function getAllUserTransactions(): Promise<Transaction[]> {
  try {
    // Use getAuthUserId() instead of getCurrentUser()
    const userId = await getAuthUserId();
    console.log("Getting all transactions for auth user ID:", userId);

    const databaseId = config.databaseId;
    const collectionId = getTransactionsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
      return [];
    }

    // Fetch all transactions for the current user without any type filtering
    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("userId", userId),
      Query.orderDesc("timestamp"),
    ]);

    console.log(`Found ${response.documents.length} transactions in database`);

    // Debug: Log the first few transactions
    if (response.documents.length > 0) {
      console.log(
        "First transaction:",
        JSON.stringify(response.documents[0], null, 2)
      );
    }

    return response.documents.map((doc) => ({
      id: doc.transactionId,
      type: doc.type,
      amount: Number.parseFloat(doc.amount),
      description: doc.description,
      paymentId: doc.paymentId,
      timestamp: Number.parseInt(doc.timestamp, 10),
      reference: doc.reference,
      userId: doc.userId,
      balance: doc.balance ? Number.parseFloat(doc.balance) : undefined,
      recipientId: doc.recipientId || undefined,
    }));
  } catch (error) {
    console.error("Error getting all user transactions from Appwrite:", error);
    return [];
  }
}

// Generate a unique transaction ID
export function generateTransactionId(): string {
  return (
    "txn_" +
    Math.random()
      .toString(36)
      .substring(2, 15) +
    Math.random()
      .toString(36)
      .substring(2, 15)
  );
}

// Get the current balance for a user
export async function calculateUserBalance(userId: string): Promise<number> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getTransactionsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    // Get the most recent transaction to get the current balance
    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("userId", userId),
      Query.orderDesc("timestamp"),
      Query.limit(1),
    ]);

    // If there are no transactions, the balance is 0
    if (response.documents.length === 0) {
      return 0;
    }

    // Return the balance from the most recent transaction
    return Number.parseFloat(response.documents[0].balance || "0");
  } catch (error) {
    console.error("Error calculating user balance:", error);
    throw error;
  }
}

// Get the current balance for the current user
export async function getCurrentUserBalance(): Promise<number> {
  try {
    // Use getAuthUserId() instead of getCurrentUser()
    const userId = await getAuthUserId();

    return calculateUserBalance(userId);
  } catch (error) {
    console.error("Error getting current user balance:", error);
    return 0;
  }
}

// Recalculate and update balances for all transactions
export async function recalculateAllBalances(userId: string): Promise<void> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getTransactionsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    // Get all transactions for the user, ordered by timestamp
    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("userId", userId),
      Query.orderAsc("timestamp"),
    ]);

    let runningBalance = 0;

    // Update each transaction with the correct running balance
    for (const doc of response.documents) {
      const amount = Number.parseFloat(doc.amount);
      const type = doc.type;

      // Update running balance based on transaction type
      if (type === "CASH_IN" || type === "RECEIVE") {
        runningBalance += amount;
      } else if (type === "CASH_OUT" || type === "SEND") {
        runningBalance -= amount;
      }

      // Update the document with the new balance
      await databases.updateDocument(databaseId, collectionId, doc.$id, {
        balance: runningBalance.toString(),
      });
    }
  } catch (error) {
    console.error("Error recalculating balances:", error);
    throw error;
  }
}

// Get the auth user ID for a user document
// This function maps a user document ID to its auth user ID
async function getAuthUserIdForUser(userDocId: string): Promise<string> {
  try {
    const databaseId = config.databaseId;
    const usersCollectionId = getUsersCollectionId();

    if (!databaseId || !usersCollectionId) {
      throw new Error("Appwrite configuration missing");
    }

    // Try to get the user document
    try {
      const userDoc = await databases.getDocument(
        databaseId,
        usersCollectionId,
        userDocId
      );

      // Check if the user document has a userId attribute
      if (userDoc && userDoc.userId) {
        console.log(
          `Found userId attribute in user document: ${userDoc.userId}`
        );
        return userDoc.userId;
      }

      // If no userId field, return the document ID as fallback
      console.log(`No userId found, using document ID: ${userDocId}`);
      return userDocId;
    } catch (docError) {
      // If we can't get the document, log but don't throw - return the original ID
      console.log(
        `Document not found for ID ${userDocId}, returning original ID`
      );
      return userDocId;
    }
  } catch (error) {
    console.error("Error in getAuthUserIdForUser:", error);
    // Return the original ID if anything fails - don't halt execution
    console.log(`Returning original ID ${userDocId} due to error`);
    return userDocId;
  }
}

// Find a user by name or phone number
async function findUserByNameOrNumber(searchTerm: string): Promise<any | null> {
  try {
    const databaseId = config.databaseId;
    const usersCollectionId = getUsersCollectionId();

    if (!databaseId || !usersCollectionId) {
      throw new Error("Appwrite configuration missing");
    }

    // Try to find by exact field matches using the correct field names from your schema
    const fieldNamesToSearch = [
      "phonenumber", // Exact field name from your schema (lowercase)
      "username",
      "email",
      "firstname",
      "lastname",
    ];

    // Try each field one by one
    for (const field of fieldNamesToSearch) {
      try {
        const response = await databases.listDocuments(
          databaseId,
          usersCollectionId,
          [Query.equal(field, searchTerm), Query.limit(1)]
        );

        if (response.documents.length > 0) {
          const user = response.documents[0];
          console.log(`Found user by ${field}:`, {
            docId: user.$id,
            userId: user.userId,
            authUserId: user.authUserId,
            firstname: user.firstname,
            lastname: user.lastname,
          });
          return user;
        }
      } catch (fieldError) {
        console.log(`Search by ${field} failed:`, fieldError);
      }
    }

    // If no exact match found, try to search by first name + last name combination
    try {
      // Split the search term to check if it's a "firstname lastname" format
      const nameParts = searchTerm.split(" ");
      if (nameParts.length === 2) {
        const firstName = nameParts[0];
        const lastName = nameParts[1];

        const response = await databases.listDocuments(
          databaseId,
          usersCollectionId,
          [
            Query.equal("firstname", firstName),
            Query.equal("lastname", lastName),
            Query.limit(1),
          ]
        );

        if (response.documents.length > 0) {
          const user = response.documents[0];
          console.log(`Found user by firstname+lastname:`, {
            docId: user.$id,
            userId: user.userId,
            authUserId: user.authUserId,
            firstname: user.firstname,
            lastname: user.lastname,
          });
          return user;
        }
      }
    } catch (nameError) {
      console.log("Search by first+last name failed:", nameError);
    }

    // If still not found, try a more flexible approach with partial matches
    try {
      // Get a batch of users to search through
      const response = await databases.listDocuments(
        databaseId,
        usersCollectionId,
        [
          Query.limit(100), // Limit to a reasonable number
        ]
      );

      // First try exact matches on any field
      for (const doc of response.documents) {
        for (const [key, value] of Object.entries(doc)) {
          // Add null/undefined check before calling toLowerCase()
          if (
            typeof value === "string" &&
            value && // Check that value is not empty
            searchTerm && // Check that searchTerm is not empty
            value.toLowerCase() === searchTerm.toLowerCase()
          ) {
            console.log(`Found user by flexible exact match on ${key}:`, {
              docId: doc.$id,
              userId: doc.userId,
              authUserId: doc.authUserId,
              firstname: doc.firstname,
              lastname: doc.lastname,
            });
            return doc;
          }
        }
      }

      // Then try partial matches (e.g., if user entered partial name or number)
      for (const doc of response.documents) {
        // Check firstname + lastname combination with null checks
        const firstName = doc.firstname || "";
        const lastName = doc.lastname || "";
        const fullName = `${firstName} ${lastName}`.trim();

        if (
          searchTerm &&
          fullName &&
          fullName.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          console.log(`Found user by partial name match:`, {
            docId: doc.$id,
            userId: doc.userId,
            authUserId: doc.authUserId,
            firstname: doc.firstname,
            lastname: doc.lastname,
          });
          return doc;
        }

        // Check other fields for partial matches with null checks
        for (const [key, value] of Object.entries(doc)) {
          if (
            typeof value === "string" &&
            value && // Check that value is not empty
            searchTerm && // Check that searchTerm is not empty
            value.toLowerCase().includes(searchTerm.toLowerCase()) &&
            fieldNamesToSearch.includes(key)
          ) {
            console.log(`Found user by partial match on ${key}:`, {
              docId: doc.$id,
              userId: doc.userId,
              authUserId: doc.authUserId,
              firstname: doc.firstname,
              lastname: doc.lastname,
            });
            return doc;
          }
        }
      }
    } catch (error) {
      console.error("Error with flexible search:", error);
    }

    // If we get here, no user was found
    return null;
  } catch (error) {
    console.error("Error finding user by name or number:", error);
    throw error;
  }
}

// Update the createSendTransaction function to use the improved checks
export async function createSendTransaction(
  recipientIdentifier: string,
  amount: number,
  note: string
): Promise<void> {
  try {
    // Use getAuthUserId() instead of getCurrentUser()
    const senderAuthUserId = await getAuthUserId();
    console.log("Sender Auth User ID:", senderAuthUserId);

    // Get the current user for name
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("No authenticated user found");
    }

    // Find the recipient by name or phone number
    const recipient = await findUserByNameOrNumber(recipientIdentifier);
    if (!recipient) {
      throw new Error(
        `Recipient not found with identifier: ${recipientIdentifier}`
      );
    }

    // Get the recipient's userId from the user document
    // This is the key fix - we only use the userId attribute
    const recipientUserId = recipient.userId;

    if (!recipientUserId) {
      throw new Error(
        `Recipient found but has no userId attribute. Please update the user record.`
      );
    }

    console.log("Recipient Doc ID:", recipient.$id);
    console.log("Recipient User ID:", recipientUserId);

    // Prevent sending money to yourself
    if (recipientUserId === senderAuthUserId) {
      throw new Error("You cannot send money to yourself");
    }

    const timestamp = Date.now();
    const transactionId = generateTransactionId();

    // Create the SEND transaction for the current user
    const sendTransaction: Transaction = {
      id: transactionId,
      type: "SEND",
      amount: amount,
      description:
        note || `Sent to ${recipient.firstname || recipientIdentifier}`,
      timestamp: timestamp,
      userId: senderAuthUserId, // Use the sender's auth user ID
      recipientId: recipientUserId, // Use the recipient's user ID
    };

    // Save the SEND transaction
    await saveTransaction(sendTransaction);

    // Create notification for sender - use the sender's ID
    await createTransactionNotification(sendTransaction, senderAuthUserId);

    // Create a corresponding RECEIVE transaction for the recipient
    // Use the createReceiveTransaction function to ensure balance is properly updated
    const {
      transaction: receiveTransaction,
      newBalance,
    } = await createReceiveTransaction(
      recipientUserId, // Use the recipient's user ID directly
      amount,
      note || `Received from ${currentUser.firstname || "User"}`,
      {
        reference: transactionId, // Reference to the original transaction
        senderId: senderAuthUserId,
        senderName: currentUser.firstname || "User",
      }
    );

    console.log(`Recipient balance updated to: ${newBalance}`);

    // Notification for recipient is already created in createReceiveTransaction
    console.log("Send transaction completed successfully");
    console.log("Sender notification created for:", senderAuthUserId);
    console.log("Recipient notification created for:", recipientUserId);
  } catch (error) {
    console.error("Error creating send transaction:", error);
    throw error;
  }
}

// Create a RECEIVE transaction
export async function createReceiveTransaction(
  userId: string,
  amount: number,
  description: string,
  options?: {
    reference?: string;
    senderId?: string;
    senderName?: string;
  }
): Promise<{ transaction: Transaction; newBalance: number }> {
  try {
    // We use the userId directly without any resolution
    // This assumes the userId passed is already the correct one
    console.log(`Creating RECEIVE transaction for user: ${userId}`);

    const timestamp = Date.now();
    const transactionId = generateTransactionId();

    // If we have a sender name but no description, create a default description
    if (!description && options?.senderName) {
      description = `Received from ${options.senderName}`;
    }

    // Get the current balance for the user
    const currentBalance = await calculateUserBalance(userId);
    console.log(`Current balance for ${userId}: ${currentBalance}`);

    // Calculate the new balance (add the amount for RECEIVE transactions)
    const newBalance = currentBalance + amount;
    console.log(`New balance after receiving ${amount}: ${newBalance}`);

    // Create the RECEIVE transaction with the balance explicitly set
    const receiveTransaction: Transaction = {
      id: options?.reference ? `${options.reference}_receive` : transactionId,
      type: "RECEIVE",
      amount: amount,
      description: description || "Money received",
      timestamp: timestamp,
      userId: userId, // Use the user ID directly
      reference: options?.reference || "",
      balance: newBalance, // Explicitly set the new balance
    };

    // Save the transaction
    await saveTransaction(receiveTransaction);
    console.log(`RECEIVE transaction saved with ID: ${receiveTransaction.id}`);

    // Create notification for the recipient - use the recipient's ID
    await createTransactionNotification(receiveTransaction, userId);
    console.log(`Notification created for recipient: ${userId}`);

    // Return both the transaction and the new balance
    return {
      transaction: receiveTransaction,
      newBalance: newBalance,
    };
  } catch (error) {
    console.error("Error creating receive transaction:", error);
    throw error;
  }
}

// Function to update all existing notifications to use the correct user ID
export async function fixNotificationUserIds(): Promise<number> {
  try {
    // Get the correct auth user ID
    const authUserId = await getAuthUserId();

    const databaseId = config.databaseId;
    const collectionId = getNotificationsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    // Get all notifications
    const response = await databases.listDocuments(databaseId, collectionId);

    let updatedCount = 0;

    // Update each notification to use the correct user ID
    for (const doc of response.documents) {
      // Skip if already has the correct user ID
      if (doc.userId === authUserId) {
        continue;
      }

      try {
        await databases.updateDocument(databaseId, collectionId, doc.$id, {
          userId: authUserId,
        });
        updatedCount++;
      } catch (updateError) {
        console.error("Error updating notification:", updateError);
      }
    }

    console.log(
      `Updated ${updatedCount} notifications to use user ID: ${authUserId}`
    );
    return updatedCount;
  } catch (error) {
    console.error("Error fixing notification user IDs:", error);
    throw error;
  }
}

// Fix all transaction user IDs
export async function fixTransactionUserIds(): Promise<number> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getTransactionsCollectionId();
    const usersCollectionId = getUsersCollectionId();

    if (!databaseId || !collectionId || !usersCollectionId) {
      throw new Error("Appwrite configuration missing");
    }

    // Get all users to build a mapping of document ID to auth ID
    const usersResponse = await databases.listDocuments(
      databaseId,
      usersCollectionId
    );

    // Create a mapping of document ID to auth ID
    const userIdMap = new Map();
    for (const user of usersResponse.documents) {
      if (user.authUserId) {
        userIdMap.set(user.$id, user.authUserId);
      }
    }

    // Get all transactions
    const transactionsResponse = await databases.listDocuments(
      databaseId,
      collectionId
    );

    let updatedCount = 0;

    // Update each transaction to use the correct auth user ID
    for (const doc of transactionsResponse.documents) {
      const userId = doc.userId;

      // Skip if it's already an auth user ID (starts with a specific pattern)
      // You may need to adjust this check based on your Appwrite auth ID format
      if (userId && userId.startsWith("auth_")) {
        continue;
      }

      // Check if we have a mapping for this user ID
      const authUserId = userIdMap.get(userId);
      if (authUserId) {
        try {
          await databases.updateDocument(databaseId, collectionId, doc.$id, {
            userId: authUserId,
          });
          updatedCount++;
        } catch (updateError) {
          console.error(`Error updating transaction ${doc.$id}:`, updateError);
        }
      }
    }

    console.log(
      `Updated ${updatedCount} transactions with correct auth user IDs`
    );
    return updatedCount;
  } catch (error) {
    console.error("Error fixing transaction user IDs:", error);
    throw error;
  }
}

// Sync user document IDs with auth IDs
export async function syncUserIdsWithAuth(): Promise<void> {
  try {
    const databaseId = config.databaseId;
    const usersCollectionId = getUsersCollectionId();

    if (!databaseId || !usersCollectionId) {
      throw new Error("Appwrite configuration missing");
    }

    // Get all users
    const usersResponse = await databases.listDocuments(
      databaseId,
      usersCollectionId
    );

    // For each user, add an authUserId field if it doesn't exist
    for (const user of usersResponse.documents) {
      // Skip if the user already has an authUserId
      if (user.authUserId) {
        continue;
      }

      try {
        // Try to find the auth user by email or username
        const authUserId = null;

        // If the user has an email, try to find the auth user by email
        if (user.email) {
          try {
            // This is a placeholder - you would need to implement a way to
            // look up auth users by email, which might require admin privileges
            // or a server-side function
            console.log(`Looking up auth user for email: ${user.email}`);
            // authUserId = await lookupAuthUserByEmail(user.email);
          } catch (emailError) {
            console.error(`Error looking up auth user by email:`, emailError);
          }
        }

        // If we found an auth user ID, update the user document
        if (authUserId) {
          await databases.updateDocument(
            databaseId,
            usersCollectionId,
            user.$id,
            {
              authUserId: authUserId,
            }
          );
          console.log(`Updated user ${user.$id} with auth ID ${authUserId}`);
        } else {
          console.log(`Could not find auth user for user ${user.$id}`);
        }
      } catch (updateError) {
        console.error(`Error updating user ${user.$id}:`, updateError);
      }
    }
  } catch (error) {
    console.error("Error syncing user IDs with auth:", error);
    throw error;
  }
}
