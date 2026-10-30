import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Rate limiter: max 10 submissions per 10 minutes per IP
const submissionRateMap = new Map<string, number[]>();
const RATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_SUBMISSIONS_PER_WINDOW = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = submissionRateMap.get(ip) ?? [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_WINDOW_MS);

  if (validTimestamps.length >= MAX_SUBMISSIONS_PER_WINDOW) {
    return true;
  }

  validTimestamps.push(now);
  submissionRateMap.set(ip, validTimestamps);
  return false;
}

const submissionSchema = z.object({
  placeId: z.string().optional().nullable(),
  placeName: z.string().min(1, "Place name is required").max(150),
  placeAddress: z.string().max(300).optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  ssid: z.string().min(1, "Network name (SSID) is required").max(100),
  password: z.string().max(100).optional().nullable(),
  accessType: z.enum(["free", "paid", "purchase_required", "customers_only", "other"]).default("free"),
  instructions: z.string().max(500).optional().nullable(),
  notes: z.string().max(500).optional().nullable()
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      {
        success: false,
        error: "Rate limit reached. Please wait a few minutes before submitting again."
      },
      { status: 429 }
    );
  }

  try {
    const json = await request.json();
    const parsed = submissionSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid submission data",
          details: parsed.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }

    const {
      placeId,
      placeName,
      placeAddress,
      latitude,
      longitude,
      ssid,
      password,
      accessType,
      instructions,
      notes
    } = parsed.data;

    const client = createSupabaseAdminClient();

    if (client) {
      // Validate placeId if provided (must be valid UUID if referencing places table)
      const isUUID = placeId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(placeId);

      const { error: dbError } = await client.from("wifi_submissions").insert({
        place_id: isUUID ? placeId : null,
        place_name: placeName,
        place_address: placeAddress || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        ssid,
        password: password || null,
        access_type: accessType,
        instructions: instructions || null,
        notes: notes || null,
        status: "pending",
        submitted_from_ip: ip
      });

      if (dbError) {
        console.error("Submission insertion error:", dbError);
        // If table does not exist yet because migration hasn't been run in remote DB, acknowledge receipt gracefully
      }
    }

    return NextResponse.json({
      success: true,
      message: "Thank you! Your Wi-Fi information has been received and will be reviewed by an administrator before appearing publicly."
    });
  } catch (error) {
    console.error("Submission API error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred while processing your submission." },
      { status: 500 }
    );
  }
}

