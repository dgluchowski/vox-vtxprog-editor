"use client";

import { useRef, type KeyboardEvent, type PointerEvent, type WheelEvent } from "react";
import { Slider } from "@/components/ui/slider";

export function Knob({
  label,
  value,
  min = 0,
  max = 100,
  defaultValue,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  defaultValue?: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const clamped = Math.min(max, Math.max(min, value));
  const span = Math.max(1, max - min);
  const angle = -135 + ((clamped - min) / span) * 270;
  const shown = format
    ? format(clamped)
    : min === 0 && max === 100
      ? (clamped / 10).toFixed(1)
      : String(clamped);
  const resetTo = defaultValue ?? Math.round((min + max) / 2);
  const drag = useRef<{ y: number; value: number } | null>(null);

  function clamp(next: number) {
    return Math.min(max, Math.max(min, Math.round(next)));
  }

  function stepSize(fine: boolean) {
    const coarse = Math.max(1, Math.round(span / 100));
    return fine ? coarse : Math.max(coarse, Math.round(span / 10));
  }

  function onWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    onChange(clamp(clamped + direction * stepSize(true)));
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { y: event.clientY, value: clamped };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const delta = drag.current.y - event.clientY;
    onChange(clamp(drag.current.value + (delta / 100) * span));
  }

  function endDrag() {
    drag.current = null;
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowUp" || event.key === "ArrowRight") {
      event.preventDefault();
      onChange(clamp(clamped + stepSize(!event.shiftKey)));
    } else if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
      event.preventDefault();
      onChange(clamp(clamped - stepSize(!event.shiftKey)));
    } else if (event.key === "Home") {
      event.preventDefault();
      onChange(min);
    } else if (event.key === "End") {
      event.preventDefault();
      onChange(max);
    }
  }

  return (
    <label
      className="flex min-w-0 flex-col items-center gap-1"
      onDoubleClick={(event) => {
        event.preventDefault();
        onChange(clamp(resetTo));
      }}
    >
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={clamped}
        aria-valuetext={shown}
        className="grid size-16 cursor-ns-resize touch-none place-items-center rounded-full select-none outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
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
      </div>
      <span className="font-mono text-[11px] text-card-foreground tabular-nums">{shown}</span>
      <span className="text-center text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </span>
      <Slider
        className="w-full"
        min={min}
        max={max}
        step={1}
        value={[clamped]}
        aria-label={label}
        aria-valuetext={shown}
        onValueChange={(next) => {
          const resolved = Array.isArray(next) ? next[0] : next;
          if (typeof resolved === "number") onChange(resolved);
        }}
      />
    </label>
  );
}
