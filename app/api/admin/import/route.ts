import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createAdminPlace, fetchAdminPlaces, importPlacesFromCsv } from "@/lib/admin-crud";

export async function POST(request: Request) {
  const client = createSupabaseAdminClient();
  if (!client) {
    return NextResponse.json({ error: "Missing Supabase service role key" }, { status: 500 });
  }

  try {
    const csv = await request.text();
    const rows = importPlacesFromCsv(csv);

    for (const values of rows) {
      await createAdminPlace(values);
    }

    const places = await fetchAdminPlaces();
    return NextResponse.json({ imported: rows.length, places });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to import CSV";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
