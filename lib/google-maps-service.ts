// lib/google-maps-service.ts

interface DistanceResult {
  distance: number; // in kilometers
  duration: number; // in seconds
  status: "OK" | "ZERO_RESULTS" | "ERROR";
}

type CalculateDistanceOptions = {
  /** Waypoints you must pass through, in order (enforces corridor like “via Ipil”) */
  via?: string[] | string;
};

type LatLng = { lat: number; lng: number };

const REGION_BIAS = "ph"; // 🇵🇭 bias
const COUNTRY_COMPONENT = "country:ph";

/* =======================
 * Geocoding
 * ======================= */

/**
 * Geocode a free-form address/place into Lat/Lng using Google Geocoding API.
 * Adds country & region bias for PH to improve accuracy.
 */
async function geocodeAddress(
  address: string,
  apiKey: string
): Promise<LatLng | null> {
  try {
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?address=${encodeURIComponent(address)}` +
      `&components=${encodeURIComponent(COUNTRY_COMPONENT)}` +
      `&region=${encodeURIComponent(REGION_BIAS)}` +
      `&key=${apiKey}`;

    const resp = await fetch(url);
    const data = await resp.json();
    if (data.status === "OK" && data.results?.[0]?.geometry?.location) {
      const loc = data.results[0].geometry.location;
      return { lat: loc.lat, lng: loc.lng };
    }
    return null;
  } catch {
    return null;
  }
}

/* =======================
 * Distance Matrix helpers
 * ======================= */

function coordToStr(ll: LatLng) {
  return `${ll.lat},${ll.lng}`;
}

async function getDMOneLeg(
  orig: string,
  dest: string,
  mapsApiKey: string
): Promise<{ km: number; sec: number } | null> {
  const url =
    `https://maps.googleapis.com/maps/api/distancematrix/json` +
    `?origins=${encodeURIComponent(orig)}` +
    `&destinations=${encodeURIComponent(dest)}` +
    `&mode=driving` +
    `&region=${encodeURIComponent(REGION_BIAS)}` +
    `&key=${mapsApiKey}`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (
    data.status === "OK" &&
    data.rows?.[0]?.elements?.[0]?.status === "OK"
  ) {
    const el = data.rows[0].elements[0];
    return { km: el.distance.value / 1000, sec: el.duration.value };
  }
  return null;
}

/**
 * Distance Matrix for a chain of points (origin -> ...via -> destination).
 * Works for both zero-via (single leg) and multi-via cases.
 */
async function distanceMatrixChained(
  points: string[],
  mapsApiKey: string
): Promise<DistanceResult> {
  let totalKm = 0;
  let totalSec = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const leg = await getDMOneLeg(points[i], points[i + 1], mapsApiKey);
    if (!leg) {
      return { distance: 0, duration: 0, status: "ERROR" };
    }
    totalKm += leg.km;
    totalSec += leg.sec;
  }
  if (totalKm > 0) {
    return { distance: totalKm, duration: Math.round(totalSec), status: "OK" };
  }
  return { distance: 0, duration: 0, status: "ZERO_RESULTS" };
}

/* =======================
 * Routes API helper
 * ======================= */

async function routesApiCompute(
  originSpec: any,
  destSpec: any,
  intermediates: any[] | undefined,
  routesApiKey: string
): Promise<DistanceResult> {
  const url = "https://routes.googleapis.com/directions/v2:computeRoutes";
  const body: any = {
    origin: originSpec,
    destination: destSpec,
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE_OPTIMAL",
    computeAlternativeRoutes: false,
    optimizeWaypointOrder: false, // respect exact VIA order
  };
  if (intermediates && intermediates.length) {
    body.intermediates = intermediates;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": routesApiKey,
      "X-Goog-FieldMask":
        "routes.distanceMeters,routes.duration,routes.legs.distanceMeters,routes.legs.duration",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (data?.routes?.length > 0) {
    const route = data.routes[0];

    // Prefer summing legs when available for stability
    let legsMeters = 0;
    let legsSecs = 0;
    if (Array.isArray(route.legs) && route.legs.length) {
      legsMeters = route.legs.reduce(
        (sum: number, leg: any) => sum + (leg?.distanceMeters ?? 0),
        0
      );
      legsSecs = route.legs.reduce((sum: number, leg: any) => {
        const d = String(leg?.duration ?? "0").replace("s", "");
        const n = Number.parseFloat(d);
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0);
    }

    // Fallback to route-level metrics if legs unavailable
    const routeMeters =
      typeof route.distanceMeters === "number" ? route.distanceMeters : 0;
    const routeSecs = (() => {
      const d = String(route.duration ?? "0").replace("s", "");
      const n = Number.parseFloat(d);
      return Number.isFinite(n) ? n : 0;
    })();

    // Choose the more reliable set
    const distanceMeters =
      legsMeters > 0 ? legsMeters : routeMeters;
    const durationSecs =
      legsMeters > 0 ? legsSecs : routeSecs;

    const distanceKm = distanceMeters / 1000;
    if (distanceKm > 0) {
      return {
        distance: distanceKm,
        duration: Math.round(durationSecs),
        status: "OK",
      };
    }
    return { distance: 0, duration: 0, status: "ZERO_RESULTS" };
  }

  return { distance: 0, duration: 0, status: "ZERO_RESULTS" };
}

/* =======================
 * Public API
 * ======================= */

/**
 * Calculate distance using:
 *  - ✅ If NO VIA and Maps key present: Distance Matrix first (more stable for single leg)
 *  - ✅ If VIA present: Routes API with strict intermediates (enforces corridor)
 *  - 🔁 Robust fallbacks across both APIs
 * All inputs are geocoded first (PH-biased) to reduce ambiguity.
 */
export async function calculateDistance(
  origin: string,
  destination: string,
  options?: CalculateDistanceOptions
): Promise<DistanceResult> {
  try {
    const routesApiKey = process.env.EXPO_PUBLIC_GOOGLE_ROUTES_API_KEY;
    const mapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

    const viaListRaw: string[] = Array.isArray(options?.via)
      ? options?.via
      : options?.via
      ? [options.via]
      : [];
    const viaList = viaListRaw.map((v) => String(v || "").trim()).filter(Boolean);

    if (!routesApiKey && !mapsApiKey) {
      console.error("Both Google API keys are missing");
      return { distance: 0, duration: 0, status: "ERROR" };
    }

    // --- Geocode everything (PH bias) ---
    let originLL: LatLng | null = null;
    let destLL: LatLng | null = null;
    let viasLL: (LatLng | null)[] = [];

    if (mapsApiKey) {
      const [o, d, ...vs] = await Promise.all([
        geocodeAddress(origin, mapsApiKey),
        geocodeAddress(destination, mapsApiKey),
        ...viaList.map((v) => geocodeAddress(v, mapsApiKey)),
      ]);
      originLL = o;
      destLL = d;
      viasLL = vs;
    }

    const haveAllCoords =
      !!originLL &&
      !!destLL &&
      viasLL.length === viaList.length &&
      viasLL.every((x) => x !== null);

    // Helper creators for Routes API specs
    const toWaypoint = (ll: LatLng | null, addr: string) =>
      ll
        ? { location: { latLng: { latitude: ll.lat, longitude: ll.lng } } }
        : { address: addr };

    /* ===================================================
     * Strategy 1: NO VIA → Prefer Distance Matrix (single leg)
     * =================================================== */
    if (viaList.length === 0 && mapsApiKey) {
      const oStr = originLL ? coordToStr(originLL) : origin;
      const dStr = destLL ? coordToStr(destLL) : destination;

      const dmResult = await distanceMatrixChained([oStr, dStr], mapsApiKey);
      if (dmResult.status === "OK" && dmResult.distance > 0) {
        return dmResult;
      }

      // Fallback to Routes API if DM did not yield results
      if (routesApiKey) {
        const originSpec = haveAllCoords
          ? {
              location: {
                latLng: { latitude: originLL!.lat, longitude: originLL!.lng },
              },
            }
          : { address: origin };
        const destSpec = haveAllCoords
          ? {
              location: {
                latLng: { latitude: destLL!.lat, longitude: destLL!.lng },
              },
            }
          : { address: destination };

        const routesResult = await routesApiCompute(
          originSpec,
          destSpec,
          undefined,
          routesApiKey
        );
        if (routesResult.status === "OK" && routesResult.distance > 0) {
          return routesResult;
        }
      }
    }

    /* ===================================================
     * Strategy 2: VIA present → Prefer Routes API (strict corridor)
     * =================================================== */
    if (viaList.length > 0 && routesApiKey) {
      const originSpec = haveAllCoords
        ? {
            location: {
              latLng: { latitude: originLL!.lat, longitude: originLL!.lng },
            },
          }
        : { address: origin };
      const destSpec = haveAllCoords
        ? {
            location: {
              latLng: { latitude: destLL!.lat, longitude: destLL!.lng },
            },
          }
        : { address: destination };
      const inters = viaList.map((v, i) => toWaypoint(viasLL[i] ?? null, v));

      const routesResult = await routesApiCompute(
        originSpec,
        destSpec,
        inters,
        routesApiKey
      );
      if (routesResult.status === "OK" && routesResult.distance > 0) {
        return routesResult;
      }
      // Fallback to Distance Matrix chained legs if Routes failed
      if (mapsApiKey) {
        const oStr = originLL ? coordToStr(originLL) : origin;
        const dStr = destLL ? coordToStr(destLL) : destination;
        const vStrs = viasLL.length
          ? viasLL.map((ll, i) => (ll ? coordToStr(ll) : viaList[i]))
          : viaList;

        const dmResult = await distanceMatrixChained(
          [oStr, ...vStrs, dStr],
          mapsApiKey
        );
        if (dmResult.status === "OK" && dmResult.distance > 0) {
          return dmResult;
        }
      }
    }

    /* ===================================================
     * Last resort: try whatever key is available
     * =================================================== */
    if (mapsApiKey) {
      const oStr = originLL ? coordToStr(originLL) : origin;
      const dStr = destLL ? coordToStr(destLL) : destination;
      const dmResult = await distanceMatrixChained([oStr, dStr], mapsApiKey);
      if (dmResult.status === "OK" && dmResult.distance > 0) {
        return dmResult;
      }
    }
    if (routesApiKey) {
      const originSpec = haveAllCoords
        ? {
            location: {
              latLng: { latitude: originLL!.lat, longitude: originLL!.lng },
            },
          }
        : { address: origin };
      const destSpec = haveAllCoords
        ? {
            location: {
              latLng: { latitude: destLL!.lat, longitude: destLL!.lng },
            },
          }
        : { address: destination };
      const routesResult = await routesApiCompute(
        originSpec,
        destSpec,
        undefined,
        routesApiKey
      );
      if (routesResult.status === "OK" && routesResult.distance > 0) {
        return routesResult;
      }
    }

    return { distance: 0, duration: 0, status: "ERROR" };
  } catch (error) {
    console.error("Error calculating distance:", error);
    return { distance: 0, duration: 0, status: "ERROR" };
  }
}

/* =======================
 * Google PLACES helpers
 * ======================= */

export type PlaceSuggestion = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

type AutocompleteOpts = {
  /** Session token to group billing for a user session */
  sessionToken?: string;
  /** Bias around a location in meters radius */
  locationBias?: { lat: number; lng: number; radiusMeters: number };
  /** Components filter, e.g., "country:ph" */
  components?: string;
  /** Type filter, e.g., "geocode", "establishment" */
  types?: string;
};

/**
 * Lightweight wrapper over Places Autocomplete (legacy REST) for broad support.
 * Docs: https://developers.google.com/places/web-service/autocomplete
 */
export async function placesAutocomplete(
  input: string,
  opts?: AutocompleteOpts
): Promise<PlaceSuggestion[]> {
  const mapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!mapsApiKey || !input.trim()) return [];

  try {
    const params = new URLSearchParams();
    params.set("input", input);
    params.set("key", mapsApiKey);
    params.set("types", opts?.types || "geocode");
    params.set("components", opts?.components || COUNTRY_COMPONENT);
    if (opts?.sessionToken) params.set("sessiontoken", opts.sessionToken);
    if (opts?.locationBias) {
      params.set("location", `${opts.locationBias.lat},${opts.locationBias.lng}`);
      params.set(
        "radius",
        String(Math.max(500, Math.min(50000, opts.locationBias.radiusMeters)))
      );
    }

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (data?.status !== "OK" || !Array.isArray(data?.predictions)) return [];

    return data.predictions.map((p: any) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text ?? p.description,
      secondaryText: p.structured_formatting?.secondary_text ?? "",
    }));
  } catch (e) {
    console.error("placesAutocomplete error:", e);
    return [];
  }
}

export type PlaceDetails = {
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
};

/**
 * Fetch minimal details to resolve lat/lng & canonical name.
 * Docs: https://developers.google.com/maps/documentation/places/web-service/details
 */
export async function getPlaceDetails(
  placeId: string,
  sessionToken?: string
): Promise<PlaceDetails | null> {
  const mapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!mapsApiKey || !placeId) return null;

  try {
    const params = new URLSearchParams();
    params.set("place_id", placeId);
    params.set("key", mapsApiKey);
    // Keep fields small to reduce cost
    params.set("fields", "name,formatted_address,geometry/location");
    if (sessionToken) params.set("sessiontoken", sessionToken);

    const url = `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (data?.status !== "OK" || !data?.result?.geometry?.location) return null;

    const loc = data.result.geometry.location;
    return {
      name: data.result.name ?? "",
      formattedAddress: data.result.formatted_address ?? "",
      lat: loc.lat,
      lng: loc.lng,
    };
  } catch (e) {
    console.error("getPlaceDetails error:", e);
    return null;
  }
}
