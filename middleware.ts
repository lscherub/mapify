import { NextRequest, NextResponse } from "next/server";
import { getAdminCookieName, verifyAdminSessionEdge } from "@/lib/admin-auth-edge";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!pathname.startsWith("/api/admin")) {
    return NextResponse.next();
  }

  if (pathname === "/api/admin/login" || pathname === "/api/admin/logout") {
    return NextResponse.next();
  }

  const session = await verifyAdminSessionEdge(request.cookies.get(getAdminCookieName())?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/admin/:path*"]
};
