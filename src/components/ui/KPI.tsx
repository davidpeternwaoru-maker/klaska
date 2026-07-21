"use client";

import type { ReactNode } from "react";
import { Card } from "./primitives";
import { CountUp } from "./CountUp";
import { Icon, type IconName } from "./Icon";

/**
 * Premium stat card — small label, large confident number, a subtle colored
 * delta with a quiet context line. Spacious and calm.
 */
export function KPI({
  label,
  value,
  delta,
  deltaTone = "forest",
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "forest" | "green" | "red" | "amber";
  sub?: string;
  icon?: IconName;
  accent?: ReactNode;
}) {
  const up = deltaTone === "forest" || deltaTone === "green";
  const down = deltaTone === "red";
  const deltaColor = down ? "var(--color-red)" : up ? "var(--color-green)" : "var(--color-amber-2)";

  return (
    <Card hover pad={18} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-4">{label}</span>
        {icon && (
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[var(--radius-card)] bg-secondary text-ink-3">
            <Icon name={icon} size={16} />
          </span>
        )}
      </div>

      <div className="font-display text-[28px] font-bold leading-none tracking-[-0.03em] text-ink">
        <CountUp value={value} />
      </div>

      <div className="flex items-center gap-2">
        {delta && (
          <span
            className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold"
            style={{ color: deltaColor, background: down ? "var(--color-red-soft)" : up ? "var(--color-green-soft)" : "var(--color-amber-soft)" }}
          >
            {(up || down) && <Icon name={down ? "arrowD" : "arrowU"} size={12} />}
            {delta}
          </span>
        )}
        {sub && <span className="min-w-0 flex-1 truncate text-[12px] text-ink-4">{sub}</span>}
      </div>

      {accent}
    </Card>
  );
}
