"use client";

import { useState } from "react";
import { AlertTriangle, Archive, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Place } from "@/lib/types";

type Props = {
  place: Place;
  open: boolean;
  onClose: () => void;
  onArchive: (id: string) => Promise<void>;
  onPermanentDelete: (id: string) => Promise<void>;
};

export function DeleteConfirmDialog({
  place,
  open,
  onClose,
  onArchive,
  onPermanentDelete
}: Props) {
  const [loading, setLoading] = useState(false);
  const [showPermanentWarning, setShowPermanentWarning] = useState(false);

  if (!open) return null;

  const handleArchive = async () => {
    setLoading(true);
    try {
      await onArchive(place.id);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handlePermanent = async () => {
    setLoading(true);
    try {
      await onPermanentDelete(place.id);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-base">Safeguard Deletion</h3>
              <p className="text-xs text-muted-foreground">Choose how to handle this location</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-2xl border border-border/80 bg-secondary/30 p-4 space-y-1">
          <div className="font-semibold text-sm text-foreground">{place.name}</div>
          <div className="text-xs text-muted-foreground">{place.address}, {place.city}</div>
          {place.wifiNetworks && place.wifiNetworks.length > 0 && (
            <div className="text-[11px] text-muted-foreground mt-1">
              Associated networks: {place.wifiNetworks.map((n) => n.ssid).join(", ")}
            </div>
          )}
        </div>

        {!showPermanentWarning ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-primary/5 p-3.5 border border-primary/15 text-xs space-y-1.5">
              <p className="font-medium text-foreground">Recommended: Archive Location</p>
              <p className="text-muted-foreground leading-relaxed">
                Archiving immediately removes this location from public search and discovery, while preserving historical Wi-Fi records and submissions intact in your database. You can restore it at any time.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleArchive}
                disabled={loading}
                className="flex-1 rounded-xl gap-2 bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Archive className="h-4 w-4" />
                {place.isArchived ? "Keep Archived" : "Archive Location"}
              </Button>
            </div>

            <div className="border-t border-border pt-3 text-center">
              <button
                type="button"
                onClick={() => setShowPermanentWarning(true)}
                className="text-xs text-rose-500 hover:text-rose-600 hover:underline transition"
              >
                Need to permanently delete this record instead?
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-rose-500/10 p-4 border border-rose-500/20 text-xs space-y-2 text-rose-700 dark:text-rose-400">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" /> Warning: Irreversible Action
              </p>
              <p className="leading-relaxed">
                Permanently deleting <strong>{place.name}</strong> will remove the venue record and automatically cascade delete all associated Wi-Fi networks and photos. This cannot be undone.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPermanentWarning(false)}
                disabled={loading}
                className="flex-1 rounded-xl"
              >
                Back to Archive
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handlePermanent}
                disabled={loading}
                className="flex-1 rounded-xl gap-2 shadow-sm"
              >
                <Trash2 className="h-4 w-4" />
                Confirm Permanent Delete
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

