import { NextResponse } from "next/server";
import { exportPlacesToCsv, fetchAdminPlaces } from "@/lib/admin-crud";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";

export async function GET() {
  const adminSession = await getAuthenticatedAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const places = await fetchAdminPlaces();
  const csv = exportPlacesToCsv(places);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mapify-locations.csv"'
    }
  });
}
