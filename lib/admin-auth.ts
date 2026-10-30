import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import crypto from "crypto";

export type AdminProfile = {
  id: string;
  email: string;
  userId?: string | null;
  isActive: boolean;
  role: string;
  createdAt?: string;
};

export type AdminAuthSession = {
  user: User;
  admin: AdminProfile;
};

/**
 * Server-side authorization check.
 * Strictly verifies that:
 * 1. The user has an authenticated Supabase session.
 * 2. The user has a corresponding record in public.admins.
 * 3. The admin record is explicitly active (is_active === true).
 */
export async function getAuthenticatedAdmin(): Promise<AdminAuthSession | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  try {
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user || !user.email) {
      return null;
    }

    const adminClient = createSupabaseAdminClient();
    if (!adminClient) {
      // In local dev without service role, fallback check using server client with RLS
      const { data: adminRecord } = await supabase
        .from("admins")
        .select("id, email, user_id, is_active, role, created_at")
        .eq("email", user.email)
        .single();

      if (!adminRecord || adminRecord.is_active === false) {
        return null;
      }

      return {
        user,
        admin: {
          id: adminRecord.id,
          email: adminRecord.email,
          userId: adminRecord.user_id,
          isActive: adminRecord.is_active !== false,
          role: adminRecord.role || "admin",
          createdAt: adminRecord.created_at
        }
      };
    }

    // Query public.admins by user_id OR email
    const { data: adminRecord, error: adminError } = await adminClient
      .from("admins")
      .select("id, email, user_id, is_active, role, created_at")
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .limit(1)
      .maybeSingle();

    if (adminError || !adminRecord) {
      return null;
    }

    // Check if administrator has been deactivated
    if (adminRecord.is_active === false) {
      return null;
    }

    // Auto-link user_id if this admin account was seeded by email without user_id
    if (!adminRecord.user_id) {
      await adminClient
        .from("admins")
        .update({ user_id: user.id, updated_at: new Date().toISOString() })
        .eq("id", adminRecord.id);
    }

    return {
      user,
      admin: {
        id: adminRecord.id,
        email: adminRecord.email,
        userId: user.id,
        isActive: true,
        role: adminRecord.role || "admin",
        createdAt: adminRecord.created_at
      }
    };
  } catch (error) {
    console.error("Error authenticating admin:", error);
    return null;
  }
}

// ================= Legacy Support (backward compatibility) =================

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
  const adminSession = await getAuthenticatedAdmin();
  if (adminSession) {
    return adminSession.admin.email;
  }
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
  return crypto.createHmac("sha256", secret || "fallback-secret").update(payload).digest("base64url");
}

function timingSafeEqualHex(a: string, b: string) {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function timingSafeEqualString(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
