import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { approveWifiSubmission } from "@/lib/admin-crud";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  const adminSession = await getAuthenticatedAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { adminNotes, targetNetworkId } = body;

    const reviewerEmail = adminSession.admin.email || adminSession.user.email || "Admin";

    await approveWifiSubmission(id, reviewerEmail, adminNotes, targetNetworkId);

    return NextResponse.json({ success: true, message: "Submission approved" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to approve submission" }, { status: 500 });
  }
}

