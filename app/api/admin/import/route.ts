import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const client = createSupabaseAdminClient();
  if (!client) {
    return Response.json({ error: "Missing Supabase service role key" }, { status: 500 });
  }

  return Response.json(
    {
      ok: false,
      message: "CSV import is scaffolded. Wire this route to your upload parser and admin auth next."
    },
    { status: 501 }
  );
}
