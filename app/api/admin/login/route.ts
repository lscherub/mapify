import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim() || "";
    const password = body.password || "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase client is not configured." }, { status: 500 });
    }

    // Authenticate with Supabase Auth
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Verify administrator authorization
    const adminSession = await getAuthenticatedAdmin();
    if (!adminSession) {
      // User is authenticated in Supabase but NOT an active administrator
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Access denied. This account is not an authorized administrator." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      admin: {
        email: adminSession.admin.email,
        role: adminSession.admin.role
      }
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json({ error: "An unexpected error occurred during login." }, { status: 500 });
  }
}
