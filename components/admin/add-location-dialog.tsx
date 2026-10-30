"use client";

import { useState, useEffect, useTransition } from "react";
import {
  AlertCircle,
  Building,
  Check,
  Compass,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
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
  emptyAdminFormValues,
  emptyWifiNetworkInput,
  generateSlug
} from "@/lib/admin-places";
import { getBrowserLocation } from "@/lib/location";
import {
  type AdminPlaceFormValues,
  type AdminWifiNetworkInput,
  type DiscoveredBusiness,
  type DuplicateCheckMatch,
  type Place
} from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (newPlaces: Place[]) => void;
};

export function AddLocationDialog({ open, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<"discover" | "details">("discover");
  const [form, setForm] = useState<AdminPlaceFormValues>(emptyAdminFormValues());
  const [searchQuery, setSearchQuery] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [discoveredPlaces, setDiscoveredPlaces] = useState<DiscoveredBusiness[]>([]);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateCheckMatch[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (open) {
      setStep("discover");
      setForm(emptyAdminFormValues());
      setSearchQuery("");
      setDiscoveredPlaces([]);
      setDuplicateMatches([]);
      // Attempt to get admin coordinates for nearby discovery
      getBrowserLocation().then((loc) => {
        if (loc) {
          setUserCoords({ lat: loc.latitude, lng: loc.longitude });
          handleDiscoverNearby(loc.latitude, loc.longitude);
        }
      });
    }
  }, [open]);

  // Discover nearby businesses using GPS coordinates
  const handleDiscoverNearby = async (lat: number, lng: number) => {
    setDiscovering(true);
    try {
      const res = await fetch(`/api/admin/discover?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      if (res.ok && data.places) {
        setDiscoveredPlaces(data.places);
      }
    } catch {
      // Graceful fallback
    } finally {
      setDiscovering(false);
    }
  };

  // Search businesses by name
  const handleSearchByName = async () => {
    if (!searchQuery.trim()) return;
    setDiscovering(true);
    try {
      const params = new URLSearchParams({ query: searchQuery.trim() });
      if (userCoords) {
        params.set("lat", String(userCoords.lat));
        params.set("lng", String(userCoords.lng));
      }
      const res = await fetch(`/api/admin/discover?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.places) {
        setDiscoveredPlaces(data.places);
      }
    } catch {
      toast.error("Discovery search failed. You can create the location manually.");
    } finally {
      setDiscovering(false);
    }
  };

  // Select a discovered business to populate form
  const handleSelectDiscovered = (biz: DiscoveredBusiness) => {
    const slug = generateSlug(biz.name, biz.city);
    setForm({
      ...emptyAdminFormValues(),
      name: biz.name,
      slug,
      category: biz.category || "Cafe",
      address: biz.address || "",
      city: biz.city || "",
      latitude: biz.latitude,
      longitude: biz.longitude,
      phone: biz.phone || "",
      website: biz.website || "",
      hours: biz.hours || "",
      // Important: Do not automatically mark as Wi-Fi verified
      hasWifi: false,
      wifiFree: false,
      verifiedAt: "",
      verifiedBy: "Admin verified"
    });
    setStep("details");
    checkDuplicates(biz.name, biz.latitude, biz.longitude);
  };

  // Skip discovery and create manually
  const handleCreateManually = () => {
    const defaultLat = userCoords?.lat || 49.2827;
    const defaultLng = userCoords?.lng || -123.1207;
    setForm({
      ...emptyAdminFormValues(),
      slug: generateSlug("new-location"),
      latitude: defaultLat,
      longitude: defaultLng
    });
    setStep("details");
  };

  // Check duplicate locations against database
  const checkDuplicates = async (name: string, lat: number, lng: number) => {
    if (!name || !lat || !lng) return;
    setCheckingDuplicates(true);
    try {
      const res = await fetch("/api/admin/places/check-duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, latitude: lat, longitude: lng })
      });
      const data = await res.json();
      if (res.ok && data.matches) {
        setDuplicateMatches(data.matches);
      }
    } catch {
      // Ignore
    } finally {
      setCheckingDuplicates(false);
    }
  };

  // Wi-Fi Network management helpers
  const handleAddNetwork = () => {
    const newNet = emptyWifiNetworkInput();
    // If it's the first network, make it primary
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

    // If this network was made primary, remove primary flag from others
    if (patch.isPrimary) {
      updated.forEach((net, i) => {
        if (i !== index) net.isPrimary = false;
      });
    }

    setForm({ ...form, wifiNetworks: updated });
  };

  const handleRemoveNetwork = (index: number) => {
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

  // Toggle amenity tag
  const toggleAmenity = (key: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: !prev[key as keyof AdminPlaceFormValues]
    }));
  };

  // Save location
  const handleSave = async () => {
    if (!form.name.trim() || !form.address.trim() || !form.category.trim()) {
      toast.error("Please fill in Name, Category, and Address.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: form })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create location");
      }

      toast.success(`Location "${form.name}" created successfully!`);
      onSuccess(data.places || []);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create location");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

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
              <h2 className="text-lg font-bold text-foreground">Add New Location</h2>
              <p className="text-xs text-muted-foreground">
                {step === "discover"
                  ? "Discover nearby businesses or search by name"
                  : "Review details, configure Wi-Fi networks, and assign amenities"}
              </p>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === "discover" ? (
            /* STEP 1: DISCOVERY & SEARCH */
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search businesses by name (e.g. Waves Coffee, Save-On-Foods)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchByName()}
                    className="pl-10 rounded-2xl"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleSearchByName}
                  disabled={discovering || !searchQuery.trim()}
                  className="rounded-2xl gap-2 px-5"
                >
                  {discovering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search
                </Button>
                {userCoords && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDiscoverNearby(userCoords.lat, userCoords.lng)}
                    disabled={discovering}
                    className="rounded-2xl gap-2"
                  >
                    <Compass className="h-4 w-4 text-emerald-500" />
                    Nearby GPS
                  </Button>
                )}
              </div>

              {/* Discovered Results List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>
                    {discoveredPlaces.length > 0
                      ? `Found ${discoveredPlaces.length} businesses`
                      : "Discovered businesses will appear here"}
                  </span>
                  <span>External attribution: OpenStreetMap & Nominatim</span>
                </div>

                {discovering && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-xs">Scanning nearby businesses...</p>
                  </div>
                )}

                {!discovering && discoveredPlaces.length > 0 && (
                  <div className="divide-y divide-border rounded-2xl border border-border bg-background overflow-hidden max-h-96 overflow-y-auto">
                    {discoveredPlaces.map((biz, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-secondary/40 transition gap-3"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-foreground">{biz.name}</span>
                            <Badge variant="default" className="text-[10px] py-0 px-2">
                              {biz.category}
                            </Badge>
                            {biz.isAlreadyInMapify ? (
                              <Badge variant="warning" className="text-[10px] py-0 px-2">
                                Already in Mapify
                              </Badge>
                            ) : (
                              <Badge variant="success" className="text-[10px] py-0 px-2">
                                New to Mapify
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            {biz.address} {biz.city ? `• ${biz.city}` : ""}
                          </p>
                          {biz.distanceMeters !== undefined && (
                            <span className="text-[11px] text-primary font-medium">
                              {biz.distanceMeters}m away from current location
                            </span>
                          )}
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleSelectDiscovered(biz)}
                          className="rounded-xl shrink-0"
                        >
                          Select & Import
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {!discovering && discoveredPlaces.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-border p-8 text-center space-y-3">
                    <Building className="mx-auto h-8 w-8 text-muted-foreground/60" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Can&apos;t find the business?</p>
                      <p className="text-xs text-muted-foreground">
                        You can search for a different query or enter venue details manually from scratch.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCreateManually}
                      className="rounded-xl gap-2 mt-2"
                    >
                      <Plus className="h-4 w-4" />
                      Create Custom Location Manually
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* STEP 2: REVIEW, WI-FI NETWORKS & AMENITIES */
            <div className="space-y-8">
              {/* Back to discovery button */}
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("discover")}
                  className="rounded-xl text-xs gap-1.5"
                >
                  ← Back to Discovery & Search
                </Button>
                <span className="text-xs text-muted-foreground">Editing new venue draft</span>
              </div>

              {/* Duplicate Warning Banner */}
              {duplicateMatches.length > 0 && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2 text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2 font-semibold text-xs">
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                    Possible Existing Match Detected
                  </div>
                  <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                    A venue with a matching name or close coordinates ({duplicateMatches[0].distanceMeters}m away) already exists:{" "}
                    <strong>{duplicateMatches[0].name}</strong> ({duplicateMatches[0].address}). Please review to avoid creating an accidental duplicate.
                  </p>
                </div>
              )}

              {/* 1. Venue Basic Details */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-2">
                  <Building className="h-4 w-4 text-primary" /> 1. Venue Details
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Name *</label>
                    <Input
                      value={form.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setForm({ ...form, name, slug: generateSlug(name, form.city) });
                        checkDuplicates(name, form.latitude, form.longitude);
                      }}
                      placeholder="e.g. Waves Coffee House"
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Category *</label>
                    <Input
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      placeholder="e.g. Cafe, Library, Coworking"
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground">Address *</label>
                    <Input
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="e.g. 7155 120th St"
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">City *</label>
                    <Input
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="e.g. Vancouver"
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">URL Slug</label>
                    <div className="flex gap-2">
                      <Input
                        value={form.slug}
                        onChange={(e) => setForm({ ...form, slug: e.target.value })}
                        className="rounded-xl"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setForm({ ...form, slug: generateSlug(form.name, form.city) })}
                        title="Regenerate slug"
                        className="rounded-xl shrink-0"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Latitude</label>
                    <Input
                      type="number"
                      step="any"
                      value={form.latitude}
                      onChange={(e) => {
                        const lat = parseFloat(e.target.value);
                        setForm({ ...form, latitude: lat });
                        checkDuplicates(form.name, lat, form.longitude);
                      }}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Longitude</label>
                    <Input
                      type="number"
                      step="any"
                      value={form.longitude}
                      onChange={(e) => {
                        const lng = parseFloat(e.target.value);
                        setForm({ ...form, longitude: lng });
                        checkDuplicates(form.name, form.latitude, lng);
                      }}
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
                    <Wifi className="h-4 w-4 text-emerald-500" /> 2. Wi-Fi Networks
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
                    <p className="text-xs text-muted-foreground">
                      No Wi-Fi networks configured yet for this venue. You can leave this venue unverified or add networks below.
                    </p>
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
                        key={idx}
                        className="rounded-2xl border border-border bg-secondary/20 p-4 space-y-4 relative"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">
                              Network #{idx + 1}
                            </span>
                            {net.isPrimary && (
                              <Badge variant="success" className="text-[10px] py-0 px-2">
                                Primary Network
                              </Badge>
                            )}
                            {!net.isActive && (
                              <Badge variant="warning" className="text-[10px] py-0 px-2">
                                Inactive
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
                              placeholder="e.g. Waves_Guest"
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
                                placeholder="Leave empty if open network"
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
                              placeholder="e.g. Ask barista for passcode printed at bottom of receipt"
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
                      placeholder="e.g. 45 seats"
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
                      placeholder="Notes for laptop users (e.g. Plenty of outlets along the back wall, quietest during mornings)..."
                      className="w-full rounded-2xl border border-border bg-background p-3 text-xs outline-none focus:ring-2 focus:ring-primary min-h-[70px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
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

          {step === "details" && (
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl gap-2 px-6"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save Location
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

