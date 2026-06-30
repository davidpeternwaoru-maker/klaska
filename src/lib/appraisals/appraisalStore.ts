import { useSyncExternalStore } from "react";
import type { AppraisalOverride, RaterEntry, RaterId } from "@/data/appraisals";

/* ------------------------------------------------------------------
   Appraisal store — persistent per-staff overlay on the seeded
   baseline: ratings entered by each rater group, plus the principal's
   formal sign-off. Read by the Appraisals page; survives reloads.
   ------------------------------------------------------------------ */

type State = Record<string, AppraisalOverride>;

const KEY = "klaska.appraisals.v1";
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

export function getAppraisalOverride(id: string): AppraisalOverride | undefined {
  return STATE[id];
}

/** Record (or update) one rater group's scores + comment for a staff member. */
export function saveRating(id: string, rater: RaterId, ratings: Record<string, number>, comment: string, by: string) {
  const cur: AppraisalOverride = STATE[id] || {};
  const entry: RaterEntry = { ratings, comment, by, date: "Updated this cycle" };
  STATE = { ...STATE, [id]: { ...cur, entries: { ...(cur.entries || {}), [rater]: entry } } };
  emit();
}

/** Principal formally signs and confirms the appraisal (locks it). */
export function signOffAppraisal(id: string, by: string) {
  const cur: AppraisalOverride = STATE[id] || {};
  const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  STATE = { ...STATE, [id]: { ...cur, signed: { by, date }, reopened: false } };
  emit();
}

export function reopenAppraisal(id: string) {
  const cur: AppraisalOverride = STATE[id] || {};
  STATE = { ...STATE, [id]: { ...cur, signed: null, reopened: true } };
  emit();
}

export function resetAppraisals() {
  STATE = {};
  emit();
}

export function hasAppraisalEdits(): boolean {
  return Object.keys(STATE).length > 0;
}

const subscribe = (l: () => void) => {
  hydrate();
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => snapshot;
const EMPTY: State = {};
const getServerSnapshot = () => EMPTY;

export function useAppraisals() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
