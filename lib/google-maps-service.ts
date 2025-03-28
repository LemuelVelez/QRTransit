interface DistanceResult {
  distance: number; // in kilometers
  duration: number; // in seconds
  status: "OK" | "ZERO_RESULTS" | "ERROR";
}

// Calculate distance between two locations using Google Routes API v2
export async function calculateDistance(
  origin: string,
  destination: string
): Promise<DistanceResult> {
  try {
    const routesApiKey = process.env.EXPO_PUBLIC_GOOGLE_ROUTES_API_KEY;
    const mapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!routesApiKey && !mapsApiKey) {
      console.error("Both Google API keys are missing");
      return {
        distance: 0,
        duration: 0,
        status: "ERROR",
      };
    }

    // First try with the Routes API v2 (if key is available)
    if (routesApiKey) {
      try {
        const url = "https://routes.googleapis.com/directions/v2:computeRoutes";

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": routesApiKey,
            "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
          },
          body: JSON.stringify({
            origin: {
              address: origin,
            },
            destination: {
              address: destination,
            },
            travelMode: "DRIVE",
            routingPreference: "TRAFFIC_AWARE",
          }),
        });

        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          // Convert distance from meters to kilometers
          const distanceInKm = route.distanceMeters / 1000;
          // Convert duration from string (like "1200s") to seconds
          const durationInSeconds = Number.parseInt(
            route.duration.replace("s", "")
          );

          return {
            distance: distanceInKm,
            duration: durationInSeconds,
            status: "OK",
          };
        }
      } catch (routesError) {
        console.error("Error with Routes API:", routesError);
        // Fall through to try Maps API if Routes API fails
      }
    }

    // Fall back to Distance Matrix API if Routes API failed or key not available
    if (mapsApiKey) {
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
        origin
      )}&destinations=${encodeURIComponent(destination)}&key=${mapsApiKey}`;

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
      } else {
        console.error("Error in Google Maps API response:", data);
      }
    }

    // If we get here, both APIs failed or weren't available
    return {
      distance: 0,
      duration: 0,
      status: "ERROR",
    };
  } catch (error) {
    console.error("Error calculating distance:", error);
    return {
      distance: 0,
      duration: 0,
      status: "ERROR",
    };
  }
}
