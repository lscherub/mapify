"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Clock,
  Gauge,
  History,
  Loader2,
  RefreshCw,
  Save,
  Square,
  Wifi,
  X
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { runSpeedTest, type SpeedTestProgress, type SpeedTestResult } from "@/lib/speed-test";
import type { Place, WifiNetwork, WifiSpeedTest } from "@/lib/types";

type Props = {
  places: Place[];
  initialPlaceId?: string;
  initialNetworkId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

export function SpeedTestDialog({
  places,
  initialPlaceId,
  initialNetworkId,
  open,
  onOpenChange,
  onSaved
}: Props) {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>(initialPlaceId || "");
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>(initialNetworkId || "");

  // Speed test state
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<SpeedTestProgress>({ stage: "idle", percent: 0 });
  const [testResult, setTestResult] = useState<SpeedTestResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Saving state
  const [adminNotes, setAdminNotes] = useState("");
  const [approveForPublic, setApproveForPublic] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // History state
  const [history, setHistory] = useState<WifiSpeedTest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Synchronize when initial props change
  useEffect(() => {
    if (initialPlaceId) setSelectedPlaceId(initialPlaceId);
    if (initialNetworkId) setSelectedNetworkId(initialNetworkId);
  }, [initialPlaceId, initialNetworkId]);

  const selectedPlace = places.find((p) => p.id === selectedPlaceId);
  const availableNetworks = selectedPlace?.wifiNetworks || [];

  // Auto-select first network if none selected or network not in venue
  useEffect(() => {
    if (availableNetworks.length > 0) {
      const exists = availableNetworks.some((n) => n.id === selectedNetworkId);
      if (!exists && availableNetworks[0]?.id) {
        setSelectedNetworkId(availableNetworks[0].id);
      }
    } else {
      setSelectedNetworkId("");
    }
  }, [availableNetworks, selectedNetworkId]);

  const selectedNetwork = availableNetworks.find((n) => n.id === selectedNetworkId);

  // Fetch test history when selected network changes
  useEffect(() => {
    if (!open || !selectedNetworkId) return;

    let isMounted = true;
    setLoadingHistory(true);
    fetch(`/api/admin/speed-tests?wifiNetworkId=${selectedNetworkId}&limit=5`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setHistory(data.tests || []);
          setLoadingHistory(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoadingHistory(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, selectedNetworkId]);

  // Start Speed Test
  const handleStartTest = async () => {
    if (!selectedPlaceId || !selectedNetworkId) {
      toast.error("Please select a venue and Wi-Fi network first.");
      return;
    }

    setIsRunning(true);
    setErrorMessage(null);
    setTestResult(null);
    setProgress({ stage: "ping", percent: 0, message: "Initiating speed test..." });

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const result = await runSpeedTest((p) => {
        setProgress(p);
      }, abortController.signal);

      setTestResult(result);
      toast.success("Speed test completed successfully!");
    } catch (err: any) {
      if (err.name === "AbortError" || err.message?.includes("aborted")) {
        setErrorMessage("Speed test was cancelled by user.");
      } else {
        setErrorMessage(err.message || "Failed to complete speed test.");
        toast.error(err.message || "Speed test failed");
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  };

  // Stop / Abort Speed Test
  const handleAbortTest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsRunning(false);
  };

  // Save Speed Test Result
  const handleSaveResult = async () => {
    if (!testResult || !selectedPlaceId || !selectedNetworkId) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/speed-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: selectedPlaceId,
          wifiNetworkId: selectedNetworkId,
          downloadMbps: testResult.downloadMbps,
          uploadMbps: testResult.uploadMbps,
          latencyMs: testResult.latencyMs,
          jitterMs: testResult.jitterMs,
          notes: adminNotes || null,
          isApprovedForPublic: approveForPublic
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save speed test");

      toast.success(
        approveForPublic
          ? "Speed test saved and published to public venue profile!"
          : "Speed test saved to admin history."
      );

      // Refresh history
      if (data.test) {
        setHistory((prev) => [data.test, ...prev]);
      }

      onSaved?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to save speed test");
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Wi-Fi Speed Testing</h2>
              <p className="text-xs text-muted-foreground">
                Benchmark real-world latency, jitter, download, and upload performance
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (isRunning) handleAbortTest();
              onOpenChange(false);
            }}
            className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Venue & Network Selectors */}
        <div className="grid gap-3 pt-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Select Venue
            </label>
            <select
              value={selectedPlaceId}
              disabled={isRunning}
              onChange={(e) => {
                setSelectedPlaceId(e.target.value);
                setTestResult(null);
                setErrorMessage(null);
              }}
              className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">-- Choose a venue --</option>
              {places
                .filter((p) => !p.isArchived)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.city})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Select Network
            </label>
            <select
              value={selectedNetworkId}
              disabled={isRunning || availableNetworks.length === 0}
              onChange={(e) => {
                setSelectedNetworkId(e.target.value);
                setTestResult(null);
                setErrorMessage(null);
              }}
              className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {availableNetworks.length === 0 ? (
                <option value="">No networks registered</option>
              ) : (
                availableNetworks.map((net) => (
                  <option key={net.id} value={net.id}>
                    {net.ssid} ({net.networkType || "network"})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Technical Disclaimer Notice */}
        <div className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <span className="font-semibold">Device Connection Requirement: </span>
              Web browsers cannot inspect your hardware Wi-Fi adapter. All tests measure your device&apos;s
              active connection. Please confirm your computer or phone is currently connected to Wi-Fi SSID:{" "}
              <strong className="underline">
                {selectedNetwork?.ssid || "the selected venue network"}
              </strong>{" "}
              before starting.
            </div>
          </div>
        </div>

        {/* Test Console */}
        <div className="mt-4 rounded-2xl border border-border bg-secondary/20 p-5">
          {/* Metrics Display Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border/60 bg-card p-3 text-center shadow-xs">
              <span className="text-[11px] font-medium text-muted-foreground flex items-center justify-center gap-1">
                <ArrowDownCircle className="h-3.5 w-3.5 text-blue-500" /> Download
              </span>
              <div className="mt-1 text-xl font-black text-foreground">
                {progress.downloadMbps !== undefined
                  ? `${progress.downloadMbps}`
                  : testResult
                  ? `${testResult.downloadMbps}`
                  : "--"}
                <span className="text-[10px] font-normal text-muted-foreground ml-1">Mbps</span>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-3 text-center shadow-xs">
              <span className="text-[11px] font-medium text-muted-foreground flex items-center justify-center gap-1">
                <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-500" /> Upload
              </span>
              <div className="mt-1 text-xl font-black text-foreground">
                {progress.uploadMbps !== undefined
                  ? `${progress.uploadMbps}`
                  : testResult
                  ? `${testResult.uploadMbps}`
                  : "--"}
                <span className="text-[10px] font-normal text-muted-foreground ml-1">Mbps</span>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-3 text-center shadow-xs">
              <span className="text-[11px] font-medium text-muted-foreground flex items-center justify-center gap-1">
                <Clock className="h-3.5 w-3.5 text-amber-500" /> Latency
              </span>
              <div className="mt-1 text-xl font-black text-foreground">
                {progress.latencyMs !== undefined
                  ? `${progress.latencyMs}`
                  : testResult
                  ? `${testResult.latencyMs}`
                  : "--"}
                <span className="text-[10px] font-normal text-muted-foreground ml-1">ms</span>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-3 text-center shadow-xs">
              <span className="text-[11px] font-medium text-muted-foreground flex items-center justify-center gap-1">
                <Activity className="h-3.5 w-3.5 text-purple-500" /> Jitter
              </span>
              <div className="mt-1 text-xl font-black text-foreground">
                {progress.jitterMs !== undefined
                  ? `${progress.jitterMs}`
                  : testResult
                  ? `${testResult.jitterMs}`
                  : "--"}
                <span className="text-[10px] font-normal text-muted-foreground ml-1">ms</span>
              </div>
            </div>
          </div>

          {/* Progress Bar & Status */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="text-muted-foreground">
                {isRunning
                  ? progress.message || "Running benchmark..."
                  : testResult
                  ? "Benchmark finished successfully"
                  : errorMessage
                  ? errorMessage
                  : "Ready to test"}
              </span>
              <span className="text-primary font-mono">{progress.percent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full transition-all duration-300 ${
                  errorMessage
                    ? "bg-destructive"
                    : progress.percent === 100
                    ? "bg-emerald-500"
                    : "bg-primary"
                }`}
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>

          {/* Action Trigger */}
          <div className="mt-4 flex items-center justify-between gap-3">
            {isRunning ? (
              <Button
                type="button"
                variant="destructive"
                onClick={handleAbortTest}
                className="rounded-2xl gap-2 text-xs"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                Cancel Test
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleStartTest}
                disabled={!selectedPlaceId || !selectedNetworkId}
                className="rounded-2xl gap-2 text-xs font-semibold"
              >
                {testResult ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Rerun Speed Test
                  </>
                ) : (
                  <>
                    <Gauge className="h-3.5 w-3.5" />
                    Start Speed Test
                  </>
                )}
              </Button>
            )}

            {testResult && !isRunning && (
              <Badge variant="success" className="gap-1 text-xs py-1 px-3">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Passed Benchmark
              </Badge>
            )}
          </div>
        </div>

        {/* Save Result Section (Only when test completed) */}
        {testResult && !isRunning && (
          <div className="mt-4 rounded-2xl border border-border bg-card p-4 space-y-3 animate-in fade-in duration-200">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Save className="h-3.5 w-3.5 text-primary" />
              Save & Publish Speed Benchmark
            </h4>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                Environment & Test Notes (optional)
              </label>
              <textarea
                value={adminNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAdminNotes(e.target.value)}
                placeholder="e.g. Tested on second floor patio during peak afternoon hours."
                rows={2}
                className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={approveForPublic}
                onChange={(e) => setApproveForPublic(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="font-medium text-foreground">
                Publish approved metrics to public venue profile (displays download & upload speeds to users)
              </span>
            </label>

            <Button
              type="button"
              onClick={handleSaveResult}
              disabled={isSaving}
              className="w-full rounded-2xl gap-2 text-xs font-semibold"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {isSaving ? "Saving..." : "Save Benchmark Result"}
            </Button>
          </div>
        )}

        {/* Past Test History Section */}
        {selectedNetworkId && (
          <div className="mt-4 border-t border-border pt-4">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2">
              <History className="h-3.5 w-3.5 text-muted-foreground" />
              Recent Speed Test History for this Network
            </h4>

            {loadingHistory ? (
              <div className="flex items-center justify-center py-3 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Loading history...
              </div>
            ) : history.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-1">
                No past speed tests recorded for this network yet.
              </p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {history.map((test) => (
                  <div
                    key={test.id}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/30 px-3 py-2 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        <span>⚡ {test.downloadMbps} Mbps ↓</span>
                        <span>•</span>
                        <span>{test.uploadMbps} Mbps ↑</span>
                        <span>•</span>
                        <span className="text-muted-foreground">{test.latencyMs}ms</span>
                        {test.isApprovedForPublic && (
                          <Badge variant="success" className="text-[9px] py-0 px-1.5">
                            Public
                          </Badge>
                        )}
                      </div>
                      {test.notes && <div className="text-[11px] text-muted-foreground mt-0.5">{test.notes}</div>}
                    </div>
                    <div className="text-right text-[10px] text-muted-foreground">
                      <div>{test.testedBy || "Admin"}</div>
                      <div>{test.testedAt?.slice(0, 10)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
