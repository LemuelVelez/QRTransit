import { storage } from "./appwrite";
import { ID } from "react-native-appwrite";
import * as FileSystem from "expo-file-system";

// Upload image to Appwrite storage
export async function uploadPassengerPhoto(
  imageUri: string
): Promise<string | null> {
  try {
    const bucketId = process.env.EXPO_PUBLIC_APPWRITE_PASSENGER_PHOTO_BUCKET_ID;

    if (!bucketId) {
      console.error("Passenger photo bucket ID is missing");
      return null;
    }

    // Get file info to determine the actual size
    const fileInfo = await FileSystem.getInfoAsync(imageUri);

    // Default size (1MB) if file info doesn't contain size
    const fileSize =
      fileInfo.exists && "size" in fileInfo ? fileInfo.size : 1024 * 1024;

    // Create a file object with all required properties
    const fileBlob = {
      uri: imageUri,
      name: `passenger_photo_${Date.now()}.jpg`,
      type: "image/jpeg",
      size: fileSize,
    };

    // Generate a unique file ID
    const fileId = ID.unique();

    // Upload the file to Appwrite storage
    const result = await storage.createFile(bucketId, fileId, fileBlob);

    // Get the file URL
    const fileUrl = storage.getFileView(bucketId, result.$id);

    return fileUrl.href;
  } catch (error) {
    console.error("Error uploading passenger photo:", error);
    return null;
  }
}
