import { databases, config } from "./appwrite";
import { ID, Query } from "react-native-appwrite";

export interface DiscountConfig {
  id?: string;
  passengerType: string;
  discountPercentage: number;
  description?: string;
  active: boolean;
  createdAt?: number;
}

// Get the discounts collection ID with fallback
function getDiscountsCollectionId(): string {
  // Try to get from environment variable first
  const envCollectionId =
    process.env.EXPO_PUBLIC_APPWRITE_DISCOUNTS_COLLECTION_ID;

  // If environment variable is set, use it
  if (envCollectionId) {
    return envCollectionId;
  }

  // If config has it, use that
  if (config.discountsCollectionId) {
    return config.discountsCollectionId;
  }

  // Fallback to hardcoded value
  return "discounts";
}

// Get all discount configurations
export async function getDiscountConfigurations(): Promise<DiscountConfig[]> {
  try {
    const databaseId = config.databaseId;

    if (!databaseId) {
      console.error("Database ID is missing");
      return [];
    }

    const collectionId = getDiscountsCollectionId();

    try {
      // Get discounts from the database
      const response = await databases.listDocuments(databaseId, collectionId, [
        Query.orderAsc("passengerType"),
      ]);

      return response.documents.map((doc) => ({
        id: doc.$id,
        passengerType: doc.passengerType,
        discountPercentage: Number(doc.discountPercentage),
        description: doc.description,
        active: doc.active === true,
        createdAt: doc.$createdAt
          ? new Date(doc.$createdAt).getTime()
          : undefined,
      }));
    } catch (error) {
      console.error("Error fetching discounts:", error);
      return [];
    }
  } catch (error) {
    console.error("Error in getDiscountConfigurations:", error);
    return [];
  }
}

// Save a discount configuration
export async function saveDiscountConfiguration(
  discount: Omit<DiscountConfig, "id" | "createdAt">
): Promise<string | null> {
  try {
    const databaseId = config.databaseId;

    if (!databaseId) {
      console.error("Database ID is missing");
      return null;
    }

    const collectionId = getDiscountsCollectionId();

    const result = await databases.createDocument(
      databaseId,
      collectionId,
      ID.unique(),
      {
        passengerType: discount.passengerType,
        discountPercentage: discount.discountPercentage.toString(),
        description: discount.description || "",
        active: discount.active,
        // Removed createdBy field as it's causing issues
        // Appwrite will automatically add $createdAt
      }
    );

    return result.$id;
  } catch (error) {
    console.error("Error saving discount configuration:", error);
    return null;
  }
}

// Update a discount configuration
export async function updateDiscountConfiguration(
  id: string,
  updates: Partial<Omit<DiscountConfig, "id" | "createdAt">>
): Promise<boolean> {
  try {
    const databaseId = config.databaseId;

    if (!databaseId) {
      console.error("Database ID is missing");
      return false;
    }

    const collectionId = getDiscountsCollectionId();

    const updateData: Record<string, any> = {};
    if (updates.passengerType !== undefined)
      updateData.passengerType = updates.passengerType;
    if (updates.discountPercentage !== undefined)
      updateData.discountPercentage = updates.discountPercentage.toString();
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.active !== undefined) updateData.active = updates.active;

    await databases.updateDocument(databaseId, collectionId, id, updateData);
    return true;
  } catch (error) {
    console.error("Error updating discount configuration:", error);
    return false;
  }
}

// Delete a discount configuration
export async function deleteDiscountConfiguration(
  id: string
): Promise<boolean> {
  try {
    const databaseId = config.databaseId;

    if (!databaseId) {
      console.error("Database ID is missing");
      return false;
    }

    const collectionId = getDiscountsCollectionId();

    await databases.deleteDocument(databaseId, collectionId, id);
    return true;
  } catch (error) {
    console.error("Error deleting discount configuration:", error);
    return false;
  }
}

// Get discount percentage for a passenger type
export async function getDiscountPercentage(
  passengerType: string
): Promise<number> {
  try {
    const discounts = await getDiscountConfigurations();
    const discount = discounts.find(
      (d) => d.passengerType === passengerType && d.active
    );
    return discount ? discount.discountPercentage : 0;
  } catch (error) {
    console.error("Error getting discount percentage:", error);
    return 0; // No discount if there's an error
  }
}
