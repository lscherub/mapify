const COOKIE_NAME = "mapify_admin_session";

export async function verifyAdminSessionEdge(token?: string | null) {
  if (!token) return null;

  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  if (!secret) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = await signPayload(payload, secret);
  if (!constantTimeEqual(signature, expectedSignature)) return null;

  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as { username?: string; exp?: number };
    if (!parsed.username || typeof parsed.exp !== "number") return null;
    if (Date.now() > parsed.exp) return null;
    return parsed.username;
  } catch {
    return null;
  }
}

export function getAdminCookieName() {
  return COOKIE_NAME;
}

async function signPayload(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return new TextDecoder().decode(Uint8Array.from(atob(padded), (char) => char.charCodeAt(0)));
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
