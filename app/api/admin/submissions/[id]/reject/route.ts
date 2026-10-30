import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { rejectWifiSubmission } from "@/lib/admin-crud";

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
    const { adminNotes } = body;

    const reviewerEmail = adminSession.admin.email || adminSession.user.email || "Admin";

    await rejectWifiSubmission(id, reviewerEmail, adminNotes);

    return NextResponse.json({ success: true, message: "Submission rejected" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to reject submission" }, { status: 500 });
  }
}

