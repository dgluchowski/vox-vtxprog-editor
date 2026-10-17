"use client";

import { Slider } from "@/components/ui/slider";

export function Knob({
  label,
  value,
  max = 100,
  onChange,
}: {
  label: string;
  value: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  const span = Math.max(1, max);
  const angle = -135 + (value / span) * 270;
  return (
    <label className="flex min-w-0 flex-col items-center gap-1.5">
      <span className="relative grid size-16 place-items-center">
        <svg viewBox="0 0 64 64" className="size-16" aria-hidden="true">
          <circle cx="32" cy="32" r="26" className="fill-[oklch(0.3_0.03_50)]" />
          <circle cx="32" cy="32" r="22" className="fill-[oklch(0.22_0.02_45)]" />
          <line
            x1="32"
            y1="32"
            x2="32"
            y2="14"
            className="stroke-[oklch(0.78_0.12_70)]"
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${angle} 32 32)`}
          />
          <circle cx="32" cy="32" r="3" className="fill-[oklch(0.9_0.03_90)]" />
        </svg>
        <span className="absolute bottom-1 font-mono text-[10px] text-[oklch(0.9_0.02_90)]">
          {value}
        </span>
      </span>
      <span className="text-center text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </span>
      <Slider
        min={0}
        max={max}
        value={[value]}
        onValueChange={(next) => {
          const resolved = Array.isArray(next) ? next[0] : next;
          if (typeof resolved === "number") onChange(resolved);
        }}
        aria-label={label}
      />
    </label>
  );
}
