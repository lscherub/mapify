"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { type ReactNode, useEffect, useState } from "react";
import { RegisterServiceWorker } from "@/components/register-service-worker";

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {mounted ? <RegisterServiceWorker /> : null}
      {children}
      <Toaster richColors closeButton position="top-center" />
    </ThemeProvider>
  );
}
