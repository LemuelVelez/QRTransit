import {
  Client,
  Account,
  ID,
  Databases,
  Avatars,
  Query,
} from "react-native-appwrite";

import * as Crypto from 'expo-crypto';

export const config = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
  usersCollectionId: process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
};

export const client = new Client();
client.setEndpoint(config.endpoint!).setProject(config.projectId!);

export const avatar = new Avatars(client);
export const account = new Account(client);
export const databases = new Databases(client);

export async function registerUser(
  email: string,
  password: string,
  firstname: string,
  lastname: string,
  username: string,
  phonenumber: string
) {
  try {
    // Create a new account
    const newAccount = await account.create(
      ID.unique(),
      email,
      password,
      `${firstname} ${lastname}`
    );

    if (newAccount.$id) {
      // Create a session for the new user
      await account.createEmailPasswordSession(email, password);

      // Store additional user data in the database
      await databases.createDocument(
        config.databaseId!,
        config.usersCollectionId!,
        ID.unique(),
        {
          userId: newAccount.$id,
          email: email,
          firstname: firstname,
          lastname: lastname,
          username: username,
          phonenumber: phonenumber,
        }
      );

      const userAvatar = avatar.getInitials(`${firstname} ${lastname}`);

      return {
        ...newAccount,
        firstname,
        lastname,
        username,
        phonenumber,
        avatar: userAvatar.toString(),
      };
    }

    return null;
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
}

export async function loginUser(username: string, password: string) {
  try {
    // Find the user with the provided username
    const users = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [
        Query.equal("username", username)
      ]
    );

    // Check if user exists
    if (users.documents.length === 0) {
      throw new Error("User not found");
    }

    const user = users.documents[0];
    
    // Create a session with the user's email and password
    const session = await account.createEmailPasswordSession(user.email, password);
    
    if (session) {
      // Get user account details
      const accountDetails = await account.get();
      
      // Return user data
      return {
        ...accountDetails,
        firstname: user.firstname,
        lastname: user.lastname,
        username: user.username,
        phonenumber: user.phonenumber,
        avatar: avatar.getInitials(`${user.firstname} ${user.lastname}`).toString(),
      };
    }

    return null;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

export async function logoutUser() {
  try {
    // Get the current session
    const currentSession = await account.getSession('current');
    
    // Delete the current session
    await account.deleteSession(currentSession.$id);
    
    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}

/**
 * Register a PIN for the current user
 * @param pin The PIN to register
 * @returns The updated user data or null if operation fails
 */
export async function registerPin(pin: string) {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    
    if (!currentUser || !currentUser.$id) {
      throw new Error("No authenticated user found");
    }
    
    // Hash the PIN using SHA-256
    const hashedPin = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pin
    );
    
    // Find the user document
    const users = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("userId", currentUser.$id)]
    );
    
    if (users.documents.length === 0) {
      throw new Error("User document not found");
    }
    
    return {
      ...currentUser,
      pin: hashedPin
    };
  } catch (error) {
    console.error("PIN registration error:", error);
    throw error;
  }
}

/**
 * Verify a PIN against the stored hashed PIN
 * @param pin The PIN to verify
 * @returns Boolean indicating if the PIN is correct
 */
export async function verifyPin(pin: string) {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    
    if (!currentUser || !currentUser.$id) {
      throw new Error("No authenticated user found");
    }
    
    // Find the user document
    const users = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("userId", currentUser.$id)]
    );
    
    if (users.documents.length === 0) {
      throw new Error("User document not found");
    }
    
    const userDocument = users.documents[0];
    
    // If no PIN is set, return false
    if (!userDocument.pin) {
      return false;
    }
    
    // Hash the provided PIN
    const hashedPin = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pin
    );
    
    // Compare the hashed PIN with the stored one
    return hashedPin === userDocument.pin;
  } catch (error) {
    console.error("PIN verification error:", error);
    return false;
  }
}

/**
 * Get the hashed PIN for the current user
 * @returns The hashed PIN or null if not found
 */
export async function getPin() {
  try {
    // Get current user
    const currentUser = await getCurrentUser()

    if (!currentUser || !currentUser.$id) {
      throw new Error("No authenticated user found")
    }

    // Find the user document
    const users = await databases.listDocuments(config.databaseId!, config.usersCollectionId!, [
      Query.equal("userId", currentUser.$id),
    ])

    if (users.documents.length === 0) {
      throw new Error("User document not found")
    }

    const userDocument = users.documents[0]

    // Return the hashed PIN or null if not set
    return userDocument.pin || null
  } catch (error) {
    console.error("Get PIN error:", error)
    return null
  }
}

export async function getCurrentUser() {
  try {
    const result = await account.get();
    if (result.$id) {
      const userAvatar = avatar.getInitials(result.name);

      // Get additional user data from the database
      const users = await databases.listDocuments(
        config.databaseId!,
        config.usersCollectionId!,
        [Query.equal("userId", result.$id)]
      );

      const userData = users.documents.length > 0 ? users.documents[0] : null;

      return {
        ...result,
        firstname: userData?.firstname,
        lastname: userData?.lastname,
        username: userData?.username,
        phonenumber: userData?.phonenumber,
        avatar: userAvatar.toString(),
      };
    }

    return null;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function getCurrentSession() {
  try {
    // Get the current active session
    const session = await account.getSession("current");
    return session;
  } catch (error) {
    console.error("Session error:", error);
    return null;
  }
}
