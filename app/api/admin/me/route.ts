import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";

export async function GET() {
  const session = await getAuthenticatedAdmin();

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.user.id,
      email: session.user.email
    },
    admin: {
      id: session.admin.id,
      email: session.admin.email,
      role: session.admin.role,
      isActive: session.admin.isActive
    }
  });
}
