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
import Constants from "expo-constants";

/** Read EXPO_PUBLIC_* from process.env or from app.json/app.config.js "extra" */
const readEnv = (key: string): string | undefined => {
  // 1) EAS / bundler inlined values (preferred)
  const v1 = (process.env as any)?.[key];
  if (v1 != null) return String(v1);

  // 2) Expo "extra" (dev/classic builds)
  const extra =
    (Constants?.expoConfig as any)?.extra ||
    (Constants as any)?.manifest2?.extra ||
    (Constants as any)?.manifest?.extra ||
    {};

  // Try both the exact key and the naked version without EXPO_PUBLIC_
  const naked = key.replace(/^EXPO_PUBLIC_/, "");
  const v2 = extra?.[key] ?? extra?.[naked];
  return v2 != null ? String(v2) : undefined;
};

// Re-export a safe getter for other modules
export const getEnv = (key: string) => readEnv(key);

export const config = {
  endpoint: readEnv("EXPO_PUBLIC_APPWRITE_ENDPOINT"),
  projectId: readEnv("EXPO_PUBLIC_APPWRITE_PROJECT_ID"),
  databaseId: readEnv("EXPO_PUBLIC_APPWRITE_DATABASE_ID"),
  usersCollectionId: readEnv("EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID"),
  avatarBucketId: readEnv("EXPO_PUBLIC_APPWRITE_AVATAR_BUCKET_ID"),
  discountsCollectionId: readEnv(
    "EXPO_PUBLIC_APPWRITE_DISCOUNTS_COLLECTION_ID"
  ),
  // Optional: separate bus type collection if you use one
  busTypeCollectionId: readEnv("EXPO_PUBLIC_APPWRITE_BUS_TYPE_COLLECTION_ID"),
};

// ---- Safe client bootstrap (won’t crash if env is missing) ----
export const client = new Client();

try {
  if (config.endpoint) client.setEndpoint(config.endpoint);
  if (config.projectId) client.setProject(config.projectId);
} catch (e) {
  console.error("[Appwrite] Failed to initialize client:", e);
}

if (!config.endpoint || !config.projectId) {
  // Keep this a warning; we *do not* throw here.
  console.warn(
    "[Appwrite] Missing endpoint or projectId. Backend features will be disabled until configured."
  );
}

export const avatar = new Avatars(client);
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// --------------- Helpers ---------------

const ensureDbAndUsers = () => {
  const databaseId = config.databaseId;
  const usersCollectionId = config.usersCollectionId;
  if (!databaseId || !usersCollectionId) {
    throw new Error(
      "Appwrite configuration missing (databaseId/usersCollectionId). " +
        "Check EXPO_PUBLIC_APPWRITE_DATABASE_ID and EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID."
    );
  }
  return { databaseId, usersCollectionId };
};

const ensureEndpointProject = () => {
  if (!config.endpoint || !config.projectId) {
    throw new Error(
      "Appwrite client not configured (endpoint/projectId). " +
        "Check EXPO_PUBLIC_APPWRITE_ENDPOINT and EXPO_PUBLIC_APPWRITE_PROJECT_ID."
    );
  }
};

// --------------- Auth / Users (safer) ---------------

export async function registerUser(
  email: string,
  password: string,
  firstname: string,
  lastname: string,
  username: string,
  phonenumber: string
) {
  try {
    ensureEndpointProject();
    const { databaseId, usersCollectionId } = ensureDbAndUsers();

    const newAccount = await account.create(
      ID.unique(),
      email,
      password,
      `${firstname} ${lastname}`
    );

    if (newAccount.$id) {
      await account.createEmailPasswordSession(email, password);

      await databases.createDocument(
        databaseId,
        usersCollectionId,
        ID.unique(),
        {
          userId: newAccount.$id,
          email,
          firstname,
          lastname,
          username,
          phonenumber,
          pin: "",
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
    ensureEndpointProject();
    const { databaseId, usersCollectionId } = ensureDbAndUsers();

    const users = await databases.listDocuments(databaseId, usersCollectionId, [
      Query.equal("username", username),
    ]);

    if (users.documents.length === 0) {
      throw new Error("User not found");
    }

    const user = users.documents[0];
    const session = await account.createEmailPasswordSession(
      user.email,
      password
    );

    if (session) {
      const accountDetails = await account.get();

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
    const currentSession = await account.getSession("current");
    await account.deleteSession(currentSession.$id);
    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}

export async function registerPin(pin: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.$id)
      throw new Error("No authenticated user found");

    const hashedPin = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pin
    );

    const { databaseId, usersCollectionId } = ensureDbAndUsers();

    const users = await databases.listDocuments(databaseId, usersCollectionId, [
      Query.equal("userId", currentUser.$id),
    ]);
    if (users.documents.length === 0)
      throw new Error("User document not found");

    const userDoc = users.documents[0];
    await databases.updateDocument(databaseId, usersCollectionId, userDoc.$id, {
      pin: hashedPin,
    });

    return { ...currentUser, pin: hashedPin };
  } catch (error) {
    console.error("PIN registration error:", error);
    throw error;
  }
}

export async function verifyPin(pin: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.$id)
      throw new Error("No authenticated user found");

    const { databaseId, usersCollectionId } = ensureDbAndUsers();

    const users = await databases.listDocuments(databaseId, usersCollectionId, [
      Query.equal("userId", currentUser.$id),
    ]);
    if (users.documents.length === 0)
      throw new Error("User document not found");

    const userDocument = users.documents[0];
    if (!userDocument.pin) return false;

    const hashedPin = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pin
    );
    return hashedPin === userDocument.pin;
  } catch (error) {
    console.error("PIN verification error:", error);
    return false;
  }
}

export async function getPin() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.$id)
      throw new Error("No authenticated user found");

    const { databaseId, usersCollectionId } = ensureDbAndUsers();

    const users = await databases.listDocuments(databaseId, usersCollectionId, [
      Query.equal("userId", currentUser.$id),
    ]);
    if (users.documents.length === 0)
      throw new Error("User document not found");

    const userDocument = users.documents[0];
    return userDocument.pin || null;
  } catch (error) {
    console.error("Get PIN error:", error);
    return null;
  }
}

export async function getCurrentUser() {
  try {
    // You can still get the auth account even if DB config is missing.
    const result = await account.get();
    if (!result?.$id) return null;

    const databaseId = config.databaseId;
    const usersCollectionId = config.usersCollectionId;

    // If DB config is present, enrich with profile doc; otherwise, degrade gracefully.
    if (databaseId && usersCollectionId) {
      const users = await databases.listDocuments(
        databaseId,
        usersCollectionId,
        [Query.equal("userId", result.$id)]
      );

      const userData = users.documents.length > 0 ? users.documents[0] : null;

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
        email: userData?.email ?? result.email,
        phonenumber: userData?.phonenumber,
        avatar: userAvatar,
      };
    }

    // Fallback minimal object without DB fields
    const name = (result.name || "").trim();
    const userAvatar = avatar
      .getInitials(name || result.email || "User")
      .toString();

    return {
      ...result,
      firstname: undefined,
      lastname: undefined,
      username: undefined,
      email: result.email,
      phonenumber: undefined,
      avatar: userAvatar,
    };
  } catch (error) {
    console.log(error);
    return null;
  }
}

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
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.$id)
      throw new Error("No authenticated user found");

    const { databaseId, usersCollectionId } = ensureDbAndUsers();

    const users = await databases.listDocuments(databaseId, usersCollectionId, [
      Query.equal("userId", currentUser.$id),
    ]);
    if (users.documents.length === 0)
      throw new Error("User document not found");

    const updateData: Record<string, any> = {};
    if (userData.firstname) updateData.firstname = userData.firstname;
    if (userData.lastname) updateData.lastname = userData.lastname;
    if (userData.username) updateData.username = userData.username;
    if (userData.email) updateData.email = userData.email;
    if (userData.phonenumber) updateData.phonenumber = userData.phonenumber;

    let avatarUrl = currentUser.avatar;

    if (avatarFile) {
      const bucketId = config.avatarBucketId;
      if (!bucketId) {
        console.error("Avatar upload error: Missing bucket ID configuration");
        throw new Error("Missing bucket ID configuration");
      }

      if (currentUser.avatar) {
        try {
          const fileIdMatch = String(currentUser.avatar).match(
            /files\/([^/]+)\/view/
          );
          if (fileIdMatch && fileIdMatch[1]) {
            const oldFileId = fileIdMatch[1];
            await storage.deleteFile(bucketId, oldFileId);
          }
        } catch (deleteError) {
          console.error("Failed to delete old avatar:", deleteError);
        }
      }

      const fileId = ID.unique();
      const uploadResult = await storage.createFile(
        bucketId,
        fileId,
        avatarFile
      );
      const fileUrl = storage.getFileView(bucketId, uploadResult.$id);
      updateData.avatar = fileUrl.href;
      avatarUrl = fileUrl.href;
    }

    const userDoc = users.documents[0];
    await databases.updateDocument(
      databaseId,
      usersCollectionId,
      userDoc.$id,
      updateData
    );

    if (userData.firstname && userData.lastname) {
      await account.updateName(`${userData.firstname} ${userData.lastname}`);
    }

    return { ...currentUser, ...userData, avatar: avatarUrl };
  } catch (error) {
    console.error("Profile update error:", error);
    throw error;
  }
}

export async function getCurrentSession() {
  try {
    const session = await account.getSession("current");
    return session;
  } catch (error) {
    console.error("Session error:", error);
    return null;
  }
}

export async function getUserRoleAndRedirect() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.$id)
      throw new Error("No authenticated user found");

    const { databaseId, usersCollectionId } = ensureDbAndUsers();

    const users = await databases.listDocuments(databaseId, usersCollectionId, [
      Query.equal("userId", currentUser.$id),
    ]);
    if (users.documents.length === 0)
      throw new Error("User document not found");

    const userDocument = users.documents[0];
    const role = userDocument.role || "passenger";

    if (role === "conductor") {
      return { role: "conductor", redirectTo: "/conductor" };
    } else if (role === "inspector") {
      return { role: "inspector", redirectTo: "/inspector" };
    } else {
      return { role: "passenger", redirectTo: "/" };
    }
  } catch (error) {
    console.error("Role verification error:", error);
    return { role: "passenger", redirectTo: "/" };
  }
}

export async function checkRoutePermission(requiredRole: string | string[]) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.$id) return false;

    const { databaseId, usersCollectionId } = ensureDbAndUsers();

    const users = await databases.listDocuments(databaseId, usersCollectionId, [
      Query.equal("userId", currentUser.$id),
    ]);
    if (users.documents.length === 0) return false;

    const userDocument = users.documents[0];
    const userRole = userDocument.role || "passenger";

    if (typeof requiredRole === "string") {
      return userRole === requiredRole;
    }
    return requiredRole.includes(userRole);
  } catch (error) {
    console.error("Permission check error:", error);
    return false;
  }
}
