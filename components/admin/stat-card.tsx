import { Badge } from "@/components/ui/badge";

type Props = {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "accent" | "success" | "warning";
};

export function StatCard({ label, value, detail, tone = "default" }: Props) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <Badge variant={tone}>{label}</Badge>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}
