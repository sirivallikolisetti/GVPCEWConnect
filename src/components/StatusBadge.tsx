import { cn } from "@/lib/utils";
import type { LiveStatus } from "@/lib/data";

const styles: Record<LiveStatus["status"], { dot: string; box: string }> = {
  available: { dot: "bg-success", box: "bg-success-soft text-success" },
  busy: { dot: "bg-destructive", box: "bg-destructive-soft text-destructive" },
  cancelled: { dot: "bg-warning", box: "bg-warning-soft text-warning" },
  off: { dot: "bg-muted-foreground", box: "bg-muted text-muted-foreground" },
};

export function StatusBadge({ status, label, className }: { status: LiveStatus["status"]; label: string; className?: string }) {
  const s = styles[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", s.box, className)}>
      <span className={cn("size-2 rounded-full", s.dot)} />
      {label}
    </span>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const ini = name
    .replace(/^(Dr|Mr|Mrs|Ms|Prof)\.?\s+/i, "")
    .split(/[\s.]+/)
    .filter((p) => p.length > 1)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  return (
    <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary", className)}>
      {ini || "?"}
    </div>
  );
}
