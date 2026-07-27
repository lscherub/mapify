import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createAdminPlace, fetchAdminPlaces } from "@/lib/admin-crud";
import { adminPlaceSchema } from "@/lib/admin-places";

export async function GET() {
  const places = await fetchAdminPlaces();
  return NextResponse.json({ places });
}

export async function POST(request: Request) {
  const client = createSupabaseAdminClient();
  if (!client) {
    return NextResponse.json({ error: "Missing Supabase service role key" }, { status: 500 });
  }

  try {
    const body = (await request.json()) as { values?: unknown };
    const values = adminPlaceSchema.parse(body.values);
    await createAdminPlace(values);
    const places = await fetchAdminPlaces();
    return NextResponse.json({ places }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create location";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
