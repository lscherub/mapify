"use client";

import { useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import {
  Download,
  Edit3,
  FileUp,
  LogOut,
  Plus,
  Save,
  Search,
  Trash2,
  X
} from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/admin-header";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emptyAdminValues, placeToAdminValues, type AdminPlaceValues } from "@/lib/admin-places";
import { type Place } from "@/lib/types";

type Props = {
  initialPlaces: Place[];
  routeSlug: string;
  username: string;
};

export function AdminDashboard({ initialPlaces, routeSlug, username }: Props) {
  const [places, setPlaces] = useState(initialPlaces);
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdminPlaceValues>(emptyAdminValues());
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredPlaces = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return places;

    return places.filter((place) =>
      [place.name, place.category, place.address, place.city, place.slug]
        .filter(Boolean)
        .some((entry) => entry.toLowerCase().includes(value))
    );
  }, [places, query]);

  const stats = useMemo(
    () => ({
      total: places.length,
      wifi: places.filter((place) => place.hasWifi).length,
      free: places.filter((place) => place.wifiFree).length,
      verified: places.filter((place) => Boolean(place.verifiedAt)).length
    }),
    [places]
  );

  const openCreate = () => {
    setEditingId(null);
    setDraft({
      ...emptyAdminValues(),
      slug: `new-location-${Date.now().toString(36)}`
    });
    setDrawerOpen(true);
  };

  const openEdit = (place: Place) => {
    setEditingId(place.id);
    setDraft(placeToAdminValues(place));
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingId(null);
  };

  const refreshPlaces = async (nextPlaces: Place[]) => {
    setPlaces(nextPlaces);
    setQuery("");
    closeDrawer();
  };

  const saveLocation = async () => {
    setSaving(true);
    try {
      const response = await fetch(editingId ? `/api/admin/places/${editingId}` : "/api/admin/places", {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ values: draft })
      });

      const payload = (await response.json()) as { places?: Place[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save location");
      }

      await refreshPlaces(payload.places ?? []);
      toast.success(editingId ? "Location updated" : "Location created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save location");
    } finally {
      setSaving(false);
    }
  };

  const deleteLocation = async (id: string, name: string) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;

    try {
      const response = await fetch(`/api/admin/places/${id}`, { method: "DELETE" });
      const payload = (await response.json()) as { places?: Place[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to delete location");
      }

      setPlaces(payload.places ?? []);
      toast.success("Location deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete location");
    }
  };

  const exportCsv = async () => {
    try {
      const response = await fetch("/api/admin/export");
      if (!response.ok) throw new Error("Unable to export CSV");

      const csv = await response.text();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "mapify-locations.csv";
      link.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to export CSV");
    }
  };

  const importCsv = async (file?: File | null) => {
    if (!file) return;

    setImporting(true);
    try {
      const csv = await file.text();
      const response = await fetch("/api/admin/import", {
        method: "POST",
        headers: {
          "Content-Type": "text/csv; charset=utf-8"
        },
        body: csv
      });

      const payload = (await response.json()) as { places?: Place[]; imported?: number; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to import CSV");
      }

      setPlaces(payload.places ?? []);
      toast.success(`Imported ${payload.imported ?? 0} locations`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to import CSV");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  };

  return (
    <main className="min-h-dvh bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <AdminHeader
          title="Mapify Admin"
          description={`Hidden route ${routeSlug}. Signed in as ${username}. Manage locations, CSV imports, and export snapshots from one place.`}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Places" value={String(stats.total)} detail="All public place records" tone="accent" />
          <StatCard label="Wi-Fi spots" value={String(stats.wifi)} detail="Locations with Wi-Fi enabled" tone="success" />
          <StatCard label="Free Wi-Fi" value={String(stats.free)} detail="Guest or free Wi-Fi" tone="default" />
          <StatCard label="Verified" value={String(stats.verified)} detail="Records with verification dates" tone="warning" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="rounded-[2rem] border border-border bg-card shadow-sm">
            <div className="flex flex-col gap-4 border-b border-border p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Locations</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create, edit, delete, search, and export locations. CSV import is available too.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search locations"
                    className="pl-11"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={openCreate}>
                    <Plus className="h-4 w-4" />
                    Add Location
                  </Button>
                  <Button type="button" variant="outline" onClick={exportCsv}>
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                  >
                    <FileUp className="h-4 w-4" />
                    {importing ? "Importing..." : "Import CSV"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={logout}>
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th className="px-5 py-4 font-medium">Name</th>
                    <th className="px-5 py-4 font-medium">Category</th>
                    <th className="px-5 py-4 font-medium">Address</th>
                    <th className="px-5 py-4 font-medium">Wi-Fi</th>
                    <th className="px-5 py-4 font-medium">Source</th>
                    <th className="px-5 py-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlaces.map((place) => (
                    <tr key={place.id} className="border-b border-border/70 last:border-b-0">
                      <td className="px-5 py-4">
                        <div className="font-medium">{place.name}</div>
                        <div className="text-xs text-muted-foreground">{place.slug}</div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="default">{place.category}</Badge>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        <div>{place.address}</div>
                        <div className="text-xs">{place.city}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={place.hasWifi ? "success" : "warning"}>{place.hasWifi ? "Wi-Fi" : "No Wi-Fi"}</Badge>
                          <Badge variant={place.wifiFree ? "success" : "default"}>{place.wifiFree ? "Free" : "Paid"}</Badge>
                        </div>
                        <p className="mt-2 max-w-sm text-xs text-muted-foreground">
                          {place.wifiMessage ?? "Wi-Fi details available"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={place.source === "osm" ? "accent" : "default"}>
                          {place.source === "osm" ? "OpenStreetMap" : "Database"}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => openEdit(place)}>
                            <Edit3 className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button type="button" variant="destructive" size="sm" onClick={() => deleteLocation(place.id, place.name)}>
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!filteredPlaces.length ? (
                    <tr>
                      <td className="px-5 py-10 text-sm text-muted-foreground" colSpan={6}>
                        No locations match your search.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
              <h3 className="text-lg font-semibold">Workflow</h3>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <p>1. Add or edit places directly in the form drawer.</p>
                <p>2. Import or export CSV snapshots for bulk updates.</p>
                <p>3. Review source badges to see database vs OpenStreetMap content.</p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
              <h3 className="text-lg font-semibold">Admin access</h3>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <p>Hidden route: <span className="font-medium text-foreground">{`/${routeSlug}`}</span></p>
                <p>User: <span className="font-medium text-foreground">{username}</span></p>
                <p>Keep the credentials offline once you save them.</p>
              </div>
            </div>
          </aside>
        </section>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => importCsv(event.target.files?.[0])}
      />

      {drawerOpen ? (
        <LocationDrawer
          draft={draft}
          setDraft={setDraft}
          saving={saving}
          onClose={closeDrawer}
          onSave={saveLocation}
          editing={editingId !== null}
        />
      ) : null}
    </main>
  );
}

type DrawerProps = {
  draft: AdminPlaceValues;
  setDraft: Dispatch<SetStateAction<AdminPlaceValues>>;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  editing: boolean;
};

function LocationDrawer({ draft, setDraft, saving, onClose, onSave, editing }: DrawerProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-3 backdrop-blur-sm sm:p-6">
      <div className="mx-auto flex h-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {editing ? "Edit location" : "Add location"}
            </p>
            <h2 className="text-xl font-semibold tracking-tight">
              {editing ? "Update location details" : "Create a new location"}
            </h2>
          </div>

          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid flex-1 gap-6 overflow-y-auto p-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <Field label="Slug" helper="Unique URL-safe identifier.">
              <Input value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} />
            </Field>
            <Field label="Name">
              <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </Field>
            <Field label="Category">
              <Input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Latitude">
                <Input
                  type="number"
                  step="any"
                  value={draft.latitude}
                  onChange={(event) => setDraft({ ...draft, latitude: Number(event.target.value) })}
                />
              </Field>
              <Field label="Longitude">
                <Input
                  type="number"
                  step="any"
                  value={draft.longitude}
                  onChange={(event) => setDraft({ ...draft, longitude: Number(event.target.value) })}
                />
              </Field>
            </div>
            <Field label="Address">
              <Input value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} />
            </Field>
            <Field label="City">
              <Input value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })} />
            </Field>
            <Field label="Website">
              <Input value={draft.website} onChange={(event) => setDraft({ ...draft, website: event.target.value })} />
            </Field>
            <Field label="Phone">
              <Input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
            </Field>
            <Field label="Notes">
              <textarea
                value={draft.notes}
                onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                className="min-h-28 w-full rounded-3xl border border-border bg-background px-4 py-3 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </Field>
            <Field label="Hours">
              <Input value={draft.hours} onChange={(event) => setDraft({ ...draft, hours: event.target.value })} />
            </Field>
          </div>

          <div className="space-y-4">
            <CardSection title="Wi-Fi details">
              <Toggle
                label="Wi-Fi available"
                checked={draft.hasWifi}
                onToggle={() => setDraft({ ...draft, hasWifi: !draft.hasWifi })}
              />
              <Toggle
                label="Free Wi-Fi"
                checked={draft.wifiFree}
                onToggle={() => setDraft({ ...draft, wifiFree: !draft.wifiFree })}
              />
              <Field label="Wi-Fi SSID">
                <Input value={draft.wifiSsid} onChange={(event) => setDraft({ ...draft, wifiSsid: event.target.value })} />
              </Field>
              <Field label="Wi-Fi Password">
                <Input
                  value={draft.wifiPassword}
                  onChange={(event) => setDraft({ ...draft, wifiPassword: event.target.value })}
                />
              </Field>
              <Field label="Verified by">
                <Input
                  value={draft.verifiedBy}
                  onChange={(event) => setDraft({ ...draft, verifiedBy: event.target.value })}
                />
              </Field>
              <Field label="Verified at">
                <Input
                  value={draft.verifiedAt}
                  onChange={(event) => setDraft({ ...draft, verifiedAt: event.target.value })}
                />
              </Field>
            </CardSection>

            <CardSection title="Amenities">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["powerOutlets", "Power outlets"],
                  ["laptopFriendly", "Laptop friendly"],
                  ["quiet", "Quiet"],
                  ["restrooms", "Restrooms"],
                  ["outdoorSeating", "Outdoor seating"],
                  ["airConditioning", "Air conditioning"],
                  ["wheelchairAccessible", "Wheelchair accessible"],
                  ["foodAvailable", "Food available"],
                  ["coffeeAvailable", "Coffee available"]
                ].map(([key, label]) => (
                  <Toggle
                    key={key}
                    label={label}
                    checked={draft[key as keyof AdminPlaceValues] as boolean}
                    onToggle={() =>
                      setDraft({
                        ...draft,
                        [key]: !(draft[key as keyof AdminPlaceValues] as boolean)
                      })
                    }
                  />
                ))}
              </div>
            </CardSection>

            <CardSection title="Preview">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>{draft.name || "Untitled location"}</p>
                <p>{draft.address || "Address will appear here"}</p>
                <p>{draft.city || "City"}</p>
                <p>{draft.hasWifi ? "Wi-Fi enabled" : "Wi-Fi disabled"}</p>
              </div>
            </CardSection>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={onSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save location"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  helper,
  children
}: {
  label: string;
  helper?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        {helper ? <span className="text-xs text-muted-foreground">{helper}</span> : null}
      </div>
      {children}
    </label>
  );
}

function CardSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</h3>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Toggle({
  label,
  checked,
  onToggle
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center justify-between rounded-3xl border px-4 py-3 text-left text-sm transition ${
        checked ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-secondary/40"
      }`}
    >
      <span>{label}</span>
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${
          checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
        }`}
      >
        {checked ? "✓" : ""}
      </span>
    </button>
  );
}
