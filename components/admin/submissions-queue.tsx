"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Inbox,
  Loader2,
  RefreshCw,
  X,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Place, WifiSubmission } from "@/lib/types";

type Props = {
  places: Place[];
  onSubmissionHandled?: () => void;
};

export function SubmissionsQueue({ places, onSubmissionHandled }: Props) {
  const [submissions, setSubmissions] = useState<WifiSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  // Show/Hide password toggle map
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Action Dialog states
  const [approvingSub, setApprovingSub] = useState<WifiSubmission | null>(null);
  const [rejectingSub, setRejectingSub] = useState<WifiSubmission | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [selectedTargetNetId, setSelectedTargetNetId] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/submissions?status=${statusFilter}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load submissions");
      setSubmissions(data.submissions || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [statusFilter]);

  const togglePassword = (id: string) => {
    setShowPasswordMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Find matching existing venue and any potential duplicate networks
  const getVenueAndDuplicateInfo = (sub: WifiSubmission) => {
    const venue = sub.placeId
      ? places.find((p) => p.id === sub.placeId)
      : places.find(
          (p) =>
            p.name.toLowerCase() === sub.placeName?.toLowerCase() ||
            p.address.toLowerCase() === sub.placeAddress?.toLowerCase()
        );

    if (!venue) return { venue: null, duplicateNetwork: null };

    const duplicate = venue.wifiNetworks.find(
      (net) =>
        net.ssid.trim().toLowerCase() === sub.ssid.trim().toLowerCase() ||
        net.ssid.toLowerCase().includes(sub.ssid.toLowerCase()) ||
        sub.ssid.toLowerCase().includes(net.ssid.toLowerCase())
    );

    return { venue, duplicateNetwork: duplicate || null };
  };

  // Open Approve Dialog
  const handleOpenApprove = (sub: WifiSubmission) => {
    const { duplicateNetwork } = getVenueAndDuplicateInfo(sub);
    setApprovingSub(sub);
    setSelectedTargetNetId(duplicateNetwork?.id || "");
    setAdminNotes("");
  };

  // Open Reject Dialog
  const handleOpenReject = (sub: WifiSubmission) => {
    setRejectingSub(sub);
    setAdminNotes("");
  };

  // Submit Approval
  const handleConfirmApprove = async () => {
    if (!approvingSub) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/submissions/${approvingSub.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminNotes: adminNotes || null,
          targetNetworkId: selectedTargetNetId || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve submission");

      toast.success("Submission approved and Wi-Fi network updated!");
      setApprovingSub(null);
      fetchSubmissions();
      onSubmissionHandled?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve submission");
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Rejection
  const handleConfirmReject = async () => {
    if (!rejectingSub) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/submissions/${rejectingSub.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminNotes: adminNotes || "Submission rejected by administrator."
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject submission");

      toast.success("Submission rejected.");
      setRejectingSub(null);
      fetchSubmissions();
      onSubmissionHandled?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject submission");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Submissions Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          {(
            [
              { key: "pending", label: "Pending Review" },
              { key: "approved", label: "Approved" },
              { key: "rejected", label: "Rejected" },
              { key: "all", label: "All Submissions" }
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`rounded-2xl px-3.5 py-1.5 text-xs font-semibold transition ${
                statusFilter === tab.key
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fetchSubmissions}
          disabled={loading}
          className="rounded-2xl text-xs gap-1.5 self-end sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Queue
        </Button>
      </div>

      {/* Submissions List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mb-2" />
          <span className="text-xs">Loading submission queue...</span>
        </div>
      ) : submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <Inbox className="h-10 w-10 stroke-[1.25] text-muted-foreground/60 mb-2" />
          <p className="text-sm font-semibold text-foreground">No submissions found</p>
          <p className="text-xs text-muted-foreground max-w-sm mt-1">
            {statusFilter === "pending"
              ? "All user-submitted Wi-Fi networks have been reviewed. Good job!"
              : `There are currently no submissions with status '${statusFilter}'.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {submissions.map((sub) => {
            const { venue, duplicateNetwork } = getVenueAndDuplicateInfo(sub);
            const subId = sub.id || "";
            const isPasswordShown = Boolean(showPasswordMap[subId]);

            return (
              <div
                key={subId || Math.random().toString()}
                className="rounded-2xl border border-border bg-card p-5 shadow-xs transition hover:border-primary/40 space-y-3"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-foreground text-sm">
                        {sub.placeName || venue?.name || "Unknown Venue"}
                      </h3>
                      <Badge
                        variant={
                          sub.status === "approved"
                            ? "success"
                            : sub.status === "pending"
                            ? "warning"
                            : "default"
                        }
                        className={`text-[10px] capitalize py-0 px-2 ${
                          sub.status === "rejected" ? "bg-rose-500/10 text-rose-600 border border-rose-500/30" : ""
                        }`}
                      >
                        {sub.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {sub.placeAddress || venue?.address || "Address not provided"}
                    </div>
                  </div>

                  <div className="text-left sm:text-right text-[11px] text-muted-foreground">
                    <div>Submitted {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : "Recently"}</div>
                    {sub.submittedFromIp && (
                      <div className="font-mono text-[10px]">IP: {sub.submittedFromIp}</div>
                    )}
                  </div>
                </div>

                {/* Conflict / Duplicate warning badge */}
                {duplicateNetwork && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      <strong>Matches existing network:</strong> &ldquo;{duplicateNetwork.ssid}&rdquo;. Approving can update its credentials or add as secondary.
                    </span>
                  </div>
                )}

                {/* Wi-Fi Credential Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl bg-secondary/30 p-3 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-medium">SSID</span>
                    <span className="font-mono font-bold text-foreground">{sub.ssid}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground block font-medium">Password</span>
                    <div className="flex items-center gap-1.5 font-mono">
                      {sub.password ? (
                        <>
                          <span className="font-bold text-foreground">
                            {isPasswordShown ? sub.password : "••••••••"}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePassword(subId)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {isPasswordShown ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </>
                      ) : (
                        <span className="text-muted-foreground italic">None (Open Wi-Fi)</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground block font-medium">Access Type</span>
                    <span className="capitalize text-foreground font-medium">
                      {sub.accessType ? sub.accessType.replace("_", " ") : "Free"}
                    </span>
                  </div>
                </div>

                {/* User Notes */}
                {(sub.instructions || sub.notes) && (
                  <div className="text-xs text-muted-foreground bg-secondary/20 rounded-xl p-2.5">
                    {sub.instructions && (
                      <p>
                        <strong className="text-foreground">Instructions: </strong>
                        {sub.instructions}
                      </p>
                    )}
                    {sub.notes && (
                      <p className="mt-1">
                        <strong className="text-foreground">User Note: </strong>
                        {sub.notes}
                      </p>
                    )}
                  </div>
                )}

                {/* Admin notes if reviewed */}
                {sub.adminNotes && (
                  <div className="text-xs text-muted-foreground border-l-2 border-primary pl-2.5 py-0.5">
                    <strong>Admin Note: </strong>
                    {sub.adminNotes} (Reviewed by {sub.reviewedBy || "Admin"})
                  </div>
                )}

                {/* Review Action Buttons (for pending submissions) */}
                {sub.status === "pending" && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenReject(sub)}
                      className="rounded-2xl text-xs gap-1.5 text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleOpenApprove(sub)}
                      className="rounded-2xl text-xs gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Approve & Verify
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Approve Dialog */}
      {approvingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                Approve Wi-Fi Submission
              </h3>
              <button
                type="button"
                onClick={() => setApprovingSub(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <p className="text-muted-foreground">
                You are approving SSID <strong>&ldquo;{approvingSub.ssid}&rdquo;</strong> for venue{" "}
                <strong>{approvingSub.placeName || "selected venue"}</strong>.
              </p>

              {/* Target network selector if venue has networks */}
              {(() => {
                const { venue } = getVenueAndDuplicateInfo(approvingSub);
                if (venue && venue.wifiNetworks.length > 0) {
                  return (
                    <div>
                      <label className="block font-semibold text-foreground mb-1">
                        Target Destination:
                      </label>
                      <select
                        value={selectedTargetNetId}
                        onChange={(e) => setSelectedTargetNetId(e.target.value)}
                        className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-xs"
                      >
                        <option value="">Create as new network record</option>
                        {venue.wifiNetworks.map((net) => (
                          <option key={net.id} value={net.id}>
                            Update existing network: {net.ssid}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }
                return null;
              })()}

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Reviewer Notes (optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAdminNotes(e.target.value)}
                  placeholder="e.g. Verified matches in-store poster."
                  rows={2}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setApprovingSub(null)}
                  className="rounded-2xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmApprove}
                  disabled={actionLoading}
                  className="rounded-2xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  Confirm & Publish
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {rejectingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2 text-destructive">
                <XCircle className="h-4 w-4" />
                Reject Wi-Fi Submission
              </h3>
              <button
                type="button"
                onClick={() => setRejectingSub(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <p className="text-muted-foreground">
                Please specify the reason for rejecting submission for SSID{" "}
                <strong>&ldquo;{rejectingSub.ssid}&rdquo;</strong>.
              </p>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Rejection Reason / Admin Note
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAdminNotes(e.target.value)}
                  placeholder="e.g. Invalid password, network no longer in service, or duplicate entry."
                  rows={3}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRejectingSub(null)}
                  className="rounded-2xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleConfirmReject}
                  disabled={actionLoading}
                  className="rounded-2xl text-xs font-semibold"
                >
                  {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  Confirm Rejection
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
