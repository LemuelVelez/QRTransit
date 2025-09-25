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
  busTypeCollectionId: process.env.EXPO_PUBLIC_APPWRITE_BUS_TYPE_COLLECTION_ID,
  fareCollectionId: process.env.EXPO_PUBLIC_APPWRITE_FARE_COLLECTION_ID,
};

export const client = new Client();
client.setEndpoint(config.endpoint!).setProject(config.projectId!);

export const avatar = new Avatars(client);
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// ---- Safe error normalization helper ----
const toErrorInfo = (
  err: unknown
): { message: string; code?: number | string; raw: unknown } => {
  if (err instanceof Error) {
    const anyErr = err as any;
    return {
      message: err.message || "Unknown error",
      code: anyErr?.code,
      raw: err,
    };
  }
  if (typeof err === "string") return { message: err, raw: err };
  if (err && typeof err === "object") {
    const anyErr = err as Record<string, unknown>;
    const msg =
      typeof anyErr["message"] === "string"
        ? (anyErr["message"] as string)
        : JSON.stringify(anyErr);
    const codeVal =
      typeof anyErr["code"] === "string" || typeof anyErr["code"] === "number"
        ? (anyErr["code"] as number | string)
        : undefined;
    return { message: msg, code: codeVal, raw: err };
  }
  return { message: "Unknown error", raw: err };
};

/**
 * Registration flow per your requirement:
 * 1) Strict DB checks: BLOCK if username OR phonenumber exist in DB (regardless of userId).
 * 2) Then handle Auth by email (create account, or fail if email already in Auth).
 * 3) DB write: claim orphan by email (if exists and has no userId), else create new doc.
 */
export async function registerUser(
  email: string,
  password: string,
  firstname: string,
  lastname: string,
  username: string,
  phonenumber: string
) {
  try {
    if (!config.databaseId || !config.usersCollectionId) {
      throw new Error("Configuration error: Missing database/collection IDs");
    }

    const normEmail = email.trim().toLowerCase();
    const normUsername = username.trim();
    const normPhone = phonenumber.trim();

    // (A) DB STRICT CHECKS first (username & phone) - block on ANY hit
    const [userDocs, phoneDocs] = await Promise.all([
      databases.listDocuments(config.databaseId!, config.usersCollectionId!, [
        Query.equal("username", normUsername),
      ]),
      databases.listDocuments(config.databaseId!, config.usersCollectionId!, [
        Query.equal("phonenumber", normPhone),
      ]),
    ]);

    if (userDocs.documents.length > 0) {
      throw new Error("username already exists");
    }
    if (phoneDocs.documents.length > 0) {
      throw new Error("phone number already exists");
    }

    // (B) AUTH by email after DB checks
    let newAccount;
    try {
      newAccount = await account.create(
        ID.unique(),
        normEmail,
        password,
        `${firstname} ${lastname}`.trim()
      );
    } catch (err) {
      const { message, code } = toErrorInfo(err);
      const msg = (message || "").toLowerCase();
      if (
        msg.includes("already exists") ||
        msg.includes("user already exists") ||
        code === 409
      ) {
        throw new Error("email already exists in auth");
      }
      throw new Error(message || "Failed to create Auth account");
    }

    if (!newAccount?.$id) {
      throw new Error("Failed to create Auth account");
    }

    // Create session for the new Auth user
    await account.createEmailPasswordSession(normEmail, password);

    // (C) DB write — claim orphan by email if present (no userId), else create fresh doc
    const emailDocs = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("email", normEmail)]
    );

    const baseProfile = {
      userId: newAccount.$id,
      email: normEmail,
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      username: normUsername,
      phonenumber: normPhone,
    };

    const orphanByEmail = emailDocs.documents.find((d: any) => !d.userId);

    if (orphanByEmail) {
      // Claim orphan (preserve pin if present)
      try {
        await databases.updateDocument(
          config.databaseId!,
          config.usersCollectionId!,
          orphanByEmail.$id,
          {
            ...baseProfile,
            pin: typeof orphanByEmail.pin === "string" ? orphanByEmail.pin : "",
          }
        );
      } catch (_uErr) {
        // Fallback to creating a new profile if update fails
        await databases.createDocument(
          config.databaseId!,
          config.usersCollectionId!,
          ID.unique(),
          { ...baseProfile, pin: "" }
        );
      }
    } else {
      // Create a fresh user document
      await databases.createDocument(
        config.databaseId!,
        config.usersCollectionId!,
        ID.unique(),
        { ...baseProfile, pin: "" }
      );
    }

    const userAvatar = avatar.getInitials(`${firstname} ${lastname}`);

    return {
      ...newAccount,
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      username: normUsername,
      phonenumber: normPhone,
      avatar: userAvatar.toString(),
    };
  } catch (err) {
    const { message } = toErrorInfo(err);
    console.error("Registration error:", err);
    throw new Error(message);
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
  } catch (err) {
    const { message } = toErrorInfo(err);
    console.error("Login error:", err);
    throw new Error(message);
  }
}

export async function logoutUser() {
  try {
    const currentSession = await account.getSession("current");
    await account.deleteSession(currentSession.$id);
    return { success: true };
  } catch (err) {
    const { message } = toErrorInfo(err);
    console.error("Logout error:", err);
    throw new Error(message);
  }
}

/**
 * Register a PIN for the current user
 */
export async function registerPin(pin: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.$id) {
      throw new Error("No authenticated user found");
    }

    const hashedPin = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pin
    );

    const users = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("userId", currentUser.$id)]
    );

    if (users.documents.length === 0) {
      throw new Error("User document not found");
    }

    const userDoc = users.documents[0];
    await databases.updateDocument(
      config.databaseId!,
      config.usersCollectionId!,
      userDoc.$id,
      { pin: hashedPin }
    );

    return { ...currentUser, pin: hashedPin };
  } catch (err) {
    const { message } = toErrorInfo(err);
    console.error("PIN registration error:", err);
    throw new Error(message);
  }
}

/**
 * Verify a PIN against the stored hashed PIN
 */
export async function verifyPin(pin: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.$id) {
      throw new Error("No authenticated user found");
    }

    const users = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("userId", currentUser.$id)]
    );

    if (users.documents.length === 0) {
      throw new Error("User document not found");
    }

    const userDocument = users.documents[0];
    if (!userDocument.pin) return false;

    const hashedPin = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pin
    );

    return hashedPin === userDocument.pin;
  } catch (err) {
    console.error("PIN verification error:", err);
    return false;
  }
}

/**
 * Get the hashed PIN for the current user
 */
export async function getPin() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.$id) {
      throw new Error("No authenticated user found");
    }

    const users = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("userId", currentUser.$id)]
    );

    if (users.documents.length === 0) {
      throw new Error("User document not found");
    }

    const userDocument = users.documents[0];
    return userDocument.pin || null;
  } catch (err) {
    console.error("Get PIN error:", err);
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
  } catch (_err) {
    return null;
  }
}

/**
 * Update user profile information
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
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.$id) {
      throw new Error("No authenticated user found");
    }

    const users = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("userId", currentUser.$id)]
    );

    if (users.documents.length === 0) {
      throw new Error("User document not found");
    }

    const updateData: Record<string, any> = {};
    if (userData.firstname) updateData.firstname = userData.firstname;
    if (userData.lastname) updateData.lastname = userData.lastname;
    if (userData.username) updateData.username = userData.username;
    if (userData.email) updateData.email = userData.email;
    if (userData.phonenumber) updateData.phonenumber = userData.phonenumber;

    let avatarUrl = currentUser.avatar;

    if (avatarFile) {
      try {
        const bucketId = config.avatarBucketId;
        if (!bucketId) {
          throw new Error("Missing bucket ID configuration");
        }

        if (currentUser.avatar) {
          try {
            const fileIdMatch = (currentUser.avatar as string).match(
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
      } catch (uploadError) {
        console.error("Avatar upload error:", uploadError);
      }
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
  } catch (err) {
    const { message } = toErrorInfo(err);
    console.error("Profile update error:", err);
    throw new Error(message);
  }
}

export async function getCurrentSession() {
  try {
    const session = await account.getSession("current");
    return session;
  } catch (_err) {
    return null;
  }
}

/**
 * Get the user's role and redirect based on role
 */
export async function getUserRoleAndRedirect() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.$id) {
      throw new Error("No authenticated user found");
    }

    const users = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("userId", currentUser.$id)]
    );

    if (users.documents.length === 0) {
      throw new Error("User document not found");
    }

    const userDocument = users.documents[0];
    const role = userDocument.role || "passenger";

    if (role === "conductor") {
      return { role: "conductor", redirectTo: "/conductor" };
    } else if (role === "inspector") {
      return { role: "inspector", redirectTo: "/inspector" };
    } else {
      return { role: "passenger", redirectTo: "/" };
    }
  } catch (_err) {
    return { role: "passenger", redirectTo: "/" };
  }
}

/**
 * Check if the user has permission to access a specific route
 */
export async function checkRoutePermission(requiredRole: string | string[]) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.$id) {
      return false;
    }

    const users = await databases.listDocuments(
      config.databaseId!,
      config.usersCollectionId!,
      [Query.equal("userId", currentUser.$id)]
    );

    if (users.documents.length === 0) {
      return false;
    }

    const userDocument = users.documents[0];
    const userRole = userDocument.role || "passenger";

    if (typeof requiredRole === "string") {
      return userRole === requiredRole;
    }
    return requiredRole.includes(userRole);
  } catch (_err) {
    return false;
  }
}
