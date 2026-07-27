import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "mapify_admin_session";
const SESSION_DAYS = 7;

export function getAdminRouteSlug() {
  return process.env.ADMIN_ROUTE_SLUG ?? "";
}

export function getAdminUsername() {
  return process.env.ADMIN_USERNAME ?? "";
}

export function getAdminPasswordHash() {
  return process.env.ADMIN_PASSWORD_HASH ?? "";
}

export function getAdminSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? "";
}

export function hashAdminPassword(password: string) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function verifyAdminPassword(password: string) {
  const expected = getAdminPasswordHash();
  if (!expected) return false;
  const actual = hashAdminPassword(password);
  return timingSafeEqualHex(actual, expected);
}

export function createAdminSession(username: string) {
  const secret = getAdminSessionSecret();
  const payload = Buffer.from(
    JSON.stringify({
      username,
      exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
    })
  ).toString("base64url");
  const signature = createSignature(payload, secret);
  return `${payload}.${signature}`;
}

export function verifyAdminSession(token?: string | null) {
  if (!token) return null;

  const secret = getAdminSessionSecret();
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = createSignature(payload, secret);
  if (!timingSafeEqualString(signature, expected)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      username?: string;
      exp?: number;
    };

    if (!parsed.username || typeof parsed.exp !== "number") return null;
    if (Date.now() > parsed.exp) return null;

    return parsed.username;
  } catch {
    return null;
  }
}

export async function readAdminSessionFromCookies() {
  const cookieStore = await cookies();
  return verifyAdminSession(cookieStore.get(COOKIE_NAME)?.value);
}

export function createAdminSessionCookie(username: string) {
  return {
    name: COOKIE_NAME,
    value: createAdminSession(username),
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60
  };
}

export function clearAdminSessionCookie() {
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  };
}

function createSignature(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function timingSafeEqualHex(a: string, b: string) {
  return timingSafeEqualString(a, b);
}

function timingSafeEqualString(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}
