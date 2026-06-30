import { useSyncExternalStore } from "react";

/* ------------------------------------------------------------------
   Promotions store — persistent per-student overrides that move a
   student up the class ladder (or graduate SSS 3), with a recorded
   history. Pure helpers (getLevelOverride / getStatusOverride) are
   read by niceClass etc. so promotions reflect across the whole app.
   ------------------------------------------------------------------ */

export const PROMO_SESSION = "2025/2026";

// canonical ordering (kept in sync with data/people LEVELS)
const ORDER = [
  "Crèche", "KG 1", "KG 2", "Nursery 1", "Nursery 2",
  "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
  "JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3",
];

export function nextLevel(level: string): string {
  const i = ORDER.indexOf(level);
  if (i < 0) return level;
  return i >= ORDER.length - 1 ? "Graduated" : ORDER[i + 1];
}

export type PromoEvent = { date: string; title: string; meta: string };
type Override = { level?: string; status?: string; history: PromoEvent[] };
type State = Record<string, Override>;

const KEY = "klaska.promotions.v1";
let STATE: State = {};
let snapshot: State = STATE;
const listeners = new Set<() => void>();
let hydrated = false;

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      STATE = JSON.parse(raw) as State;
      snapshot = STATE;
      listeners.forEach((l) => l());
    }
  } catch {
    /* ignore */
  }
}

function emit() {
  snapshot = { ...STATE };
  STATE = snapshot;
  try {
    localStorage.setItem(KEY, JSON.stringify(STATE));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function getLevelOverride(id: string): string | null {
  return STATE[id]?.level ?? null;
}
export function getStatusOverride(id: string): string | null {
  return STATE[id]?.status ?? null;
}
export function getPromoHistory(id: string): PromoEvent[] {
  return STATE[id]?.history ?? [];
}
export function hasPromotions(): boolean {
  return Object.keys(STATE).length > 0;
}

/** Record a promotion / repeat for a single student. */
export function recordPromotion(id: string, fromLevel: string, arm: string, action: "promote" | "repeat") {
  const cur: Override = STATE[id] || { history: [] };
  const hist = [...(cur.history || [])];
  if (action === "repeat") {
    hist.unshift({ date: PROMO_SESSION, title: "Repeated", meta: `Held back in ${fromLevel} ${arm} for the new session` });
    STATE = { ...STATE, [id]: { ...cur, history: hist } };
  } else {
    const target = nextLevel(fromLevel);
    if (target === "Graduated") {
      hist.unshift({ date: PROMO_SESSION, title: "Graduated", meta: "Completed SSS 3 — moved to alumni" });
      STATE = { ...STATE, [id]: { ...cur, status: "graduated", history: hist } };
    } else {
      hist.unshift({ date: PROMO_SESSION, title: "Promoted", meta: `${fromLevel} ${arm} → ${target} ${arm} (${PROMO_SESSION})` });
      STATE = { ...STATE, [id]: { ...cur, level: target, history: hist } };
    }
  }
  emit();
}

export function resetPromotions() {
  STATE = {};
  emit();
}

const subscribe = (l: () => void) => {
  hydrate();
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => snapshot;
const getServerSnapshot = () => EMPTY;
const EMPTY: State = {};

export function usePromotions() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
