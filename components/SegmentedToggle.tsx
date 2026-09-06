"use client";

import type { ComponentType } from "react";

type SegmentedToggleOption<T extends string> = {
  value: T;
  label: string;
  icon?: ComponentType<{ size?: number; strokeWidth?: number }>;
};

type SegmentedToggleProps<T extends string> = {
  options: SegmentedToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  fullWidth?: boolean;
  className?: string;
};

export default function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  fullWidth = false,
  className = "",
}: SegmentedToggleProps<T>) {
  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full bg-black/5 p-1 dark:bg-white/10 ${
        fullWidth ? "flex w-full" : ""
      } ${className}`}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              fullWidth ? "flex-1" : ""
            } ${
              active
                ? "bg-accent text-white"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            {Icon && <Icon size={14} strokeWidth={1.75} />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
