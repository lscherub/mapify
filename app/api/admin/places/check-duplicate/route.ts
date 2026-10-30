import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { checkDuplicatePlace } from "@/lib/admin-crud";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await getAuthenticatedAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, latitude, longitude, excludeId } = body;

    if (!name || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: name, latitude, longitude" },
        { status: 400 }
      );
    }

    const result = await checkDuplicatePlace(
      String(name),
      Number(latitude),
      Number(longitude),
      excludeId ? String(excludeId) : undefined
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Duplicate check error:", error);
    return NextResponse.json(
      { error: "Failed to perform duplicate check" },
      { status: 500 }
    );
  }
}

