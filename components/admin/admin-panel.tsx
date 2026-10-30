"use client";

import { PlacesTable } from "@/components/admin/places-table";
import { StatCard } from "@/components/admin/stat-card";
import { AdminHeader } from "@/components/admin/admin-header";
import { type Place } from "@/lib/types";
import { type AdminProfile } from "@/lib/admin-auth";

type Props = {
  places: Place[];
  admin?: AdminProfile;
};

export function AdminPanel({ places, admin }: Props) {
  const wifiCount = places.filter((place) => place.hasWifi).length;
  const freeCount = places.filter((place) => place.wifiFree).length;
  const verifiedCount = places.filter((place) => Boolean(place.verifiedAt)).length;

  return (
    <main className="min-h-dvh bg-background px-4 py-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <AdminHeader
          title="Overview & Locations"
          description="Manage verified places, monitor Wi-Fi coverage, and review community submissions."
          admin={admin}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Places" value={String(places.length)} detail="Visible place records" tone="accent" />
          <StatCard label="Wi-Fi Spots" value={String(wifiCount)} detail="Venues with Wi-Fi registered" tone="success" />
          <StatCard label="Free Wi-Fi" value={String(freeCount)} detail="Open or complimentary access" tone="default" />
          <StatCard label="Verified" value={String(verifiedCount)} detail="Records with admin verification" tone="warning" />
        </section>

        <section className="grid gap-6">
          <PlacesTable places={places} />
        </section>
      </div>
    </main>
  );
}
