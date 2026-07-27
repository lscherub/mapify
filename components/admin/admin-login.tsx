"use client";

import { useState, type FormEvent } from "react";
import { LockKeyhole, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  routeSlug: string;
};

export function AdminLogin({ routeSlug }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        toast.error("Invalid admin credentials");
        return;
      }

      window.location.reload();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="glass-panel w-full max-w-md rounded-[2rem] p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Private route</p>
            <h1 className="text-2xl font-semibold tracking-tight">Admin access</h1>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Enter the credentials for the hidden admin route. This route is {`/${routeSlug}`}.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <Input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Username"
            autoComplete="username"
          />
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            autoComplete="current-password"
          />
          <Button type="submit" className="w-full" disabled={submitting}>
            <LogIn className="h-4 w-4" />
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </main>
  );
}
