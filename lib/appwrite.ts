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
  // 1) EAS-compiled env (preferred)
  const v1 = (process.env as any)?.[key];
  if (v1 != null) return String(v1);

  // 2) Fallback to Expo "extra" (dev/classic builds)
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

export const config = {
  endpoint: readEnv("EXPO_PUBLIC_APPWRITE_ENDPOINT"),
  projectId: readEnv("EXPO_PUBLIC_APPWRITE_PROJECT_ID"),
  databaseId: readEnv("EXPO_PUBLIC_APPWRITE_DATABASE_ID"),
  usersCollectionId: readEnv("EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID"),
  avatarBucketId: readEnv("EXPO_PUBLIC_APPWRITE_AVATAR_BUCKET_ID"),
  discountsCollectionId: readEnv("EXPO_PUBLIC_APPWRITE_DISCOUNTS_COLLECTION_ID"),
  // ✅ Dedicated Bus Types collection (robustly resolved)
  busTypeCollectionId: readEnv("EXPO_PUBLIC_APPWRITE_BUS_TYPE_COLLECTION_ID"),
};

export const client = new Client();
if (!config.endpoint || !config.projectId) {
  console.warn(
    "[Appwrite] Missing endpoint or projectId. Check your EXPO_PUBLIC_* vars or `extra` in app config."
  );
}
client.setEndpoint(config.endpoint as string).setProject(config.projectId as string);

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
    const newAccount = await account.create(
      ID.unique(),
      email,
      password,
      `${firstname} ${lastname}`
    );

    if (newAccount.$id) {
      await account.createEmailPasswordSession(email, password);

      await databases.createDocument(
        config.databaseId!,
        config.usersCollectionId!,
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
    const users = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("username", username)]
    );

    if (users.documents.length === 0) {
      throw new Error("User not found");
    }

    const user = users.documents[0];
    const session = await account.createEmailPasswordSession(user.email, password);

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
    if (!currentUser || !currentUser.$id) throw new Error("No authenticated user found");

    const hashedPin = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pin
    );

    const users = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("userId", currentUser.$id)]
    );
    if (users.documents.length === 0) throw new Error("User document not found");

    const userDoc = users.documents[0];
    await databases.updateDocument(
      config.databaseId!,
      config.usersCollectionId!,
      userDoc.$id,
      { pin: hashedPin }
    );

    return { ...currentUser, pin: hashedPin };
  } catch (error) {
    console.error("PIN registration error:", error);
    throw error;
  }
}

export async function verifyPin(pin: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.$id) throw new Error("No authenticated user found");

    const users = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("userId", currentUser.$id)]
    );
    if (users.documents.length === 0) throw new Error("User document not found");

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
    if (!currentUser || !currentUser.$id) throw new Error("No authenticated user found");

    const users = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("userId", currentUser.$id)]
    );
    if (users.documents.length === 0) throw new Error("User document not found");

    const userDocument = users.documents[0];
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
      const users = await databases.listDocuments(
        config.databaseId!,
        config.usersCollectionId!,
        [Query.equal("userId", result.$id)]
      );

      const userData = users.documents.length > 0 ? users.documents[0] : null;

      const userAvatar = userData?.avatar
        ? userData.avatar
        : avatar
            .getInitials(`${userData?.firstname || ""} ${userData?.lastname || ""}`)
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
    if (!currentUser || !currentUser.$id) throw new Error("No authenticated user found");

    const users = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("userId", currentUser.$id)]
    );
    if (users.documents.length === 0) throw new Error("User document not found");

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
          const fileIdMatch = currentUser.avatar.match(/files\/([^/]+)\/view/);
          if (fileIdMatch && fileIdMatch[1]) {
            const oldFileId = fileIdMatch[1];
            await storage.deleteFile(bucketId, oldFileId);
          }
        } catch (deleteError) {
          console.error("Failed to delete old avatar:", deleteError);
        }
      }

      const fileId = ID.unique();
      const uploadResult = await storage.createFile(bucketId, fileId, avatarFile);
      const fileUrl = storage.getFileView(bucketId, uploadResult.$id);
      updateData.avatar = fileUrl.href;
      avatarUrl = fileUrl.href;
    }

    const userDoc = users.documents[0];
    await databases.updateDocument(
      config.databaseId!,
      config.usersCollectionId!,
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
    if (!currentUser || !currentUser.$id) throw new Error("No authenticated user found");

    const users = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("userId", currentUser.$id)]
    );
    if (users.documents.length === 0) throw new Error("User document not found");

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

    const users = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("userId", currentUser.$id)]
    );
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
