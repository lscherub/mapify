"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle, CheckSquare, Loader2, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Place, WifiNetwork, WifiVerificationStatus } from "@/lib/types";

type Props = {
  place: Place;
  network: WifiNetwork;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified?: () => void;
};

export function VerifyNetworkDialog({ place, network, open, onOpenChange, onVerified }: Props) {
  const [status, setStatus] = useState<WifiVerificationStatus>(network.verificationStatus || "verified");
  const [confirmSsidMatch, setConfirmSsidMatch] = useState(false);
  const [confirmConnectivity, setConfirmConnectivity] = useState(false);
  const [notes, setNotes] = useState(network.verificationNotes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (status === "verified" && (!confirmSsidMatch || !confirmConnectivity)) {
      toast.error("Please confirm both verification checkboxes before marking as verified.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/networks/${network.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          notes: notes || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update network verification");

      toast.success(`Wi-Fi network status updated to: ${status}`);
      onVerified?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to verify network");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (st?: WifiVerificationStatus) => {
    switch (st) {
      case "verified":
        return <Badge variant="success">Verified</Badge>;
      case "pending":
        return <Badge variant="warning">Pending Review</Badge>;
      case "expired":
        return (
          <Badge variant="warning" className="border border-amber-500/40 text-amber-600 bg-amber-500/10">
            Expired / Credentials Changed
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="default" className="bg-rose-500/10 text-rose-600 border border-rose-500/30">
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="default">Unverified</Badge>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Verify Wi-Fi Network</h2>
              <p className="text-xs text-muted-foreground">
                Confirm network accuracy, connectivity, and publication status
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Venue & Network Summary */}
        <div className="mt-4 rounded-2xl border border-border bg-secondary/30 p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Venue:</span>
            <span className="font-bold text-foreground">{place.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">SSID:</span>
            <span className="font-mono font-bold text-foreground">{network.ssid}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Access Type:</span>
            <span className="capitalize text-foreground">{(network.accessType || "free").replace("_", " ")}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Current Status:</span>
            <span>{getStatusBadge(network.verificationStatus)}</span>
          </div>
          {network.verifiedAt && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last Verified:</span>
              <span className="text-foreground">{network.verifiedAt} ({network.verifiedBy || "Admin"})</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Target Verification Status */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Set Verification Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as WifiVerificationStatus)}
              className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="verified">Verified (Confirmed working on-site)</option>
              <option value="pending">Pending (Awaiting testing or review)</option>
              <option value="unverified">Unverified</option>
              <option value="rejected">Rejected (Incorrect or invalid)</option>
              <option value="expired">Expired (Credentials need re-testing)</option>
            </select>
          </div>

          {/* Verification Checklist (Mandatory for 'verified') */}
          {status === "verified" && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 space-y-2.5 animate-in fade-in duration-200">
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4" />
                Required Verification Confirmation
              </span>

              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={confirmSsidMatch}
                  onChange={(e) => setConfirmSsidMatch(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  I confirm the SSID <strong>&ldquo;{network.ssid}&rdquo;</strong> and credentials match the venue&apos;s physical Wi-Fi setup.
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={confirmConnectivity}
                  onChange={(e) => setConfirmConnectivity(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  I have tested connectivity and confirmed live internet access is actively available on this network.
                </span>
              </label>
            </div>
          )}

          {/* Verification Notes */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Verification Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              placeholder="e.g. Verified by on-site visit. Password printed on table tent."
              rows={2}
              className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-2xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (status === "verified" && (!confirmSsidMatch || !confirmConnectivity))}
              className="rounded-2xl text-xs font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                "Save Verification"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
