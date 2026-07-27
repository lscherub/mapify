import Link from "next/link";
import { ExternalLink, MapPin, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { type Place } from "@/lib/types";

type Props = {
  places: Place[];
};

export function PlacesTable({ places }: Props) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-lg font-semibold">Places</h2>
        <p className="mt-1 text-sm text-muted-foreground">Public read data that will later be editable in the admin dashboard.</p>
      </div>

      <div className="divide-y divide-border">
        {places.map((place) => (
          <div key={place.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1.8fr_1fr_1fr_auto] lg:items-center">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{place.name}</h3>
                {place.hasWifi ? <Wifi className="h-4 w-4 text-blue-500" /> : null}
              </div>
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {place.address}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="default">{place.category}</Badge>
              <Badge variant={place.wifiFree ? "success" : "warning"}>{place.wifiFree ? "Free" : "Paid"}</Badge>
            </div>

            <div className="text-sm text-muted-foreground">
              {place.verifiedAt ? `Verified ${place.verifiedAt}` : "Not verified yet"}
            </div>

            <div className="flex justify-start lg:justify-end">
              <Link
                href={`/?place=${place.slug}`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium transition hover:bg-secondary/50"
              >
                Preview
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
