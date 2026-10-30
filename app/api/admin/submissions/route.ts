import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { fetchAdminSubmissions } from "@/lib/admin-crud";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const adminSession = await getAuthenticatedAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") || "all") as "all" | "pending" | "approved" | "rejected";

  try {
    const submissions = await fetchAdminSubmissions(status);
    return NextResponse.json({ submissions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch submissions" }, { status: 500 });
  }
}

