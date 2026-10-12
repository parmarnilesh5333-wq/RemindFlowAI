import React from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import clsx from "clsx";

export type AlertType = "info" | "success" | "warning" | "error";

interface AlertProps {
  type?: AlertType;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Alert({ type = "info", title, children, className }: AlertProps) {
  const styles: Record<AlertType, { bg: string; text: string; icon: any; iconColor: string }> = {
    info: {
      bg: "bg-blue-500/10 border-blue-500/25",
      text: "text-blue-100",
      icon: Info,
      iconColor: "text-blue-400",
    },
    success: {
      bg: "bg-emerald-500/10 border-emerald-500/25",
      text: "text-emerald-100",
      icon: CheckCircle2,
      iconColor: "text-emerald-400",
    },
    warning: {
      bg: "bg-amber-500/10 border-amber-500/25",
      text: "text-amber-100",
      icon: AlertTriangle,
      iconColor: "text-amber-400",
    },
    error: {
      bg: "bg-rose-500/10 border-rose-500/25",
      text: "text-rose-100",
      icon: AlertCircle,
      iconColor: "text-rose-400",
    },
  };

  const current = styles[type];
  const Icon = current.icon;

  return (
    <div className={clsx("p-4 rounded-xl border flex gap-3 text-xs leading-relaxed", current.bg, className)}>
      <Icon className={clsx("w-4 h-4 flex-shrink-0 mt-0.5", current.iconColor)} />
      <div className={clsx("flex-1", current.text)}>
        {title && <h5 className="font-bold mb-1 text-sm text-white">{title}</h5>}
        <div className="leading-relaxed font-medium">{children}</div>
      </div>
    </div>
  );
}
