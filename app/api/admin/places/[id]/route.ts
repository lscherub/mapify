import { NextResponse, type NextRequest } from "next/server";
import { deleteAdminPlace, fetchAdminPlaces, updateAdminPlace } from "@/lib/admin-crud";
import { adminPlaceFormSchema, adminPlaceSchema } from "@/lib/admin-places";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const adminSession = await getAuthenticatedAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as { values?: unknown };
    if (!body.values || typeof body.values !== "object") {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    let values;
    const formResult = adminPlaceFormSchema.safeParse(body.values);
    if (formResult.success) {
      values = formResult.data;
    } else {
      values = adminPlaceSchema.parse(body.values);
    }

    const updated = await updateAdminPlace(id, values);
    const places = await fetchAdminPlaces();
    return NextResponse.json({ places, place: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update location";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const adminSession = await getAuthenticatedAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get("permanent") === "true";

    await deleteAdminPlace(id, permanent);
    const places = await fetchAdminPlaces();
    return NextResponse.json({
      places,
      message: permanent ? "Location permanently deleted" : "Location archived"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete location";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
