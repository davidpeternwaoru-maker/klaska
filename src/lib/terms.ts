// Nigerian academic calendar helpers (plain module — usable on server & client).
//
// The school year runs September → July in three terms:
//   First Term  : mid-September → mid-December
//   Second Term : early January → early April
//   Third Term  : late April    → late July
// August is the long vacation — we treat it as the run-up to First Term.
// Schools can override all of this in Settings; these are sensible defaults.

export type TermKey = "FIRST" | "SECOND" | "THIRD";

export const TERM_LABEL: Record<TermKey, string> = {
  FIRST: "First Term",
  SECOND: "Second Term",
  THIRD: "Third Term",
};

export const TERM_KEYS: TermKey[] = ["FIRST", "SECOND", "THIRD"];

/** Detect the session + term a given date falls in, with default start/end dates. */
export function detectTerm(now = new Date()): { session: string; term: TermKey; termStart: Date; termEnd: Date } {
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based

  if (m >= 8) {
    // Sept–Dec → First Term of the session starting this year
    return { session: `${y}/${y + 1}`, term: "FIRST", termStart: new Date(y, 8, 15), termEnd: new Date(y, 11, 18) };
  }
  if (m <= 2 || (m === 3 && now.getDate() <= 12)) {
    // Jan–mid-April → Second Term of the session that started last year
    return { session: `${y - 1}/${y}`, term: "SECOND", termStart: new Date(y, 0, 6), termEnd: new Date(y, 3, 10) };
  }
  if (m <= 6) {
    // late April–July → Third Term
    return { session: `${y - 1}/${y}`, term: "THIRD", termStart: new Date(y, 3, 27), termEnd: new Date(y, 6, 24) };
  }
  // August → holiday; point at the upcoming First Term
  return { session: `${y}/${y + 1}`, term: "FIRST", termStart: new Date(y, 8, 15), termEnd: new Date(y, 11, 18) };
}

/** Weeks done / total between two dates (for the sidebar progress bar). */
export function termProgress(start: Date, end: Date, now = new Date()): { weeksDone: number; weeksTotal: number } {
  const wk = 7 * 24 * 60 * 60 * 1000;
  const weeksTotal = Math.max(1, Math.round((end.getTime() - start.getTime()) / wk));
  const weeksDone = Math.min(weeksTotal, Math.max(0, Math.round((now.getTime() - start.getTime()) / wk)));
  return { weeksDone, weeksTotal };
}

export function fmtShortDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
