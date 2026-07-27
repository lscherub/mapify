import { ImportCard } from "@/components/admin/import-card";
import { PlacesTable } from "@/components/admin/places-table";
import { StatCard } from "@/components/admin/stat-card";
import { AdminHeader } from "@/components/admin/admin-header";
import { type Place } from "@/lib/types";

type Props = {
  places: Place[];
};

export function AdminPanel({ places }: Props) {
  const wifiCount = places.filter((place) => place.hasWifi).length;
  const freeCount = places.filter((place) => place.wifiFree).length;
  const verifiedCount = places.filter((place) => Boolean(place.verifiedAt)).length;

  return (
    <main className="min-h-dvh bg-background px-4 py-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <AdminHeader
          title="Mapify Admin"
          description="Review places, prep imports, and wire up management tools. This scaffold is ready for auth and CRUD next."
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Places" value={String(places.length)} detail="Publicly visible place records" tone="accent" />
          <StatCard label="WiFi spots" value={String(wifiCount)} detail="Places with WiFi enabled" tone="success" />
          <StatCard label="Free WiFi" value={String(freeCount)} detail="Places marked as free or guest accessible" tone="default" />
          <StatCard label="Verified" value={String(verifiedCount)} detail="Records with a verification date" tone="warning" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
          <PlacesTable places={places} />
          <div className="space-y-6">
            <ImportCard />
            <div className="rounded-[2rem] border border-border bg-card p-5">
              <h2 className="text-lg font-semibold">Next admin steps</h2>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li>Connect auth to protect this route.</li>
                <li>Add create/edit/delete forms for places and WiFi networks.</li>
                <li>Connect CSV import to a secure server action or API route.</li>
                <li>Add photo uploads and verification workflows.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
