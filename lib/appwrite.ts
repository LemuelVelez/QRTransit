import {
  Client,
  Account,
  ID,
  Databases,
  Avatars,
  Query,
  Storage,
} from "react-native-appwrite";

import * as Crypto from "expo-crypto";

export const config = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
  usersCollectionId: process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
  avatarBucketId: process.env.EXPO_PUBLIC_APPWRITE_AVATAR_BUCKET_ID,
  discountsCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_DISCOUNTS_COLLECTION_ID,
};

export const client = new Client();
client.setEndpoint(config.endpoint!).setProject(config.projectId!);

export const avatar = new Avatars(client);
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

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
      // Include an empty pin field to satisfy the schema requirement
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
          pin: "", // Add an empty pin that will be updated later
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
      [Query.equal("username", username)]
    );

    // Check if user exists
    if (users.documents.length === 0) {
      throw new Error("User not found");
    }

    const user = users.documents[0];

    // Create a session with the user's email and password
    const session = await account.createEmailPasswordSession(
      user.email,
      password
    );

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
        avatar: avatar
          .getInitials(`${user.firstname} ${user.lastname}`)
          .toString(),
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
    const currentSession = await account.getSession("current");

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

    // Update the user document with the PIN
    const userDoc = users.documents[0];
    await databases.updateDocument(
      config.databaseId!,
      config.usersCollectionId!,
      userDoc.$id,
      {
        pin: hashedPin,
      }
    );

    return {
      ...currentUser,
      pin: hashedPin,
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

    // Return the hashed PIN or null if not set
    return userDocument.pin || null;
  } catch (error) {
    console.error("Get PIN error:", error);
    return null;
  }
}

export async function getCurrentUser() {
  try {
    const result = await account.get();
    if (result.$id) {
      // Get additional user data from the database
      const users = await databases.listDocuments(
        config.databaseId!,
        config.usersCollectionId!,
        [Query.equal("userId", result.$id)]
      );

      const userData = users.documents.length > 0 ? users.documents[0] : null;

      // Use stored avatar URL if available, otherwise use generated avatar
      const userAvatar = userData?.avatar
        ? userData.avatar
        : avatar
            .getInitials(
              `${userData?.firstname || ""} ${userData?.lastname || ""}`
            )
            .toString();

      return {
        ...result,
        firstname: userData?.firstname,
        lastname: userData?.lastname,
        username: userData?.username,
        email: userData?.email,
        phonenumber: userData?.phonenumber,
        avatar: userAvatar,
      };
    }

    return null;
  } catch (error) {
    console.log(error);
    return null;
  }
}

/**
 * Update user profile information
 * @param userData Object containing user data to update (firstname, lastname, username, email, phonenumber)
 * @param avatarFile Optional avatar file to upload
 * @returns The updated user data or null if operation fails
 */
export async function updateUserProfile(
  userData: {
    firstname?: string;
    lastname?: string;
    username?: string;
    email?: string;
    phonenumber?: string;
  },
  avatarFile?: {
    name: string;
    type: string;
    size: number;
    uri: string;
  }
) {
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

    // Prepare update data
    const updateData: Record<string, any> = {};

    if (userData.firstname) updateData.firstname = userData.firstname;
    if (userData.lastname) updateData.lastname = userData.lastname;
    if (userData.username) updateData.username = userData.username;
    if (userData.email) updateData.email = userData.email;
    if (userData.phonenumber) updateData.phonenumber = userData.phonenumber;

    // Handle avatar upload if provided
    let avatarUrl = currentUser.avatar;

    if (avatarFile) {
      try {
        // Validate bucket ID exists before attempting upload
        const bucketId = config.avatarBucketId;

        if (!bucketId) {
          console.error("Avatar upload error: Missing bucket ID configuration");
          throw new Error("Missing bucket ID configuration");
        }

        console.log("Using bucket ID:", bucketId); // Debug log

        // Delete the existing avatar file if it exists
        if (currentUser.avatar) {
          try {
            // Extract the file ID from the avatar URL
            // The URL format is typically: https://cloud.appwrite.io/v1/storage/buckets/{bucketId}/files/{fileId}/view
            const fileIdMatch = currentUser.avatar.match(
              /files\/([^/]+)\/view/
            );

            if (fileIdMatch && fileIdMatch[1]) {
              const oldFileId = fileIdMatch[1];

              // Delete the old file
              await storage.deleteFile(bucketId, oldFileId);
              console.log("Deleted old avatar file:", oldFileId);
            }
          } catch (deleteError) {
            // Log but continue if deletion fails
            console.error("Failed to delete old avatar:", deleteError);
          }
        }

        // Generate a unique file ID
        const fileId = ID.unique();

        // Upload the file to the avatars bucket
        const uploadResult = await storage.createFile(
          bucketId,
          fileId,
          avatarFile
        );

        // Get the file URL
        const fileUrl = storage.getFileView(bucketId, uploadResult.$id);

        // Update the avatar URL in the database
        updateData.avatar = fileUrl.href;
        avatarUrl = fileUrl.href;
      } catch (uploadError) {
        console.error("Avatar upload error:", uploadError);
        // Continue with other updates even if avatar upload fails
      }
    }

    // Update the user document
    const userDoc = users.documents[0];
    await databases.updateDocument(
      config.databaseId!,
      config.usersCollectionId!,
      userDoc.$id,
      updateData
    );

    // If name components are being updated, update the name in the account
    if (userData.firstname && userData.lastname) {
      await account.updateName(`${userData.firstname} ${userData.lastname}`);
    }

    return {
      ...currentUser,
      ...userData,
      avatar: avatarUrl,
    };
  } catch (error) {
    console.error("Profile update error:", error);
    throw error;
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

/**
 * Get the user's role and redirect based on role
 * @returns The user's role or null if not found
 */
export async function getUserRoleAndRedirect() {
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

    // Get the role from the user document
    // If role doesn't exist, default to "passenger"
    const role = userDocument.role || "passenger";

    // Redirect based on role
    if (role === "conductor") {
      return {
        role: "conductor",
        redirectTo: "/conductor",
      };
    } else if (role === "inspector") {
      return {
        role: "inspector",
        redirectTo: "/inspector",
      };
    } else {
      // Default to passenger role
      return {
        role: "passenger",
        redirectTo: "/",
      };
    }
  } catch (error) {
    console.error("Role verification error:", error);
    // Default to passenger on error
    return {
      role: "passenger",
      redirectTo: "/",
    };
  }
}

/**
 * Check if the user has permission to access a specific route
 * @param requiredRole The role or array of roles required to access the route
 * @returns Boolean indicating if the user has permission
 */
export async function checkRoutePermission(requiredRole: string | string[]) {
  try {
    // Get current user
    const currentUser = await getCurrentUser();

    if (!currentUser || !currentUser.$id) {
      return false; // No authenticated user
    }

    // Find the user document
    const users = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("userId", currentUser.$id)]
    );

    if (users.documents.length === 0) {
      return false; // User document not found
    }

    const userDocument = users.documents[0];

    // Get the role from the user document
    // If role doesn't exist, default to "passenger"
    const userRole = userDocument.role || "passenger";

    // If requiredRole is a string, check for exact match
    if (typeof requiredRole === "string") {
      return userRole === requiredRole;
    }

    // If requiredRole is an array, check if userRole is in the array
    return requiredRole.includes(userRole);
  } catch (error) {
    console.error("Permission check error:", error);
    return false;
  }
}
