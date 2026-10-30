import { NextResponse, type NextRequest } from "next/server";
import { archiveAdminPlace, unarchiveAdminPlace, fetchAdminPlaces } from "@/lib/admin-crud";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";

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
    const shouldArchive = body.archive !== false; // default true if not specified

    if (shouldArchive) {
      await archiveAdminPlace(id);
    } else {
      await unarchiveAdminPlace(id);
    }

    const places = await fetchAdminPlaces();
    return NextResponse.json({
      places,
      message: shouldArchive ? "Location archived" : "Location restored"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to toggle archival state";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

