import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { submissionIds } = body;

    if (!Array.isArray(submissionIds) || !submissionIds.length) {
      return NextResponse.json({ submissions: [] });
    }

    // Limit query to at most 50 IDs
    const safeIds = submissionIds.slice(0, 50).filter((id) => typeof id === "string" && id.length > 5);

    const client = createSupabaseAdminClient();
    if (!client) {
      // In local dev without Supabase, return empty
      return NextResponse.json({ submissions: [] });
    }

    const { data, error } = await client
      .from("wifi_submissions")
      .select("id, status, reviewed_at")
      .in("id", safeIds);

    if (error || !data) {
      return NextResponse.json({ submissions: [] });
    }

    return NextResponse.json({
      submissions: data.map((row: any) => ({
        id: row.id,
        status: row.status,
        reviewedAt: row.reviewed_at
      }))
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to query submission statuses" },
      { status: 500 }
    );
  }
}

