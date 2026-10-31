import { NextRequest, NextResponse } from "next/server";
import { fetchNearbyExplorerPlaces } from "@/lib/osm";
import { getPlaces } from "@/lib/data";
import { haversineKm } from "@/lib/place-utils";
import { type Place } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latStr = searchParams.get("lat");
    const lngStr = searchParams.get("lng");
    const radiusStr = searchParams.get("radius");
    const bboxStr = searchParams.get("bbox");

    let lat = latStr ? parseFloat(latStr) : null;
    let lng = lngStr ? parseFloat(lngStr) : null;
    const radius = radiusStr ? parseInt(radiusStr, 10) : 2000;

    let bounds: { west: number; south: number; east: number; north: number } | undefined;

    if (bboxStr) {
      const parts = bboxStr.split(",").map(Number);
      if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
        bounds = {
          west: parts[0],
          south: parts[1],
          east: parts[2],
          north: parts[3]
        };
        if (lat === null || lng === null) {
          lat = (bounds.south + bounds.north) / 2;
          lng = (bounds.west + bounds.east) / 2;
        }
      }
    }

    if (lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ places: [], total: 0, externalCount: 0 });
    }

    // 1. Fetch real-world external POIs around this location
    const externalPlaces = await fetchNearbyExplorerPlaces({
      latitude: lat,
      longitude: lng,
      radiusMeters: radius,
      bounds
    });

    // 2. Fetch existing canonical Mapify database places to cross-reference
    let dbPlaces: Place[] = [];
    try {
      dbPlaces = await getPlaces();
    } catch {
      dbPlaces = [];
    }

    // 3. Cross-reference external POIs with canonical database places to avoid duplicates
    // If an external POI is already in Mapify, link it to the canonical database entry
    const mergedPlaces: Place[] = [];
    const matchedDbIds = new Set<string>();

    for (const ext of externalPlaces) {
      const extName = ext.name.toLowerCase().trim();

      // Check proximity <= 45m and name overlap with existing DB places
      const dbMatch = dbPlaces.find((db) => {
        const distKm = haversineKm(
          { latitude: ext.latitude, longitude: ext.longitude },
          { latitude: db.latitude, longitude: db.longitude }
        );
        const distMeters = distKm * 1000;
        if (distMeters > 45) return false;

        const dbName = db.name.toLowerCase().trim();
        return (
          extName === dbName ||
          (extName.length > 3 && (dbName.includes(extName) || extName.includes(dbName)))
        );
      });

      if (dbMatch) {
        matchedDbIds.add(dbMatch.id);
        mergedPlaces.push({
          ...dbMatch,
          distanceKm: haversineKm({ latitude: lat, longitude: lng }, dbMatch)
        });
      } else {
        mergedPlaces.push(ext);
      }
    }

    // Also include any nearby DB places within range that weren't caught in the external query
    for (const db of dbPlaces) {
      if (matchedDbIds.has(db.id)) continue;
      const distKm = haversineKm({ latitude: lat, longitude: lng }, db);
      if (distKm * 1000 <= radius * 1.2) {
        mergedPlaces.push({
          ...db,
          distanceKm: distKm
        });
      }
    }

    // Sort closest first
    mergedPlaces.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

    const externalCount = mergedPlaces.filter((p) => p.source === "osm").length;

    return NextResponse.json({
      places: mergedPlaces,
      total: mergedPlaces.length,
      externalCount
    });
  } catch (error: any) {
    console.error("Explorer discovery error:", error);
    return NextResponse.json(
      { places: [], total: 0, externalCount: 0, error: error.message || "Discovery error" },
      { status: 500 }
    );
  }
}

