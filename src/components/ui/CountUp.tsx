"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animate a formatted numeric string up to its value on mount.
 * Handles "₦52.4M", "92%", "384". Initialises to the FINAL value so it is
 * always correct even if rAF never fires (background tab / reduced motion).
 */
export function CountUp({ value, duration = 850 }: { value: string; duration?: number }) {
  const text = String(value);
  const m = text.match(/^([^\d-]*)(-?[\d,]+(?:\.\d+)?)(.*)$/);
  const skip = !m || /\d/.test(m[3]); // suffix has a digit → multiple numbers, don't animate

  const target = skip ? 0 : parseFloat(m![2].replace(/,/g, ""));
  const decimals = skip ? 0 : (m![2].split(".")[1] || "").length;
  const hasComma = !skip && m![2].includes(",");
  const prefix = skip ? "" : m![1];
  const suffix = skip ? "" : m![3];

  const fmt = (v: number) => {
    const n = decimals > 0 ? v.toFixed(decimals) : String(Math.round(v));
    if (!hasComma) return n;
    const [int, dec] = n.split(".");
    const withCommas = parseInt(int, 10).toLocaleString("en-NG");
    return dec ? `${withCommas}.${dec}` : withCommas;
  };

  // Initialised to the FINAL value so it's correct even if rAF never fires.
  const [disp, setDisp] = useState(prefix + fmt(target) + suffix);
  const ran = useRef(false);

  useEffect(() => {
    if (skip || ran.current) return;
    ran.current = true;
    let raf = 0;
    let start = 0;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      // setState here is deferred inside requestAnimationFrame, not synchronous.
      setDisp(prefix + fmt(target * ease(p)) + suffix);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // Non-numeric strings (e.g. "28 / 35") render verbatim — no animation.
  return <span>{skip ? text : disp}</span>;
}
