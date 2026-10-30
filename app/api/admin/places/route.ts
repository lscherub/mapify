import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createAdminPlace, fetchAdminPlaces } from "@/lib/admin-crud";
import { adminPlaceFormSchema, adminPlaceSchema } from "@/lib/admin-places";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const adminSession = await getAuthenticatedAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") || "all") as "all" | "verified" | "unverified" | "archived";
  const query = searchParams.get("q") || undefined;

  const places = await fetchAdminPlaces({ status, query });
  return NextResponse.json({ places });
}

export async function POST(request: NextRequest) {
  const adminSession = await getAuthenticatedAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = createSupabaseAdminClient();
  if (!client) {
    return NextResponse.json({ error: "Missing Supabase service role key" }, { status: 500 });
  }

  try {
    const body = (await request.json()) as { values?: unknown };
    if (!body.values || typeof body.values !== "object") {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    // Attempt multi-network form schema first, fallback to legacy
    let values;
    const formResult = adminPlaceFormSchema.safeParse(body.values);
    if (formResult.success) {
      values = formResult.data;
    } else {
      values = adminPlaceSchema.parse(body.values);
    }

    const created = await createAdminPlace(values);
    const places = await fetchAdminPlaces();
    return NextResponse.json({ places, place: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create location";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
