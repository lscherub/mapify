"use client";

import { LogOut, ShieldCheck, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { type AdminProfile } from "@/lib/admin-auth";

type Props = {
  title: string;
  description: string;
  admin?: AdminProfile;
};

export function AdminHeader({ title, description, admin }: Props) {
  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      window.location.href = "/admin/login";
    }
  };

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Mapify Administration
          </p>
          <Badge variant="success" className="text-[10px] py-0 px-2 gap-1 font-medium">
            <ShieldCheck className="h-3 w-3" />
            Active Session
          </Badge>
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {admin && (
          <div className="flex items-center gap-2 rounded-2xl bg-secondary/60 px-3.5 py-2 border border-border/50 text-xs">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold">{admin.email}</span>
            <Badge variant="accent" className="text-[9px] py-0 px-1.5 uppercase font-bold">
              {admin.role}
            </Badge>
          </div>
        )}
        <ThemeToggle />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="rounded-2xl gap-2 text-xs font-medium h-9"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
