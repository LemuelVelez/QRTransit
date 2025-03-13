// PayMongo API client for Expo React Native
import { encode as base64Encode } from "base-64";

// PayMongo API base URL
const PAYMONGO_API_URL = "https://api.paymongo.com/v1";

// PayMongo minimum amount in PHP
export const PAYMONGO_MIN_AMOUNT = 100; // PHP 100.00

// Get authorization header with proper API key
export function getAuthorizationHeader() {
  // Access the environment variable properly
  const secretKey = process.env.EXPO_PUBLIC_PAYMONGO_SECRET_KEY;

  console.log(
    "Checking for PayMongo key:",
    secretKey ? "Key exists" : "Key missing"
  );

  if (!secretKey) {
    console.error("PayMongo API key is missing");
    throw new Error("Payment configuration error");
  }

  return `Basic ${base64Encode(secretKey + ":")}`;
}

// Create a payment link
export async function createPaymentLink(
  amount: string,
  description: string,
  remarks?: string
) {
  try {
    // Convert amount to smallest currency unit (centavos)
    const amountValue = Number.parseFloat(amount);

    // Validate minimum amount
    if (amountValue < PAYMONGO_MIN_AMOUNT) {
      throw new Error(
        `The minimum amount for PayMongo Links is PHP ${PAYMONGO_MIN_AMOUNT}.00`
      );
    }

    const amountInCentavos = Math.round(amountValue * 100);

    // PayMongo API request options
    const options = {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: getAuthorizationHeader(),
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: amountInCentavos,
            description: description,
            remarks: remarks || "Payment from mobile app",
          },
        },
      }),
    };

    // Create payment link via PayMongo API
    const response = await fetch(`${PAYMONGO_API_URL}/links`, options);
    const responseData = await response.json();

    // Log response for debugging
    console.log(
      "Payment link response:",
      JSON.stringify(responseData, null, 2)
    );

    // Check for API errors
    if (responseData.errors) {
      const errorMessage =
        responseData.errors[0]?.detail || "Payment link creation failed";
      throw new Error(errorMessage);
    }

    return responseData;
  } catch (error) {
    console.error("Payment link creation error:", error);
    throw error;
  }
}

// Open a payment URL in the browser
export async function openPaymentUrl(url: string) {
  try {
    // Use expo-web-browser to open the URL
    const WebBrowser = require("expo-web-browser");
    return await WebBrowser.openBrowserAsync(url);
  } catch (error) {
    console.error("Error opening payment URL:", error);
    throw error;
  }
}

// Verify payment status
export async function verifyPaymentStatus(linkId: string) {
  try {
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: getAuthorizationHeader(),
      },
    };

    const response = await fetch(
      `${PAYMONGO_API_URL}/links/${linkId}`,
      options
    );
    const responseData = await response.json();

    if (responseData.errors) {
      const errorMessage =
        responseData.errors[0]?.detail || "Payment verification failed";
      throw new Error(errorMessage);
    }

    return responseData;
  } catch (error) {
    console.error("Payment verification error:", error);
    throw error;
  }
}
