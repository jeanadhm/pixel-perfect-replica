import { useDemo } from "@/lib/demo/store";
import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, FlaskConical, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function DemoBadge() {
  const { workspace } = useDemo();
  return (
    <Badge variant={workspace === "demo" ? "demo" : "info"} className="gap-1">
      <FlaskConical className="size-3" />
      {workspace === "demo" ? "Données de démonstration" : "Espace AMBS · suivi local"}
    </Badge>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  geo,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  geo?: boolean;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-2">
          {geo && <Badge variant="geo">IA générative</Badge>}
          <DemoBadge />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("card-surface", className)}>
      {title && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Delta({
  value,
  suffix = " %",
  invert,
  className,
}: {
  value: number;
  suffix?: string;
  invert?: boolean;
  className?: string;
}) {
  if (!value || !isFinite(value))
    return <span className={cn("text-xs text-muted-foreground", className)}>—</span>;
  const good = invert ? value < 0 : value > 0;
  const Icon = value > 0 ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold tabular",
        good ? "text-success" : "text-destructive",
        className,
      )}
    >
      <Icon className="size-3" />
      {Math.abs(value).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}
      {suffix}
    </span>
  );
}

export function Kpi({
  label,
  value,
  sub,
  icon: Icon,
  delta,
  tone = "primary",
  extra,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: LucideIcon;
  delta?: ReactNode;
  tone?: "primary" | "geo" | "success" | "danger";
  extra?: ReactNode;
}) {
  const toneCls = {
    primary: "bg-primary/10 text-primary",
    geo: "bg-geo/10 text-geo",
    success: "bg-success/12 text-success",
    danger: "bg-destructive/10 text-destructive",
  }[tone];
  return (
    <div className="card-surface flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {Icon && (
          <span className={cn("grid size-7 place-items-center rounded-md", toneCls)}>
            <Icon className="size-3.5" />
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight tabular">{value}</span>
        {delta}
      </div>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      {extra}
    </div>
  );
}

export function SortHead<K extends string>({
  label,
  k,
  sort,
  onSort,
  className,
}: {
  label: string;
  k: K;
  sort: { key: K; dir: 1 | -1 };
  onSort: (k: K) => void;
  className?: string;
}) {
  const active = sort.key === k;
  const Icon = !active ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
  return (
    <button
      onClick={() => onSort(k)}
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap font-medium hover:text-foreground",
        active && "text-foreground",
        className,
      )}
    >
      {label}
      <Icon className="size-3 opacity-60" />
    </button>
  );
}

export function useSorter<T, K extends string>(
  rows: T[],
  sort: { key: K; dir: 1 | -1 },
  get: (r: T, k: K) => string | number | null,
) {
  return [...rows].sort((a, b) => {
    const x = get(a, sort.key),
      y = get(b, sort.key);
    if (x === y) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return (x > y ? 1 : -1) * sort.dir;
  });
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export function Empty({ text = "Aucun résultat pour ces filtres." }: { text?: string }) {
  return <div className="py-10 text-center text-sm text-muted-foreground">{text}</div>;
}
