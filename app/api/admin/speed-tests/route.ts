import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { fetchWifiSpeedTests, recordWifiSpeedTest } from "@/lib/admin-crud";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const adminSession = await getAuthenticatedAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId") || undefined;
  const wifiNetworkId = searchParams.get("wifiNetworkId") || undefined;
  const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;

  try {
    const tests = await fetchWifiSpeedTests({ placeId, wifiNetworkId, limit });
    return NextResponse.json({ tests });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch speed tests" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const adminSession = await getAuthenticatedAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { placeId, wifiNetworkId, downloadMbps, uploadMbps, latencyMs, jitterMs, notes, isApprovedForPublic } = body;

    if (!placeId || !wifiNetworkId) {
      return NextResponse.json({ error: "placeId and wifiNetworkId are required" }, { status: 400 });
    }
    if (typeof downloadMbps !== "number" || typeof uploadMbps !== "number" || typeof latencyMs !== "number") {
      return NextResponse.json({ error: "Valid numeric speed metrics (download, upload, latency) are required" }, { status: 400 });
    }

    const recorded = await recordWifiSpeedTest({
      placeId,
      wifiNetworkId,
      downloadMbps,
      uploadMbps,
      latencyMs,
      jitterMs: typeof jitterMs === "number" ? jitterMs : null,
      testedBy: adminSession.admin.email || adminSession.user.email || "Admin",
      notes: notes || null,
      isApprovedForPublic: isApprovedForPublic !== false
    });

    return NextResponse.json({ success: true, test: recorded });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to record speed test" }, { status: 500 });
  }
}

