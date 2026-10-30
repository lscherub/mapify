export type SpeedTestProgress = {
  stage: "idle" | "ping" | "download" | "upload" | "complete" | "error";
  percent: number; // 0 to 100
  latencyMs?: number;
  jitterMs?: number;
  downloadMbps?: number;
  uploadMbps?: number;
  message?: string;
};

export type SpeedTestResult = {
  latencyMs: number;
  jitterMs: number;
  downloadMbps: number;
  uploadMbps: number;
};

export async function runSpeedTest(
  onProgress?: (progress: SpeedTestProgress) => void,
  abortSignal?: AbortSignal
): Promise<SpeedTestResult> {
  const update = (p: Partial<SpeedTestProgress>) => {
    onProgress?.({
      stage: p.stage || "idle",
      percent: p.percent ?? 0,
      latencyMs: p.latencyMs,
      jitterMs: p.jitterMs,
      downloadMbps: p.downloadMbps,
      uploadMbps: p.uploadMbps,
      message: p.message
    });
  };

  // ==========================================
  // STAGE 1: Latency & Jitter (Ping)
  // ==========================================
  update({ stage: "ping", percent: 5, message: "Measuring latency & jitter..." });

  const pings: number[] = [];
  const pingCount = 6;

  for (let i = 0; i < pingCount; i++) {
    if (abortSignal?.aborted) throw new Error("Test aborted by user");

    const start = performance.now();
    try {
      await fetch(`/api/speedtest/ping?t=${Date.now()}_${i}`, {
        method: "GET",
        cache: "no-store",
        signal: abortSignal
      });
      const rtt = Math.round(performance.now() - start);
      pings.push(rtt);
    } catch (err: any) {
      if (err.name === "AbortError") throw err;
      // Skip dropped packet
    }

    const currentLat = pings.length ? Math.round(pings.reduce((a, b) => a + b, 0) / pings.length) : 0;
    update({
      stage: "ping",
      percent: Math.round(5 + ((i + 1) / pingCount) * 20),
      latencyMs: currentLat,
      message: `Pinging test server (${i + 1}/${pingCount})...`
    });

    // Small delay between pings
    await new Promise((r) => setTimeout(r, 60));
  }

  if (pings.length === 0) {
    throw new Error("Could not reach speed test server. Please check your internet connection.");
  }

  const avgLatency = Math.round(pings.reduce((a, b) => a + b, 0) / pings.length);

  // Compute Jitter: mean absolute deviation of consecutive RTTs
  let totalJitterDiff = 0;
  for (let i = 1; i < pings.length; i++) {
    totalJitterDiff += Math.abs(pings[i] - pings[i - 1]);
  }
  const avgJitter = pings.length > 1 ? Math.round(totalJitterDiff / (pings.length - 1)) : 1;

  update({
    stage: "ping",
    percent: 25,
    latencyMs: avgLatency,
    jitterMs: avgJitter,
    message: `Latency: ${avgLatency}ms, Jitter: ${avgJitter}ms`
  });

  // ==========================================
  // STAGE 2: Download Speed
  // ==========================================
  update({
    stage: "download",
    percent: 30,
    latencyMs: avgLatency,
    jitterMs: avgJitter,
    message: "Testing download throughput..."
  });

  const downloadBytesTarget = 3145728; // 3MB payload
  const dlRes = await fetch(`/api/speedtest/download?bytes=${downloadBytesTarget}&t=${Date.now()}`, {
    method: "GET",
    cache: "no-store",
    signal: abortSignal
  });

  if (!dlRes.ok || !dlRes.body) {
    throw new Error("Download speed test failed to start.");
  }

  const reader = dlRes.body.getReader();
  let receivedBytes = 0;
  const dlStart = performance.now();
  let finalDlMbps = 0;

  while (true) {
    if (abortSignal?.aborted) throw new Error("Test aborted by user");

    const { done, value } = await reader.read();
    if (done) break;

    if (value) {
      receivedBytes += value.length;
      const elapsedSec = Math.max((performance.now() - dlStart) / 1000, 0.05);
      finalDlMbps = parseFloat(((receivedBytes * 8) / (elapsedSec * 1000000)).toFixed(2));

      const dlPercent = Math.min(Math.round(30 + (receivedBytes / downloadBytesTarget) * 35), 65);
      update({
        stage: "download",
        percent: dlPercent,
        latencyMs: avgLatency,
        jitterMs: avgJitter,
        downloadMbps: finalDlMbps,
        message: `Downloading: ${finalDlMbps} Mbps`
      });
    }
  }

  update({
    stage: "download",
    percent: 65,
    latencyMs: avgLatency,
    jitterMs: avgJitter,
    downloadMbps: finalDlMbps,
    message: `Download complete: ${finalDlMbps} Mbps`
  });

  // Brief pause before upload
  await new Promise((r) => setTimeout(r, 120));

  // ==========================================
  // STAGE 3: Upload Speed
  // ==========================================
  update({
    stage: "upload",
    percent: 70,
    latencyMs: avgLatency,
    jitterMs: avgJitter,
    downloadMbps: finalDlMbps,
    message: "Testing upload throughput..."
  });

  // 1.5MB buffer for upload test
  const uploadSize = 1572864;
  const uploadBuffer = new Uint8Array(uploadSize);
  for (let i = 0; i < uploadSize; i++) {
    uploadBuffer[i] = i % 256;
  }

  const ulStart = performance.now();
  const ulRes = await fetch(`/api/speedtest/upload?t=${Date.now()}`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: uploadBuffer,
    cache: "no-store",
    signal: abortSignal
  });

  if (!ulRes.ok) {
    throw new Error("Upload speed test failed.");
  }

  const ulElapsedSec = Math.max((performance.now() - ulStart) / 1000, 0.05);
  const finalUlMbps = parseFloat(((uploadSize * 8) / (ulElapsedSec * 1000000)).toFixed(2));

  update({
    stage: "complete",
    percent: 100,
    latencyMs: avgLatency,
    jitterMs: avgJitter,
    downloadMbps: finalDlMbps,
    uploadMbps: finalUlMbps,
    message: "Test completed successfully!"
  });

  return {
    latencyMs: avgLatency,
    jitterMs: avgJitter,
    downloadMbps: finalDlMbps,
    uploadMbps: finalUlMbps
  };
}

