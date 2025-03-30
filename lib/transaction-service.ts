import { ID, Query } from "react-native-appwrite";
import { databases, config, account } from "./appwrite";
import { getCurrentUser } from "./appwrite";

export type TransactionType = "CASH_IN" | "CASH_OUT" | "SEND" | "RECEIVE";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  paymentId?: string;
  timestamp: number;
  reference?: string;
  userId: string;
  balance?: number;
  recipientId?: string;
}

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

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return `Today at ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  if (date > oneWeekAgo) {
    return date.toLocaleDateString([], { weekday: "long" });
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function transactionToNotification(
  transaction: Transaction
): Omit<Notification, "date" | "userId"> {
  let title = "Transaction Notification";
  let message = "";

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
    read: false,
    transactionId: transaction.id,
    type: "TRANSACTION",
  };
}

const getNotificationsCollectionId = () => {
  return process.env.EXPO_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION_ID || "";
};

export async function getAuthUserId(): Promise<string> {
  try {
    const authUser = await account.get();
    return authUser.$id;
  } catch (error) {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser && currentUser.$id) {
        return currentUser.$id;
      }
    } catch (fallbackError) {
      // Silent fallback
    }

    throw new Error("Authentication error");
  }
}

export async function createNotification(
  notification: Omit<Notification, "date">
): Promise<string> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getNotificationsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    const userId = notification.userId || (await getAuthUserId());
    const isRead = notification.read === true;

    const result = await databases.createDocument(
      databaseId,
      collectionId,
      ID.unique(),
      {
        title: notification.title,
        message: notification.message,
        timestamp: notification.timestamp.toString(),
        read: isRead,
        type: notification.type,
        userId: userId,
        transactionId: notification.transactionId || "",
        priority: (notification.priority || 2).toString(),
        icon: notification.icon || "",
        data: notification.data ? JSON.stringify(notification.data) : "",
      }
    );

    return result.$id;
  } catch (error) {
    throw error;
  }
}

export async function getUserNotifications(): Promise<Notification[]> {
  try {
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
      read: doc.read === true || doc.read === "true",
      type: doc.type,
      timestamp: Number(doc.timestamp),
      transactionId: doc.transactionId || undefined,
      userId: doc.userId,
      priority: doc.priority,
      icon: doc.icon,
      data: doc.data ? JSON.parse(doc.data) : undefined,
    }));
  } catch (error) {
    return [];
  }
}

export async function getNotificationsByPeriod(
  days = 30
): Promise<Notification[]> {
  try {
    const notifications = await getUserNotifications();

    if (!notifications || notifications.length === 0) {
      return [];
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffTimestamp = cutoffDate.getTime();

    return notifications.filter(
      (notification) => notification.timestamp >= cutoffTimestamp
    );
  } catch (error) {
    return [];
  }
}

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
      read: true,
    });
  } catch (error) {
    throw error;
  }
}

export async function markAllNotificationsAsRead(): Promise<void> {
  try {
    const userId = await getAuthUserId();

    const databaseId = config.databaseId;
    const collectionId = getNotificationsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("userId", userId),
      Query.equal("read", false),
    ]);

    const updatePromises = response.documents.map((doc) =>
      databases.updateDocument(databaseId, collectionId, doc.$id, {
        read: true,
      })
    );

    await Promise.all(updatePromises);
  } catch (error) {
    throw error;
  }
}

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

    const userId = specificUserId || transaction.userId;

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
        return;
      }
    } catch (checkError) {
      // Continue with notification creation even if check fails
    }

    const notificationData = transactionToNotification(transaction);

    await createNotification({
      ...notificationData,
      userId: userId,
    });
  } catch (error) {
    // Silent error handling
  }
}

const getTransactionsCollectionId = () => {
  return process.env.EXPO_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "";
};

const getUsersCollectionId = () => {
  return process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID || "";
};

async function calculateNewBalance(
  userId: string,
  transaction: Transaction
): Promise<number> {
  try {
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

    let currentBalance = 0;

    if (response.documents.length > 0) {
      currentBalance = Number.parseFloat(response.documents[0].balance || "0");
    }

    let newBalance = currentBalance;

    if (transaction.type === "CASH_IN" || transaction.type === "RECEIVE") {
      newBalance += transaction.amount;
    } else if (transaction.type === "CASH_OUT" || transaction.type === "SEND") {
      newBalance -= transaction.amount;
    }

    return newBalance;
  } catch (error) {
    throw error;
  }
}

export async function saveTransaction(transaction: Transaction): Promise<void> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getTransactionsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    try {
      const existingTransactions = await databases.listDocuments(
        databaseId,
        collectionId,
        [Query.equal("transactionId", transaction.id), Query.limit(1)]
      );

      if (existingTransactions.documents.length > 0) {
        return;
      }
    } catch (checkError) {
      // Continue with transaction creation even if check fails
    }

    const balance = await calculateNewBalance(transaction.userId, transaction);

    await databases.createDocument(databaseId, collectionId, ID.unique(), {
      transactionId: transaction.id,
      type: transaction.type,
      amount: transaction.amount.toString(),
      description: transaction.description,
      paymentId: transaction.paymentId || "",
      timestamp: transaction.timestamp.toString(),
      reference: transaction.reference || "",
      userId: transaction.userId,
      balance: balance.toString(),
      recipientId: transaction.recipientId || "",
    });
  } catch (error) {
    throw error;
  }
}

export async function getUserTransactions(): Promise<Transaction[]> {
  try {
    const userId = await getAuthUserId();

    return getTransactions(userId);
  } catch (error) {
    return [];
  }
}

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
    return [];
  }
}

export async function getAllUserTransactions(): Promise<Transaction[]> {
  try {
    const userId = await getAuthUserId();

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
    return [];
  }
}

export function generateTransactionId(): string {
  // Generate a 10-digit numeric transaction ID
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

// Add wallet limit constant
export const WALLET_LIMIT = 10000; // 10,000 pesos

export async function calculateUserBalance(userId: string): Promise<number> {
  try {
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

    if (response.documents.length === 0) {
      return 0;
    }

    return Number.parseFloat(response.documents[0].balance || "0");
  } catch (error) {
    throw error;
  }
}

export async function getCurrentUserBalance(): Promise<number> {
  try {
    const userId = await getAuthUserId();

    return calculateUserBalance(userId);
  } catch (error) {
    return 0;
  }
}

export async function recalculateAllBalances(userId: string): Promise<void> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getTransactionsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("userId", userId),
      Query.orderAsc("timestamp"),
    ]);

    let runningBalance = 0;

    for (const doc of response.documents) {
      const amount = Number.parseFloat(doc.amount);
      const type = doc.type;

      if (type === "CASH_IN" || type === "RECEIVE") {
        runningBalance += amount;
      } else if (type === "CASH_OUT" || type === "SEND") {
        runningBalance -= amount;
      }

      await databases.updateDocument(databaseId, collectionId, doc.$id, {
        balance: runningBalance.toString(),
      });
    }
  } catch (error) {
    throw error;
  }
}

async function getAuthUserIdForUser(userDocId: string): Promise<string> {
  try {
    const databaseId = config.databaseId;
    const usersCollectionId = getUsersCollectionId();

    if (!databaseId || !usersCollectionId) {
      throw new Error("Appwrite configuration missing");
    }

    try {
      const userDoc = await databases.getDocument(
        databaseId,
        usersCollectionId,
        userDocId
      );

      if (userDoc && userDoc.userId) {
        return userDoc.userId;
      }

      return userDocId;
    } catch (docError) {
      return userDocId;
    }
  } catch (error) {
    return userDocId;
  }
}

async function findUserByNameOrNumber(searchTerm: string): Promise<any | null> {
  try {
    const databaseId = config.databaseId;
    const usersCollectionId = getUsersCollectionId();

    if (!databaseId || !usersCollectionId) {
      throw new Error("Appwrite configuration missing");
    }

    const fieldNamesToSearch = [
      "phonenumber",
      "username",
      "email",
      "firstname",
      "lastname",
    ];

    for (const field of fieldNamesToSearch) {
      try {
        const response = await databases.listDocuments(
          databaseId,
          usersCollectionId,
          [Query.equal(field, searchTerm), Query.limit(1)]
        );

        if (response.documents.length > 0) {
          return response.documents[0];
        }
      } catch (fieldError) {
        // Continue to next field
      }
    }

    try {
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
          return response.documents[0];
        }
      }
    } catch (nameError) {
      // Continue to next approach
    }

    try {
      const response = await databases.listDocuments(
        databaseId,
        usersCollectionId,
        [Query.limit(100)]
      );

      for (const doc of response.documents) {
        for (const [key, value] of Object.entries(doc)) {
          if (
            typeof value === "string" &&
            value &&
            searchTerm &&
            value.toLowerCase() === searchTerm.toLowerCase()
          ) {
            return doc;
          }
        }
      }

      for (const doc of response.documents) {
        const firstName = doc.firstname || "";
        const lastName = doc.lastname || "";
        const fullName = `${firstName} ${lastName}`.trim();

        if (
          searchTerm &&
          fullName &&
          fullName.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          return doc;
        }

        for (const [key, value] of Object.entries(doc)) {
          if (
            typeof value === "string" &&
            value &&
            searchTerm &&
            value.toLowerCase().includes(searchTerm.toLowerCase()) &&
            fieldNamesToSearch.includes(key)
          ) {
            return doc;
          }
        }
      }
    } catch (error) {
      // Silent error handling
    }

    return null;
  } catch (error) {
    throw error;
  }
}

export async function createSendTransaction(
  recipientIdentifier: string,
  amount: number,
  note: string
): Promise<void> {
  try {
    const senderAuthUserId = await getAuthUserId();

    // Check if user has sufficient balance before sending
    const currentBalance = await getCurrentUserBalance();
    if (currentBalance < amount) {
      throw new Error(
        `Insufficient balance. Your current balance is ₱${currentBalance.toFixed(
          2
        )}`
      );
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("No authenticated user found");
    }

    const recipient = await findUserByNameOrNumber(recipientIdentifier);
    if (!recipient) {
      throw new Error("Recipient not found");
    }

    const recipientUserId = recipient.userId;

    if (!recipientUserId) {
      throw new Error("Invalid recipient information");
    }

    if (recipientUserId === senderAuthUserId) {
      throw new Error("You cannot send money to yourself");
    }

    const timestamp = Date.now();
    const transactionId = generateTransactionId();

    const sendTransaction: Transaction = {
      id: transactionId,
      type: "SEND",
      amount: amount,
      description:
        note || `Sent to ${recipient.firstname || recipientIdentifier}`,
      timestamp: timestamp,
      userId: senderAuthUserId,
      recipientId: recipientUserId,
    };

    await saveTransaction(sendTransaction);

    await createTransactionNotification(sendTransaction, senderAuthUserId);

    const {
      transaction: receiveTransaction,
      newBalance,
    } = await createReceiveTransaction(
      recipientUserId,
      amount,
      note || `Received from ${currentUser.firstname || "User"}`,
      {
        reference: transactionId,
        senderId: senderAuthUserId,
        senderName: currentUser.firstname || "User",
      }
    );
  } catch (error) {
    throw error;
  }
}

// Update the createReceiveTransaction function to check wallet limit
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
    const timestamp = Date.now();
    const transactionId = generateTransactionId();

    if (!description && options?.senderName) {
      description = `Received from ${options.senderName}`;
    }

    const currentBalance = await calculateUserBalance(userId);

    // Check if transaction would exceed wallet limit
    if (currentBalance + amount > WALLET_LIMIT) {
      throw new Error(
        `Transaction would exceed wallet limit of ₱${WALLET_LIMIT.toLocaleString()}`
      );
    }

    const newBalance = currentBalance + amount;

    const receiveTransaction: Transaction = {
      id: options?.reference ? `${options.reference}_receive` : transactionId,
      type: "RECEIVE",
      amount: amount,
      description: description || "Money received",
      timestamp: timestamp,
      userId: userId,
      reference: options?.reference || "",
      balance: newBalance,
    };

    await saveTransaction(receiveTransaction);
    await createTransactionNotification(receiveTransaction, userId);

    return {
      transaction: receiveTransaction,
      newBalance: newBalance,
    };
  } catch (error) {
    throw error;
  }
}

export async function fixNotificationUserIds(): Promise<number> {
  try {
    const authUserId = await getAuthUserId();

    const databaseId = config.databaseId;
    const collectionId = getNotificationsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    const response = await databases.listDocuments(databaseId, collectionId);

    let updatedCount = 0;

    for (const doc of response.documents) {
      if (doc.userId === authUserId) {
        continue;
      }

      try {
        await databases.updateDocument(databaseId, collectionId, doc.$id, {
          userId: authUserId,
        });
        updatedCount++;
      } catch (updateError) {
        // Silent error handling
      }
    }

    return updatedCount;
  } catch (error) {
    throw error;
  }
}

export async function fixTransactionUserIds(): Promise<number> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getTransactionsCollectionId();
    const usersCollectionId = getUsersCollectionId();

    if (!databaseId || !collectionId || !usersCollectionId) {
      throw new Error("Appwrite configuration missing");
    }

    const usersResponse = await databases.listDocuments(
      databaseId,
      usersCollectionId
    );

    const userIdMap = new Map();
    for (const user of usersResponse.documents) {
      if (user.authUserId) {
        userIdMap.set(user.$id, user.authUserId);
      }
    }

    const transactionsResponse = await databases.listDocuments(
      databaseId,
      collectionId
    );

    let updatedCount = 0;

    for (const doc of transactionsResponse.documents) {
      const userId = doc.userId;

      if (userId && userId.startsWith("auth_")) {
        continue;
      }

      const authUserId = userIdMap.get(userId);
      if (authUserId) {
        try {
          await databases.updateDocument(databaseId, collectionId, doc.$id, {
            userId: authUserId,
          });
          updatedCount++;
        } catch (updateError) {
          // Silent error handling
        }
      }
    }

    return updatedCount;
  } catch (error) {
    throw error;
  }
}

export async function syncUserIdsWithAuth(): Promise<void> {
  try {
    const databaseId = config.databaseId;
    const usersCollectionId = getUsersCollectionId();

    if (!databaseId || !usersCollectionId) {
      throw new Error("Appwrite configuration missing");
    }

    const usersResponse = await databases.listDocuments(
      databaseId,
      usersCollectionId
    );

    for (const user of usersResponse.documents) {
      if (user.authUserId) {
        continue;
      }

      try {
        const authUserId = null;

        if (user.email) {
          try {
            // Implementation removed
          } catch (emailError) {
            // Silent error handling
          }
        }

        if (authUserId) {
          await databases.updateDocument(
            databaseId,
            usersCollectionId,
            user.$id,
            {
              authUserId: authUserId,
            }
          );
        }
      } catch (updateError) {
        // Silent error handling
      }
    }
  } catch (error) {
    // Silent error handling
  }
}


export async function updateTransactionStatus(
  transactionId: string,
  status: "PENDING" | "COMPLETED" | "FAILED"
): Promise<void> {
  try {
    const databaseId = config.databaseId;
    const collectionId = getTransactionsCollectionId();

    if (!databaseId || !collectionId) {
      throw new Error("Appwrite configuration missing");
    }

    // Find the transaction document by transactionId
    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("transactionId", transactionId),
      Query.limit(1),
    ]);

    if (response.documents.length === 0) {
      throw new Error(`Transaction with ID ${transactionId} not found`);
    }

    const transactionDoc = response.documents[0];

    // Update the transaction status
    await databases.updateDocument(databaseId, collectionId, transactionDoc.$id, {
      status: status,
    });

    // If the transaction is completed and it's a CASH_IN transaction,
    // we might want to create a notification
    if (status === "COMPLETED") {
      try {
        const transaction: Transaction = {
          id: transactionId,
          type: transactionDoc.type,
          amount: Number.parseFloat(transactionDoc.amount),
          description: transactionDoc.description,
          paymentId: transactionDoc.paymentId,
          timestamp: Number.parseInt(transactionDoc.timestamp, 10),
          reference: transactionDoc.reference,
          userId: transactionDoc.userId,
          balance: transactionDoc.balance ? Number.parseFloat(transactionDoc.balance) : undefined,
          recipientId: transactionDoc.recipientId || undefined,
        };

        await createTransactionNotification(transaction);
      } catch (notificationError) {
        console.error("Error creating transaction notification:", notificationError);
        // Continue even if notification creation fails
      }
    }
  } catch (error) {
    console.error("Error updating transaction status:", error);
    throw error;
  }
}