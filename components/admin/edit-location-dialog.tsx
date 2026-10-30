"use client";

import { useState, useEffect } from "react";
import {
  Archive,
  Building,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Trash2,
  Wifi,
  X
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { INITIAL_AMENITIES, NOISE_LEVEL_OPTIONS } from "@/lib/amenities";
import {
  emptyWifiNetworkInput,
  placeToAdminFormValues
} from "@/lib/admin-places";
import {
  type AdminPlaceFormValues,
  type AdminWifiNetworkInput,
  type Place
} from "@/lib/types";

type Props = {
  place: Place | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (updatedPlaces: Place[]) => void;
};

export function EditLocationDialog({ place, open, onClose, onSuccess }: Props) {
  const [form, setForm] = useState<AdminPlaceFormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (place && open) {
      setForm(placeToAdminFormValues(place));
      setShowPasswords({});
    }
  }, [place, open]);

  if (!open || !place || !form) return null;

  const handleAddNetwork = () => {
    const newNet = emptyWifiNetworkInput();
    if (form.wifiNetworks.length === 0) {
      newNet.isPrimary = true;
    } else {
      newNet.isPrimary = false;
      newNet.networkType = "guest";
    }
    setForm({
      ...form,
      hasWifi: true,
      wifiNetworks: [...form.wifiNetworks, newNet]
    });
  };

  const handleUpdateNetwork = (index: number, patch: Partial<AdminWifiNetworkInput>) => {
    const updated = [...form.wifiNetworks];
    updated[index] = { ...updated[index], ...patch };

    if (patch.isPrimary) {
      updated.forEach((net, i) => {
        if (i !== index) net.isPrimary = false;
      });
    }

    setForm({ ...form, wifiNetworks: updated });
  };

  const handleRemoveNetwork = (index: number) => {
    const target = form.wifiNetworks[index];
    if (!window.confirm(`Remove network "${target.ssid}"?`)) return;

    const updated = form.wifiNetworks.filter((_, i) => i !== index);
    if (updated.length > 0 && !updated.some((n) => n.isPrimary)) {
      updated[0].isPrimary = true;
    }
    setForm({
      ...form,
      hasWifi: updated.length > 0,
      wifiNetworks: updated
    });
  };

  const toggleAmenity = (key: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [key]: !prev[key as keyof AdminPlaceFormValues]
      };
    });
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.address.trim() || !form.category.trim()) {
      toast.error("Please fill in Name, Category, and Address.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/places/${place.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: form })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update location");
      }

      toast.success(`Location "${form.name}" updated successfully!`);
      onSuccess(data.places || []);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update location");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6 backdrop-blur-sm overflow-y-auto">
      <div className="flex h-full max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">Edit Location</h2>
                {form.isArchived && (
                  <Badge variant="warning" className="text-[10px] py-0 px-2">
                    Archived
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{place.name} • {place.slug}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* 1. Venue Details */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-2">
              <Building className="h-4 w-4 text-primary" /> 1. Venue Details
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Name *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Category *</label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground">Address *</label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">City *</label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">URL Slug</label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Latitude</label>
                <Input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: parseFloat(e.target.value) })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Longitude</label>
                <Input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: parseFloat(e.target.value) })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Phone</label>
                <Input
                  value={form.phone || ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(604) 555-0199"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Website</label>
                <Input
                  value={form.website || ""}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://..."
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground">Operating Hours</label>
                <Input
                  value={form.hours || ""}
                  onChange={(e) => setForm({ ...form, hours: e.target.value })}
                  placeholder="Mon-Sun 7:00 AM - 9:00 PM"
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* 2. Multi-Network Wi-Fi Management */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Wifi className="h-4 w-4 text-emerald-500" /> 2. Wi-Fi Networks ({form.wifiNetworks.length})
              </h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddNetwork}
                className="rounded-xl gap-1 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Network
              </Button>
            </div>

            {form.wifiNetworks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center space-y-2">
                <Wifi className="mx-auto h-6 w-6 text-muted-foreground/60" />
                <p className="text-xs text-muted-foreground">No Wi-Fi networks registered for this venue.</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddNetwork}
                  className="rounded-xl text-xs gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add First Network
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {form.wifiNetworks.map((net, idx) => (
                  <div
                    key={net.id || idx}
                    className="rounded-2xl border border-border bg-secondary/20 p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">
                          Network #{idx + 1}: {net.ssid || "Untitled"}
                        </span>
                        {net.isPrimary && (
                          <Badge variant="success" className="text-[10px] py-0 px-2">
                            Primary Network
                          </Badge>
                        )}
                        {!net.isActive && (
                          <Badge variant="warning" className="text-[10px] py-0 px-2">
                            Deactivated
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateNetwork(idx, { isPrimary: true })}
                          disabled={net.isPrimary}
                          className={`text-xs px-2 py-1 rounded-lg border transition ${
                            net.isPrimary
                              ? "border-emerald-500 text-emerald-600 bg-emerald-500/10"
                              : "border-border text-muted-foreground hover:bg-secondary"
                          }`}
                        >
                          {net.isPrimary ? "Primary" : "Make Primary"}
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveNetwork(idx)}
                          className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">SSID (Network Name) *</label>
                        <Input
                          value={net.ssid}
                          onChange={(e) => handleUpdateNetwork(idx, { ssid: e.target.value })}
                          className="rounded-xl"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Password (Protected by Proximity)</label>
                        <div className="relative">
                          <Input
                            type={showPasswords[idx] ? "text" : "password"}
                            value={net.password || ""}
                            onChange={(e) => handleUpdateNetwork(idx, { password: e.target.value })}
                            placeholder="Leave empty if open"
                            className="rounded-xl pr-10 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPasswords((prev) => ({ ...prev, [idx]: !prev[idx] }))
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPasswords[idx] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Network Type / Label</label>
                        <select
                          value={net.networkType}
                          onChange={(e) => handleUpdateNetwork(idx, { networkType: e.target.value })}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
                        >
                          <option value="primary">Primary</option>
                          <option value="guest">Guest</option>
                          <option value="staff">Staff</option>
                          <option value="customer">Customer Only</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Access Pricing</label>
                        <select
                          value={net.accessType}
                          onChange={(e) => handleUpdateNetwork(idx, { accessType: e.target.value as any })}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
                        >
                          <option value="free">Free / Complimentary</option>
                          <option value="purchase_required">Purchase Required (on receipt)</option>
                          <option value="paid">Paid Access</option>
                          <option value="customers_only">Customers Only</option>
                        </select>
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-medium text-muted-foreground">Access Instructions</label>
                        <Input
                          value={net.instructions || ""}
                          onChange={(e) => handleUpdateNetwork(idx, { instructions: e.target.value })}
                          placeholder="e.g. Ask barista for passcode"
                          className="rounded-xl"
                        />
                      </div>

                      <div className="flex items-center gap-4 sm:col-span-2 pt-1">
                        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={net.isActive !== false}
                            onChange={(e) => handleUpdateNetwork(idx, { isActive: e.target.checked })}
                            className="rounded text-primary focus:ring-primary"
                          />
                          Network is Active and Visible to Public
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Amenities & Environment */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-2">
              <Check className="h-4 w-4 text-primary" /> 3. Amenities & Work Environment
            </h3>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Select Amenities Available</label>
              <div className="flex flex-wrap gap-2">
                {INITIAL_AMENITIES.map((amenity) => {
                  const active = Boolean(form[amenity.key as keyof AdminPlaceFormValues]);
                  return (
                    <button
                      key={amenity.key}
                      type="button"
                      onClick={() => toggleAmenity(amenity.key)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-medium border transition ${
                        active
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background text-muted-foreground border-border hover:bg-secondary"
                      }`}
                    >
                      {amenity.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Seating Capacity (Optional)</label>
                <Input
                  type="number"
                  min="0"
                  value={form.seatingCapacity ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      seatingCapacity: e.target.value ? parseInt(e.target.value, 10) : null
                    })
                  }
                  placeholder="e.g. 50 seats"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Noise Level</label>
                <div className="flex gap-2">
                  {NOISE_LEVEL_OPTIONS.map((noise) => (
                    <button
                      key={noise.value}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          noiseLevel: form.noiseLevel === noise.value ? null : noise.value
                        })
                      }
                      className={`flex-1 rounded-xl py-2 px-2 text-xs font-medium border transition ${
                        form.noiseLevel === noise.value
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-background text-muted-foreground border-border hover:bg-secondary"
                      }`}
                    >
                      {noise.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground">General Notes about Working Environment</label>
                <textarea
                  value={form.workNotes || ""}
                  onChange={(e) => setForm({ ...form, workNotes: e.target.value })}
                  placeholder="Notes for remote workers..."
                  className="w-full rounded-2xl border border-border bg-background p-3 text-xs outline-none focus:ring-2 focus:ring-primary min-h-[70px]"
                />
              </div>
            </div>
          </div>

          {/* 4. Archival Status Toggle */}
          <div className="rounded-2xl border border-border bg-secondary/30 p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-foreground">Archival Status</span>
              <p className="text-[11px] text-muted-foreground">
                Archived venues are hidden from public discovery and search while preserving data.
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={Boolean(form.isArchived)}
                onChange={(e) => setForm({ ...form, isArchived: e.target.checked })}
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              {form.isArchived ? "Archived (Hidden from public)" : "Active (Visible to public)"}
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-secondary/10">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl gap-2 px-6"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

