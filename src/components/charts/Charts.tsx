"use client";

/* Lightweight, dependency-free SVG charts in the Klaska visual language.
   They draw in on mount via a CSS stroke animation (frozen-safe: the resting
   state is fully visible). */

import { useId } from "react";

export type Series = { label: string; value: number };

export function LineChart({
  data,
  height = 130,
  color = "var(--color-forest)",
  fill = "rgba(27,94,32,0.10)",
}: {
  data: Series[];
  height?: number;
  color?: string;
  fill?: string;
}) {
  const gid = useId().replace(/[:]/g, "");
  const w = 520;
  const h = height;
  const padX = 6;
  const padY = 14;
  const max = Math.max(...data.map((d) => d.value)) * 1.08 || 1;
  const min = Math.min(...data.map((d) => d.value)) * 0.92;
  const span = max - min || 1;
  const x = (i: number) => padX + (i * (w - padX * 2)) / (data.length - 1);
  const y = (v: number) => padY + (1 - (v - min) / span) * (h - padY * 2);

  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.value)}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${h - padY} L${x(0)},${h - padY} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`g${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor="rgba(27,94,32,0)" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={padX} x2={w - padX} y1={padY + f * (h - padY * 2)} y2={padY + f * (h - padY * 2)} stroke="var(--color-line)" strokeWidth={1} />
      ))}
      <path d={area} fill={`url(#g${gid})`} className="k-rise" />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ strokeDasharray: 1400, strokeDashoffset: 0, animation: "k-draw 1.05s cubic-bezier(.4,.7,.3,1) backwards" }}
      />
      {data.map((d, i) => (
        <circle key={i} cx={x(i)} cy={y(d.value)} r={2.5} fill="#fff" stroke={color} strokeWidth={1.6} />
      ))}
      <style>{`@keyframes k-draw{from{stroke-dashoffset:1400}to{stroke-dashoffset:0}}`}</style>
    </svg>
  );
}

export function BarChart({
  data,
  height = 130,
  color = "var(--color-forest)",
}: {
  data: Series[];
  height?: number;
  color?: string;
}) {
  const h = height;
  const padY = 14;
  const max = Math.max(...data.map((d) => d.value)) * 1.05 || 1;
  const barW = 100 / data.length;

  return (
    <svg viewBox={`0 0 100 ${h}`} width="100%" height={h} preserveAspectRatio="none">
      {data.map((d, i) => {
        const bh = ((d.value / max) * (h - padY)) || 0;
        return (
          <rect
            key={i}
            x={i * barW + barW * 0.22}
            y={h - bh}
            width={barW * 0.56}
            height={bh}
            rx={1.5}
            fill={color}
            style={{
              transformBox: "fill-box",
              transformOrigin: "bottom",
              animation: `k-grow 0.6s cubic-bezier(.2,.8,.2,1) ${i * 0.04}s backwards`,
            }}
          />
        );
      })}
      <style>{`@keyframes k-grow{from{transform:scaleY(0)}to{transform:scaleY(1)}}`}</style>
    </svg>
  );
}

/** Tiny x-axis label row to pair under a chart. */
export function AxisLabels({ data }: { data: Series[] }) {
  return (
    <div className="mt-2 flex justify-between px-1 text-[10px] font-medium text-ink-4">
      {data.map((d, i) => (
        <span key={i}>{d.label}</span>
      ))}
    </div>
  );
}
