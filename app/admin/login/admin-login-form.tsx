"use client";

import { useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please provide both email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setError(data.error || "Invalid credentials or unauthorized account.");
        setLoading(false);
        return;
      }

      // Hard redirect to dashboard to ensure all cookies and server state refresh cleanly
      window.location.href = "/admin";
    } catch {
      setError("Network error. Please verify your connection.");
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel rounded-[2.5rem] border border-border p-8 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-col items-center text-center space-y-2 mb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-1">
          <Shield className="h-6 w-6" />
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          <Sparkles className="h-3 w-3 text-blue-500" />
          <span>Mapify Admin</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Administrator Portal</h1>
        <p className="text-xs text-muted-foreground max-w-xs">
          Sign in with your authorized administrator credentials to manage places and Wi-Fi networks.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl bg-rose-500/10 p-3.5 text-xs text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Admin Email
          </label>
          <Input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@mapify.app"
            className="rounded-2xl h-11 text-sm bg-background/50"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Password
          </label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="rounded-2xl h-11 pr-11 text-sm bg-background/50"
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

        <Button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl h-11 font-semibold text-sm gap-2 mt-2 shadow-sm"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Authenticating...
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Sign In to Admin
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 pt-5 border-t border-border/50 text-center">
        <p className="text-[11px] text-muted-foreground">
          Protected administrative workspace. Access is restricted to invited administrators.
        </p>
      </div>
    </div>
  );
}

