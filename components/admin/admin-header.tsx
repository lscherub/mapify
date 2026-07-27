import { Badge } from "@/components/ui/badge";

type Props = {
  title: string;
  description: string;
};

export function AdminHeader({ title, description }: Props) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Admin
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <Badge variant="warning">Protected later with auth</Badge>
    </div>
  );
}
