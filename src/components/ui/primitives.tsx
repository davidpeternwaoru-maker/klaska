"use client";

import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./Icon";

/* ----------------------------------------------------------------
   Klaska design system — the primitives every screen consumes.
   One token set (globals.css): five-step type scale, two radii
   (12 / 22), a 3-step elevation ladder, motion 120/200/320ms.
   One interaction language: rest → hover → active (press) →
   focus-visible (ring); disabled is visibly quiet.
   ---------------------------------------------------------------- */

/* ============================ Card ============================ */

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
      className={cn(
        "rounded-[var(--radius-card)] border border-border bg-card transition-[transform,box-shadow,border-color] duration-[var(--dur-slow)] ease-[var(--ease-out)]",
        hover && "hover:-translate-y-0.5 hover:border-forest-line hover:shadow-[var(--shadow-glow)]",
        className,
      )}
      style={{ boxShadow: "var(--shadow-1)", padding: pad, ...style }}
    >
      {children}
    </div>
  );
}

/* ============================ Pill ============================ */

const pillVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-medium leading-none",
  {
    variants: {
      tone: {
        neutral: "bg-secondary text-ink-2",
        forest: "bg-forest-soft text-forest",
        amber: "bg-amber-soft text-amber-2",
        red: "bg-red-soft text-red",
        green: "bg-green-soft text-green",
        blue: "bg-blue-soft text-blue",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);
type Tone = NonNullable<VariantProps<typeof pillVariants>["tone"]>;

export function Pill({ children, tone = "neutral", style }: { children: ReactNode; tone?: Tone; style?: CSSProperties }) {
  return (
    <span className={pillVariants({ tone })} style={style}>
      {children}
    </span>
  );
}

/* ============================ Button ============================ */

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-card)] font-medium outline-none transition-[background-color,border-color,transform,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-out)] focus-visible:ring-2 focus-visible:ring-offset-2 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      kind: {
        primary: "bg-forest text-white border border-forest shadow-[0_1px_2px_rgba(27,94,32,0.25)] hover:bg-forest-2 hover:border-forest-2 focus-visible:ring-forest/40",
        accent: "bg-amber text-white border border-amber hover:bg-amber-2 hover:border-amber-2 focus-visible:ring-amber/40",
        ghost: "bg-transparent text-ink-2 border border-border hover:bg-secondary hover:text-ink focus-visible:ring-forest/30",
        soft: "bg-secondary text-ink border border-transparent hover:bg-secondary-2 focus-visible:ring-forest/30",
        dark: "bg-ink text-white border border-ink hover:bg-black focus-visible:ring-ink/40",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-4 text-[13px]",
      },
    },
    defaultVariants: { kind: "primary", size: "md" },
  },
);
type ButtonKind = NonNullable<VariantProps<typeof buttonVariants>["kind"]>;

export function Button({
  children,
  kind = "primary",
  size = "md",
  icon,
  onClick,
  style,
  type = "button",
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  kind?: ButtonKind;
  size?: "sm" | "md";
  icon?: IconName;
  onClick?: () => void;
  style?: CSSProperties;
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cn(buttonVariants({ kind, size }), className)} style={style}>
      {icon && <Icon name={icon} size={size === "sm" ? 15 : 16} />}
      {children}
    </button>
  );
}

/* ============================ Inputs ============================ */

/** The one field style for the whole app — quiet at rest, unmistakable focus. */
export const inputCls =
  "h-10 w-full rounded-[var(--radius-card)] border border-border bg-secondary px-3 text-[13.5px] text-ink outline-none transition-[border-color,background-color,box-shadow] duration-[var(--dur-fast)] placeholder:text-ink-4 hover:border-line-2 focus:border-forest-line focus:bg-card focus:shadow-[var(--ring-focus)] disabled:cursor-not-allowed disabled:opacity-50";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }) {
  const { label, hint, className = "", ...rest } = props;
  const field = <input {...rest} className={cn(inputCls, className)} />;
  if (!label) return field;
  return (
    <label className="block">
      <span className="mb-1 block text-caption font-medium text-ink-2">{label}</span>
      {field}
      {hint && <span className="mt-1 block text-[11.5px] text-ink-4">{hint}</span>}
    </label>
  );
}

/* ============================ Section header ============================ */

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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">{eyebrow}</div>}
        <h1 className="font-display text-title font-bold text-ink">{title}</h1>
        {sub && <p className="mt-1.5 max-w-[62ch] text-caption leading-relaxed text-ink-3">{sub}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}

export function Divider() {
  return <div className="h-px w-full bg-border" />;
}

/* ============================ Segmented tabs ============================ */

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
    <div role="tablist" className="inline-flex flex-wrap gap-0.5 rounded-[var(--radius-card)] bg-secondary p-1">
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              "h-8 rounded-[8px] px-3.5 text-[13px] font-medium outline-none transition-[background-color,color,box-shadow] duration-[var(--dur-fast)] focus-visible:ring-2 focus-visible:ring-forest/30",
              active ? "bg-card text-ink shadow-[0_1px_2px_rgba(20,20,18,0.06)]" : "text-ink-3 hover:bg-card/60 hover:text-ink",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/* ============================ Bar row ============================ */

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
        <div
          className="h-full rounded-full transition-[width] duration-[var(--dur-slow)] ease-[var(--ease-out)]"
          style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }}
        />
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

/* ============================ Skeletons ============================ */

/** Shimmer block — compose these into page-shaped loading states. */
export function Skeleton({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <div className={cn("k-skeleton", className)} style={style} aria-hidden />;
}

/** A whole page's worth of calm loading: header, KPI row, content block. */
export function PageSkeleton({ kpis = 4, table = true }: { kpis?: number; table?: boolean }) {
  return (
    <div className="mx-auto max-w-[1320px]">
      <div className="mb-7">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2.5 h-7 w-64" />
        <Skeleton className="mt-2 h-3.5 w-96 max-w-full" />
      </div>
      {kpis > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: kpis }).map((_, i) => (
            <div key={i} className="rounded-[var(--radius-card)] border border-border bg-card p-[18px]" style={{ boxShadow: "var(--shadow-1)" }}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-8 w-24" />
              <Skeleton className="mt-2.5 h-3 w-16" />
            </div>
          ))}
        </div>
      )}
      {table && (
        <div className="mt-5 overflow-hidden rounded-[var(--radius-card)] border border-border bg-card" style={{ boxShadow: "var(--shadow-1)" }}>
          <div className="border-b border-border p-4">
            <Skeleton className="h-4 w-40" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-border px-5 py-3.5 last:border-0">
              <Skeleton className="h-8 w-8 flex-none rounded-full" />
              <Skeleton className="h-3.5 w-44" />
              <Skeleton className="ml-auto h-3.5 w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================ Empty state ============================ */

export function EmptyState({
  icon = "layers",
  title,
  hint,
  action,
}: {
  icon?: IconName;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-card)] bg-secondary text-ink-4">
        <Icon name={icon} size={22} />
      </span>
      <div className="mt-1 text-heading font-semibold text-ink">{title}</div>
      {hint && <p className="max-w-[40ch] text-[12.5px] leading-relaxed text-ink-4">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
