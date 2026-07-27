import { Upload, FileDown, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ImportCard() {
  return (
    <div className="rounded-[2rem] border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">CSV import</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Scaffolded for later. Wire this to a secure admin-only route when auth is ready.
          </p>
        </div>
        <ShieldAlert className="h-5 w-5 text-amber-500" />
      </div>

      <div className="mt-5 grid gap-3">
        <Button type="button" variant="outline" className="justify-start rounded-2xl">
          <Upload className="h-4 w-4" />
          Upload CSV
        </Button>
        <Button type="button" variant="secondary" className="justify-start rounded-2xl">
          <FileDown className="h-4 w-4" />
          Download import template
        </Button>
      </div>
    </div>
  );
}
