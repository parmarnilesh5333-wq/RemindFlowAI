import React from "react";
import clsx from "clsx";

export type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 text-white shadow-[0_6px_20px_-4px_rgba(37,99,235,0.5)]",
    secondary:
      "bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-slate-600",
    outline:
      "bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/25",
    danger:
      "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_6px_20px_-4px_rgba(225,29,72,0.45)]",
    ghost:
      "bg-transparent hover:bg-slate-800/80 text-slate-400 hover:text-white",
  };

  const sizeClasses: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-xs rounded-xl",
    md: "px-4 py-2.5 text-xs sm:text-sm rounded-xl",
    lg: "px-7 py-3.5 text-sm sm:text-base rounded-xl",
  };

  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
