import { NextResponse } from "next/server";
import { readAdminSessionFromCookies } from "@/lib/admin-auth";

export async function GET() {
  const username = await readAdminSessionFromCookies();
  if (!username) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true, username });
}
