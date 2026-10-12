import React from "react";
import clsx from "clsx";

export type BadgeVariant =
  | "slate"
  | "teal"
  | "emerald"
  | "amber"
  | "rose"
  | "blue"
  | "purple"
  | "indigo"
  | "blush"
  | "lavender"
  | "plum"
  | "ivory";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

export function Badge({ children, variant = "slate", className, dot }: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    slate: "bg-slate-800/80 text-slate-300 border-slate-700/80",
    ivory: "bg-slate-800/80 text-slate-300 border-slate-700/80",
    blush: "bg-blue-500/10 text-blue-300 border-blue-500/25",
    lavender: "bg-indigo-500/10 text-indigo-300 border-indigo-500/25",
    plum: "bg-slate-800/90 text-slate-200 border-slate-700",
    teal: "bg-blue-500/10 text-blue-300 border-blue-500/25",
    emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
    amber: "bg-amber-500/10 text-amber-300 border-amber-500/25",
    rose: "bg-rose-500/10 text-rose-300 border-rose-500/25",
    blue: "bg-blue-500/10 text-blue-300 border-blue-500/25",
    purple: "bg-violet-500/10 text-violet-300 border-violet-500/25",
    indigo: "bg-indigo-500/10 text-indigo-300 border-indigo-500/25",
  };

  const dotStyles: Record<BadgeVariant, string> = {
    slate: "bg-slate-400",
    ivory: "bg-slate-400",
    blush: "bg-blue-400",
    lavender: "bg-indigo-400",
    plum: "bg-slate-300",
    teal: "bg-blue-400",
    emerald: "bg-emerald-400",
    amber: "bg-amber-400",
    rose: "bg-rose-400",
    blue: "bg-blue-400",
    purple: "bg-violet-400",
    indigo: "bg-indigo-400",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-tight border transition-colors",
        variantStyles[variant],
        className
      )}
    >
      {dot && <span className={clsx("w-1.5 h-1.5 rounded-full", dotStyles[variant])} />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "COMPLETED":
    case "DELIVERED":
    case "READ":
    case "GRANTED":
      return <Badge variant="emerald" dot>{status}</Badge>;
    case "SCHEDULED":
    case "PENDING":
      return <Badge variant="amber" dot>{status}</Badge>;
    case "PROCESSING":
    case "RUNNING":
      return <Badge variant="indigo" dot>{status}</Badge>;
    case "SENT":
      return <Badge variant="blue" dot>{status}</Badge>;
    case "FAILED":
    case "REVOKED":
      return <Badge variant="rose" dot>{status}</Badge>;
    case "OPTED_OUT_SKIPPED":
      return <Badge variant="purple" dot>OPT-OUT SKIPPED</Badge>;
    case "DRAFT":
      return <Badge variant="slate">{status}</Badge>;
    case "CANCELLED":
      return <Badge variant="slate">{status}</Badge>;
    default:
      return <Badge variant="slate">{status}</Badge>;
  }
}
