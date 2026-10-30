"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Eye, EyeOff, Loader2, ShieldCheck, Wifi, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type Place, type WifiAccessType } from "@/lib/types";

type Props = {
  place: Place | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function WifiSubmissionDialog({ place, open, onClose, onSuccess }: Props) {
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accessType, setAccessType] = useState<WifiAccessType>("free");
  const [instructions, setInstructions] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!open || !place) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ssid.trim()) {
      toast.error("Please enter the Wi-Fi network name (SSID).");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: place.source === "database" ? place.id : undefined,
          placeName: place.name,
          placeAddress: place.address,
          latitude: place.latitude,
          longitude: place.longitude,
          ssid: ssid.trim(),
          password: password.trim() || undefined,
          accessType,
          instructions: instructions.trim() || undefined,
          notes: notes.trim() || undefined
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.error || "Submission failed. Please try again.");
        return;
      }

      setSubmitted(true);
      toast.success("Wi-Fi details submitted for verification!");
      setTimeout(() => {
        onSuccess?.();
        onClose();
        setSubmitted(false);
        setSsid("");
        setPassword("");
        setInstructions("");
        setNotes("");
      }, 1800);
    } catch {
      toast.error("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-2xl z-10 max-h-[90dvh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
                <Wifi className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Contribute Wi-Fi Details</h2>
                <p className="text-xs text-muted-foreground truncate max-w-[280px]">
                  For <span className="font-medium text-foreground">{place.name}</span>
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-full h-8 w-8 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Form / Success State */}
          <div className="overflow-y-auto py-4 flex-1">
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 animate-in zoom-in">
                  <CheckCircle2 className="h-9 w-9" />
                </div>
                <h3 className="text-xl font-semibold">Thank You!</h3>
                <p className="max-w-xs text-sm text-muted-foreground leading-relaxed">
                  Your submission has been saved and will be reviewed by our team before it becomes publicly available.
                </p>
              </div>
            ) : (
              <form id="wifi-form" onSubmit={handleSubmit} className="space-y-4">
                {/* Admin review notice */}
                <div className="flex items-start gap-2.5 rounded-2xl bg-secondary/50 p-3.5 text-xs text-muted-foreground border border-border/40">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p>
                    Submissions are kept private and verified by our moderation team before becoming public.
                  </p>
                </div>

                {/* Network Name (SSID) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Network Name (SSID) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    value={ssid}
                    onChange={(e) => setSsid(e.target.value)}
                    placeholder="e.g. CafeGuest_5G"
                    className="rounded-xl h-11"
                  />
                </div>

                {/* Password (Optional) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Wi-Fi Password (leave blank if open)
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Optional password"
                      className="rounded-xl h-11 pr-11"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Access Requirement */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Access Requirement
                  </label>
                  <select
                    value={accessType}
                    onChange={(e) => setAccessType(e.target.value as WifiAccessType)}
                    className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="free">Free to all customers</option>
                    <option value="purchase_required">Purchase required (password on receipt)</option>
                    <option value="customers_only">Customers only (ask staff)</option>
                    <option value="paid">Paid / Subscription Wi-Fi</option>
                    <option value="other">Other / Custom</option>
                  </select>
                </div>

                {/* Connection Instructions */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Connection Instructions (Optional)
                  </label>
                  <Input
                    type="text"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="e.g. Connect to guest network and accept terms in browser"
                    className="rounded-xl h-11"
                  />
                </div>

                {/* Additional Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Additional Notes (Optional)
                  </label>
                  <Input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Signal is strongest near the front counter"
                    className="rounded-xl h-11"
                  />
                </div>
              </form>
            )}
          </div>

          {/* Footer */}
          {!submitted && (
            <div className="border-t border-border/50 pt-3 flex items-center justify-end gap-2.5">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting} className="rounded-xl">
                Cancel
              </Button>
              <Button
                type="submit"
                form="wifi-form"
                disabled={isSubmitting || !ssid.trim()}
                className="rounded-xl min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Details"
                )}
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

