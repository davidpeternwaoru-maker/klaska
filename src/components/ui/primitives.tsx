"use client";

import type { CSSProperties, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

/* ----------------------------------------------------------------
   Premium, brand-consistent UI primitives.
   Generous spacing, soft rounded corners, subtle shadows — a calm,
   modern SaaS feel (Linear / Notion / Stripe).
   ---------------------------------------------------------------- */

export function Card({
  children,
  pad = 20,
  hover = false,
  className = "",
  style,
}: {
  children: ReactNode;
  pad?: number;
  hover?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card transition-[transform,box-shadow,border-color] duration-300 ${
        hover ? "hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)] hover:border-forest-line" : ""
      } ${className}`}
      style={{ boxShadow: "var(--shadow-1)", padding: pad, ...style }}
    >
      {children}
    </div>
  );
}

type Tone = "neutral" | "forest" | "amber" | "red" | "green" | "blue";
const TONES: Record<Tone, { fg: string; bg: string }> = {
  neutral: { fg: "var(--color-ink-2)", bg: "var(--color-secondary)" },
  forest: { fg: "var(--color-forest)", bg: "var(--color-forest-soft)" },
  amber: { fg: "var(--color-amber-2)", bg: "var(--color-amber-soft)" },
  red: { fg: "var(--color-red)", bg: "var(--color-red-soft)" },
  green: { fg: "var(--color-green)", bg: "var(--color-green-soft)" },
  blue: { fg: "var(--color-blue)", bg: "var(--color-blue-soft)" },
};

export function Pill({
  children,
  tone = "neutral",
  style,
}: {
  children: ReactNode;
  tone?: Tone;
  style?: CSSProperties;
}) {
  const t = TONES[tone];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium leading-none whitespace-nowrap"
      style={{ background: t.bg, color: t.fg, ...style }}
    >
      {children}
    </span>
  );
}

type ButtonKind = "primary" | "accent" | "ghost" | "soft" | "dark";
const KINDS: Record<ButtonKind, { bg: string; fg: string; bd: string; hover: string; shadow?: string }> = {
  primary: { bg: "var(--color-forest)", fg: "#fff", bd: "var(--color-forest)", hover: "var(--color-forest-2)", shadow: "0 1px 2px rgba(27,94,32,0.25)" },
  accent: { bg: "var(--color-amber)", fg: "#fff", bd: "var(--color-amber)", hover: "var(--color-amber-2)" },
  ghost: { bg: "transparent", fg: "var(--color-ink-2)", bd: "var(--color-border)", hover: "var(--color-secondary)" },
  soft: { bg: "var(--color-secondary)", fg: "var(--color-ink)", bd: "transparent", hover: "#e9e9e5" },
  dark: { bg: "var(--color-ink)", fg: "#fff", bd: "var(--color-ink)", hover: "#000" },
};

export function Button({
  children,
  kind = "primary",
  size = "md",
  icon,
  onClick,
  style,
}: {
  children: ReactNode;
  kind?: ButtonKind;
  size?: "sm" | "md";
  icon?: IconName;
  onClick?: () => void;
  style?: CSSProperties;
}) {
  const k = KINDS[kind];
  const s = size === "sm" ? { h: 32, px: 12, fs: 13, ir: 15 } : { h: 38, px: 15, fs: 13.5, ir: 16 };
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-[10px] font-medium transition-[background,transform,box-shadow] duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.98] whitespace-nowrap"
      style={{
        height: s.h,
        padding: `0 ${s.px}px`,
        fontSize: s.fs,
        background: k.bg,
        color: k.fg,
        border: `1px solid ${k.bd}`,
        boxShadow: k.shadow,
        ...style,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = k.hover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = k.bg)}
    >
      {icon && <Icon name={icon} size={s.ir} />}
      {children}
    </button>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  sub,
  right,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-4">{eyebrow}</div>
        )}
        <h1 className="font-display text-[24px] font-bold leading-tight tracking-[-0.025em] text-ink">{title}</h1>
        {sub && <p className="mt-1 text-[13.5px] text-ink-3">{sub}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

export function Divider() {
  return <div className="h-px w-full bg-border" />;
}

/** Segmented pill tabs — reused across sections. */
export function SegTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-0.5 rounded-[10px] bg-secondary p-1">
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={`h-8 rounded-[7px] px-3.5 text-[13px] font-medium transition ${
              active ? "bg-card text-ink shadow-[0_1px_2px_rgba(20,20,18,0.06)]" : "text-ink-3 hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** Labelled horizontal bar row — for rankings / averages. */
export function BarRow({
  label,
  value,
  max,
  suffix = "%",
  sub,
  tone = "forest",
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  sub?: string;
  tone?: "forest" | "amber" | "red";
}) {
  const color = tone === "amber" ? "var(--color-amber)" : tone === "red" ? "var(--color-red)" : "var(--color-forest)";
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 flex-none truncate text-[13px] font-medium text-ink-2">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} />
      </div>
      <span className="w-24 flex-none text-right text-[12.5px] text-ink-3">
        <span className="font-semibold text-ink">
          {value}
          {suffix}
        </span>
        {sub ? ` · ${sub}` : ""}
      </span>
    </div>
  );
}
