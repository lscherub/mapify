import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestedBytes = parseInt(searchParams.get("bytes") || "3145728", 10);
  // Restrict between 512KB and 6MB to respect data transfer limits & avoid Vercel timeouts
  const totalBytes = Math.min(Math.max(requestedBytes, 524288), 6291456);

  const chunkSize = 65536; // 64KB chunks
  let bytesSent = 0;

  const dummyChunk = new Uint8Array(chunkSize);
  for (let i = 0; i < chunkSize; i++) {
    dummyChunk[i] = (i % 256);
  }

  const stream = new ReadableStream({
    pull(controller) {
      if (bytesSent >= totalBytes) {
        controller.close();
        return;
      }

      const remaining = totalBytes - bytesSent;
      const currentChunkSize = Math.min(remaining, chunkSize);
      const chunk = currentChunkSize === chunkSize ? dummyChunk : dummyChunk.slice(0, currentChunkSize);

      bytesSent += currentChunkSize;
      controller.enqueue(chunk);
    }
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(totalBytes),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    }
  });
}

