import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { haversineKm } from "@/lib/place-utils";

// Max check-in distance: 100 meters (with slight 25m GPS tolerance buffer for mobile accuracy = 125m)
const MAX_CHECKIN_DISTANCE_METERS = 125;

const checkInSchema = z.object({
  userLat: z.number().min(-90).max(90),
  userLng: z.number().min(-180).max(180),
  venueLat: z.number().min(-90).max(90),
  venueLng: z.number().min(-180).max(180),
  venueId: z.string().min(1),
  venueName: z.string().min(1)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = checkInSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid check-in parameters", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { userLat, userLng, venueLat, venueLng } = parsed.data;

    // Calculate actual distance in meters
    const distanceKm = haversineKm(
      { latitude: userLat, longitude: userLng },
      { latitude: venueLat, longitude: venueLng }
    );
    const distanceMeters = Math.round(distanceKm * 1000);

    if (distanceMeters > MAX_CHECKIN_DISTANCE_METERS) {
      return NextResponse.json({
        authorized: false,
        distanceMeters,
        maxDistanceMeters: 100,
        message: `You are ${distanceMeters}m away from the venue. Please move within 100m to check in and collect it!`
      });
    }

    return NextResponse.json({
      authorized: true,
      distanceMeters,
      maxDistanceMeters: 100,
      message: "Proximity verified! You can collect this venue."
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to verify check-in proximity" },
      { status: 500 }
    );
  }
}

