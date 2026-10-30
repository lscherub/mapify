import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { haversineKm } from "@/lib/place-utils";
import { demoPlaces } from "@/lib/mock-data";
import { type WifiCredentialResult } from "@/lib/types";

// In-memory sliding window rate limiter (max 30 requests per minute per IP)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;
const MAX_PROXIMITY_METERS = 500;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) ?? [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  validTimestamps.push(now);
  rateLimitMap.set(ip, validTimestamps);
  return false;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<WifiCredentialResult>> {
  const { id } = await context.params;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      {
        authorized: false,
        reason: "rate_limited",
        message: "Too many requests. Please wait a minute before trying again."
      },
      { status: 429 }
    );
  }

  const url = new URL(request.url);
  const latParam = url.searchParams.get("lat");
  const lngParam = url.searchParams.get("lng");
  const networkId = url.searchParams.get("networkId");

  const userLat = latParam ? parseFloat(latParam) : NaN;
  const userLng = lngParam ? parseFloat(lngParam) : NaN;

  if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) {
    return NextResponse.json(
      {
        authorized: false,
        reason: "missing_location",
        message: "Device location coordinates are required to unlock Wi-Fi credentials."
      },
      { status: 400 }
    );
  }

  const client = createSupabaseAdminClient();

  let placeLat: number | null = null;
  let placeLng: number | null = null;
  let wifiNetwork: {
    id: string;
    ssid: string;
    password: string | null;
    access_type?: string;
    instructions?: string;
  } | null = null;

  if (client) {
    const { data: place, error: placeError } = await client
      .from("places")
      .select("id, latitude, longitude")
      .eq("id", id)
      .single();

    if (!placeError && place) {
      placeLat = Number(place.latitude);
      placeLng = Number(place.longitude);

      let query = client
        .from("wifi_networks")
        .select("id, ssid, password, access_type, instructions")
        .eq("place_id", id);

      if (networkId) {
        query = query.eq("id", networkId);
      }

      const { data: networks } = await query;
      if (networks && networks.length > 0) {
        wifiNetwork = networks[0];
      }
    }
  }

  // Fallback to demoPlaces if not in Supabase
  if (placeLat === null || placeLng === null) {
    const demo = demoPlaces.find((p) => p.id === id);
    if (demo) {
      placeLat = demo.latitude;
      placeLng = demo.longitude;
      const net = networkId
        ? demo.wifiNetworks.find((n) => n.id === networkId)
        : demo.wifiNetworks[0];
      if (net) {
        wifiNetwork = {
          id: net.id,
          ssid: net.ssid,
          password: net.password ?? null,
          access_type: demo.wifiFree ? "free" : "purchase_required"
        };
      }
    }
  }

  if (placeLat === null || placeLng === null || !wifiNetwork) {
    return NextResponse.json(
      {
        authorized: false,
        reason: "not_found",
        message: "This location does not have registered Wi-Fi credentials."
      },
      { status: 404 }
    );
  }

  const distanceKm = haversineKm(
    { latitude: userLat, longitude: userLng },
    { latitude: placeLat, longitude: placeLng }
  );
  const distanceMeters = Math.round(distanceKm * 1000);

  if (distanceMeters > MAX_PROXIMITY_METERS) {
    return NextResponse.json(
      {
        authorized: false,
        reason: "outside_proximity",
        distanceMeters,
        maxDistanceMeters: MAX_PROXIMITY_METERS,
        message: `You are approximately ${distanceMeters} meters away. You must be within ${MAX_PROXIMITY_METERS} meters to reveal the Wi-Fi password.`
      },
      { status: 200 }
    );
  }

  // Proximity verified - return credentials securely
  return NextResponse.json({
    authorized: true,
    ssid: wifiNetwork.ssid,
    password: wifiNetwork.password,
    instructions: wifiNetwork.instructions || null,
    accessType: wifiNetwork.access_type || "free"
  });
}
