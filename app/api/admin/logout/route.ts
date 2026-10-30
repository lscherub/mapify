import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clearAdminSessionCookie } from "@/lib/admin-auth";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      await supabase.auth.signOut();
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(clearAdminSessionCookie());
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ ok: true });
  }
}
