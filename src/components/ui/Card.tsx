import React from "react";
import clsx from "clsx";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
  glass?: boolean;
}

export function Card({
  children,
  interactive = false,
  glass = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl border transition-all",
        glass
          ? "futuristic-glass-card"
          : "bg-[#0B1120] border-slate-800/80 shadow-soft",
        interactive && "hover:border-slate-700 hover:-translate-y-0.5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
