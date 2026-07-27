import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const client = createSupabaseAdminClient();
  if (!client) {
    return Response.json({ error: "Missing Supabase service role key" }, { status: 500 });
  }

  const { data, error } = await client.from("places").select("*").order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ places: data ?? [] });
}
