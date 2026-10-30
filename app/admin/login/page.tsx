import { redirect } from "next/navigation";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { AdminLoginForm } from "./admin-login-form";

export const metadata = {
  title: "Admin Sign In — Mapify",
  robots: {
    index: false,
    follow: false
  }
};

export default async function AdminLoginPage() {
  const session = await getAuthenticatedAdmin();

  // If already logged in as an active administrator, redirect to dashboard
  if (session) {
    redirect("/admin");
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Subtle ambient background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.08),transparent_40%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.06),transparent_40%)]" />

      <div className="w-full max-w-md relative z-10">
        <AdminLoginForm />
      </div>
    </main>
  );
}

