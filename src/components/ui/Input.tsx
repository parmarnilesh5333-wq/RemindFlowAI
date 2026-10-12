import React from "react";
import clsx from "clsx";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
}

export function Input({ label, helperText, className, id, ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-slate-300">
          {label}
        </label>
      )}
      <input
        id={id}
        className={clsx(
          "w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs sm:text-sm text-white placeholder-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all",
          className
        )}
        {...props}
      />
      {helperText && <p className="text-[11px] text-slate-400">{helperText}</p>}
    </div>
  );
}
