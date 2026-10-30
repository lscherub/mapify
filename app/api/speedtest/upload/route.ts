import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const start = Date.now();
  let receivedBytes = 0;

  try {
    if (request.body) {
      const reader = request.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) receivedBytes += value.length;
      }
    }
  } catch (err) {
    console.error("Upload speed test read error:", err);
  }

  const elapsedMs = Math.max(Date.now() - start, 1);

  return NextResponse.json({
    receivedBytes,
    elapsedMs
  }, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache"
    }
  });
}

