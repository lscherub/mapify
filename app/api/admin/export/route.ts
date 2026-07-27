import { NextResponse } from "next/server";
import { exportPlacesToCsv, fetchAdminPlaces } from "@/lib/admin-crud";

export async function GET() {
  const places = await fetchAdminPlaces();
  const csv = exportPlacesToCsv(places);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mapify-locations.csv"'
    }
  });
}
