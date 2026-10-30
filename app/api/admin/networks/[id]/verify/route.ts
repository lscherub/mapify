import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { verifyWifiNetwork } from "@/lib/admin-crud";
import type { WifiVerificationStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ id: string }>;
};

const VALID_STATUSES: WifiVerificationStatus[] = [
  "unverified",
  "pending",
  "verified",
  "rejected",
  "expired"
];

export async function POST(request: NextRequest, { params }: Params) {
  const adminSession = await getAuthenticatedAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const verifiedBy = adminSession.admin.email || adminSession.user.email || "Admin";

    await verifyWifiNetwork(id, {
      status,
      notes: notes || null,
      verifiedBy
    });

    return NextResponse.json({ success: true, message: `Network marked as ${status}` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update verification status" }, { status: 500 });
  }
}

