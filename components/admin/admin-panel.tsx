"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Archive,
  Download,
  Edit3,
  ExternalLink,
  FileUp,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Undo2,
  Wifi,
  WifiOff
} from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/admin-header";
import { StatCard } from "@/components/admin/stat-card";
import { AddLocationDialog } from "@/components/admin/add-location-dialog";
import { EditLocationDialog } from "@/components/admin/edit-location-dialog";
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type Place } from "@/lib/types";
import { type AdminProfile } from "@/lib/admin-auth";

type Props = {
  places: Place[];
  admin?: AdminProfile;
};

export function AdminPanel({ places: initialPlaces, admin }: Props) {
  const [places, setPlaces] = useState<Place[]>(initialPlaces);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "unverified" | "archived">("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [deletingPlace, setDeletingPlace] = useState<Place | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered places calculation
  const filteredPlaces = useMemo(() => {
    let list = places;

    // Status filter
    if (statusFilter === "archived") {
      list = list.filter((p) => p.isArchived);
    } else if (statusFilter === "verified") {
      list = list.filter((p) => !p.isArchived && Boolean(p.verifiedAt));
    } else if (statusFilter === "unverified") {
      list = list.filter((p) => !p.isArchived && !p.verifiedAt);
    } else {
      // 'all' shows all active places (plus archived if explicitly searching)
      list = list.filter((p) => !p.isArchived);
    }

    // Search query
    const val = query.trim().toLowerCase();
    if (!val) return list;

    return list.filter((place) =>
      [place.name, place.category, place.address, place.city, place.slug]
        .filter(Boolean)
        .some((entry) => entry.toLowerCase().includes(val))
    );
  }, [places, query, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const activePlaces = places.filter((p) => !p.isArchived);
    return {
      total: activePlaces.length,
      wifi: activePlaces.filter((p) => p.hasWifi || p.wifiNetworks.length > 0).length,
      verified: activePlaces.filter((p) => Boolean(p.verifiedAt)).length,
      unverified: activePlaces.filter((p) => !p.verifiedAt).length,
      archived: places.filter((p) => p.isArchived).length
    };
  }, [places]);

  // Archive / Soft Delete location
  const handleArchive = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/places/${id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: true })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to archive location");

      setPlaces(data.places || []);
      toast.success("Location archived and hidden from public search.");
    } catch (err: any) {
      toast.error(err.message || "Failed to archive location");
    }
  };

  // Restore / Unarchive location
  const handleRestore = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/places/${id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: false })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to restore location");

      setPlaces(data.places || []);
      toast.success("Location restored to public directory.");
    } catch (err: any) {
      toast.error(err.message || "Failed to restore location");
    }
  };

  // Permanent Delete
  const handlePermanentDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/places/${id}?permanent=true`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete location");

      setPlaces(data.places || []);
      toast.success("Location and associated records permanently deleted.");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete location");
    }
  };

  // Export CSV
  const handleExportCsv = async () => {
    try {
      const response = await fetch("/api/admin/export");
      if (!response.ok) throw new Error("Unable to export CSV");

      const csv = await response.text();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mapify-locations-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to export CSV");
    }
  };

  // Import CSV
  const handleImportCsv = async (file?: File | null) => {
    if (!file) return;
    setImporting(true);
    try {
      const csv = await file.text();
      const response = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "text/csv; charset=utf-8" },
        body: csv
      });
      const payload = (await response.json()) as { places?: Place[]; imported?: number; error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to import CSV");

      setPlaces(payload.places || []);
      toast.success(`Imported ${payload.imported || 0} locations`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to import CSV");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <main className="min-h-dvh bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <AdminHeader
          title="Location Management & Wi-Fi"
          description="Manage verified venues, multi-network Wi-Fi access, amenity tags, and discovery."
          admin={admin}
        />

        {/* Stats Section */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Active Places"
            value={String(stats.total)}
            detail="Publicly visible records"
            tone="accent"
          />
          <StatCard
            label="Wi-Fi Venues"
            value={String(stats.wifi)}
            detail="With registered networks"
            tone="success"
          />
          <StatCard
            label="Verified"
            value={String(stats.verified)}
            detail="Admin-verified credentials"
            tone="default"
          />
          <StatCard
            label="Archived"
            value={String(stats.archived)}
            detail="Hidden from public search"
            tone="warning"
          />
        </section>

        {/* Main Content Card */}
        <section className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
          {/* Action Toolbar */}
          <div className="flex flex-col gap-4 border-b border-border p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Venues & Networks</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Showing {filteredPlaces.length} locations
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter locations..."
                  className="pl-10 rounded-2xl h-10 text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => setAddDialogOpen(true)}
                  className="rounded-2xl gap-1.5 h-10 px-4 text-xs font-semibold shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Location
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportCsv}
                  className="rounded-2xl gap-1.5 h-10 text-xs"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="rounded-2xl gap-1.5 h-10 text-xs"
                >
                  <FileUp className="h-4 w-4" />
                  {importing ? "Importing..." : "Import CSV"}
                </Button>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-border bg-secondary/20 px-5 overflow-x-auto">
            {(
              [
                { key: "all", label: "All Active Places", count: stats.total },
                { key: "verified", label: "Verified Wi-Fi", count: stats.verified },
                { key: "unverified", label: "Unverified", count: stats.unverified },
                { key: "archived", label: "Archived", count: stats.archived }
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold whitespace-nowrap transition ${
                  statusFilter === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Places Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-border bg-secondary/10 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5">Venue</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Address</th>
                  <th className="px-5 py-3.5">Wi-Fi Networks</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPlaces.map((place) => {
                  const activeNetworks = place.wifiNetworks.filter((n) => n.isActive !== false);

                  return (
                    <tr
                      key={place.id}
                      className={`hover:bg-secondary/30 transition ${
                        place.isArchived ? "opacity-60 bg-secondary/10" : ""
                      }`}
                    >
                      {/* Name & Slug */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                          {place.name}
                          {place.isArchived && (
                            <Badge variant="warning" className="text-[9px] py-0 px-1.5">
                              Archived
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{place.slug}</div>
                      </td>

                      {/* Category */}
                      <td className="px-5 py-4">
                        <Badge variant="default" className="text-[11px] font-medium">
                          {place.category}
                        </Badge>
                      </td>

                      {/* Address & City */}
                      <td className="px-5 py-4 text-xs text-muted-foreground">
                        <div className="text-foreground">{place.address}</div>
                        <div>{place.city}</div>
                      </td>

                      {/* Wi-Fi Networks */}
                      <td className="px-5 py-4">
                        {activeNetworks.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {activeNetworks.map((net) => (
                              <Badge
                                key={net.id}
                                variant={net.isPrimary ? "success" : "default"}
                                className="text-[10px] py-0 px-2 font-normal"
                              >
                                {net.isPrimary ? "★ " : ""}
                                {net.ssid}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/80 flex items-center gap-1">
                            <WifiOff className="h-3 w-3" /> No registered Wi-Fi
                          </span>
                        )}
                      </td>

                      {/* Verification Status */}
                      <td className="px-5 py-4">
                        {place.verifiedAt ? (
                          <div>
                            <Badge variant="success" className="text-[10px] py-0 px-2">
                              Verified
                            </Badge>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {place.verifiedAt}
                            </div>
                          </div>
                        ) : (
                          <Badge variant="warning" className="text-[10px] py-0 px-2">
                            Unverified
                          </Badge>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingPlace(place)}
                            className="rounded-xl h-8 px-2.5 text-xs gap-1"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </Button>

                          {place.isArchived ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestore(place.id)}
                              className="rounded-xl h-8 px-2.5 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                              title="Restore to public directory"
                            >
                              <Undo2 className="h-3.5 w-3.5" />
                              Restore
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingPlace(place)}
                              className="rounded-xl h-8 px-2.5 text-xs gap-1 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                              title="Archive or delete venue"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </Button>
                          )}

                          <Link
                            href={`/?place=${place.slug}`}
                            target="_blank"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition"
                            title="Preview on public map"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredPlaces.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-xs text-muted-foreground">
                      No locations found matching your filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Hidden CSV file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => handleImportCsv(e.target.files?.[0])}
      />

      {/* Add Location Wizard Dialog */}
      <AddLocationDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSuccess={(updated) => setPlaces(updated)}
      />

      {/* Edit Location Dialog */}
      <EditLocationDialog
        place={editingPlace}
        open={Boolean(editingPlace)}
        onClose={() => setEditingPlace(null)}
        onSuccess={(updated) => setPlaces(updated)}
      />

      {/* Safe Deletion / Archival Confirmation Dialog */}
      {deletingPlace && (
        <DeleteConfirmDialog
          place={deletingPlace}
          open={Boolean(deletingPlace)}
          onClose={() => setDeletingPlace(null)}
          onArchive={handleArchive}
          onPermanentDelete={handlePermanentDelete}
        />
      )}
    </main>
  );
}
