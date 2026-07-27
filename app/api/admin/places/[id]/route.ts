import { NextResponse } from "next/server";
import { deleteAdminPlace, fetchAdminPlaces, updateAdminPlace } from "@/lib/admin-crud";
import { adminPlaceSchema } from "@/lib/admin-places";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { values?: unknown };
    const values = adminPlaceSchema.parse(body.values);
    await updateAdminPlace(id, values);
    const places = await fetchAdminPlaces();
    return NextResponse.json({ places });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update location";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    await deleteAdminPlace(id);
    const places = await fetchAdminPlaces();
    return NextResponse.json({ places });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete location";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
