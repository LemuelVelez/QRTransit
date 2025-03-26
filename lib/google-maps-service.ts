interface DistanceResult {
  distance: number; // in kilometers
  duration: number; // in seconds
  status: "OK" | "ZERO_RESULTS" | "ERROR";
}

// Calculate distance between two locations using Google Maps API
export async function calculateDistance(
  origin: string,
  destination: string
): Promise<DistanceResult> {
  try {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error("Google Maps API key is missing");
      return {
        distance: 0,
        duration: 0,
        status: "ERROR",
      };
    }

    // Make a real API call to Google Maps Distance Matrix API
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
      origin
    )}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    // Check if the API returned valid results
    if (data.status === "OK" && data.rows[0].elements[0].status === "OK") {
      const element = data.rows[0].elements[0];

      // Convert distance from meters to kilometers
      const distanceInKm = element.distance.value / 1000;

      return {
        distance: distanceInKm,
        duration: element.duration.value,
        status: "OK",
      };
    } else if (
      data.status === "ZERO_RESULTS" ||
      (data.rows[0] && data.rows[0].elements[0].status === "ZERO_RESULTS")
    ) {
      return {
        distance: 0,
        duration: 0,
        status: "ZERO_RESULTS",
      };
    } else {
      console.error("Error in Google Maps API response:", data);
      return {
        distance: 0,
        duration: 0,
        status: "ERROR",
      };
    }
  } catch (error) {
    console.error("Error calculating distance:", error);
    return {
      distance: 0,
      duration: 0,
      status: "ERROR",
    };
  }
}
