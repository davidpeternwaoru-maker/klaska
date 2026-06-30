import { useSyncExternalStore } from "react";

/* ------------------------------------------------------------------
   School configuration — departments + flexible class structure.
   Persisted to localStorage and read by pure helpers (niceClass,
   deptName) so renamed labels reflect across the whole app.
   ------------------------------------------------------------------ */

// Canonical, ordered level keys (ordering is fixed so promotion stays intact).
export const LEVEL_KEYS = [
  "Crèche", "KG 1", "KG 2", "Nursery 1", "Nursery 2",
  "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
  "JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3",
] as const;

export type Department = { id: string; name: string };

export type SchoolConfig = {
  /** level key -> custom display label (e.g. "Primary 1" -> "Year 1") */
  classLabels: Record<string, string>;
  /** level key -> arms list (for the Settings structure editor) */
  arms: Record<string, string[]>;
  /** level keys the school has turned off */
  disabledLevels: string[];
  /** SS departments, renameable; default Science / Arts / Commercial */
  departments: Department[];
};

export const DEFAULT_DEPARTMENTS: Department[] = [
  { id: "science", name: "Science" },
  { id: "arts", name: "Arts" },
  { id: "commercial", name: "Commercial" },
];

const DEFAULT_ARMS: Record<string, string[]> = Object.fromEntries(LEVEL_KEYS.map((k) => [k, ["A", "B"]]));

export const DEFAULT_CONFIG: SchoolConfig = {
  classLabels: {},
  arms: DEFAULT_ARMS,
  disabledLevels: [],
  departments: DEFAULT_DEPARTMENTS,
};

const KEY = "klaska.schoolConfig.v1";

// ---- store ----
let CONFIG: SchoolConfig = DEFAULT_CONFIG;
let snapshot: SchoolConfig = DEFAULT_CONFIG;
const listeners = new Set<() => void>();
let hydrated = false;

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(CONFIG));
  } catch {
    /* ignore */
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SchoolConfig>;
      CONFIG = { ...DEFAULT_CONFIG, ...parsed, arms: { ...DEFAULT_ARMS, ...(parsed.arms || {}) } };
      snapshot = CONFIG;
      listeners.forEach((l) => l());
    }
  } catch {
    /* ignore */
  }
}

function emit() {
  snapshot = { ...CONFIG };
  CONFIG = snapshot;
  listeners.forEach((l) => l());
}

export function updateConfig(patch: Partial<SchoolConfig>) {
  CONFIG = { ...CONFIG, ...patch };
  persist();
  emit();
}

const subscribe = (l: () => void) => {
  hydrate();
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => snapshot;
const getServerSnapshot = () => DEFAULT_CONFIG;

export function useSchoolConfig() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ---- plain helpers (read the module mirror; safe in non-React code) ----
export function getClassLabel(level: string): string {
  return CONFIG.classLabels[level] || level;
}
export function getDeptName(id: string | null | undefined): string {
  if (!id) return "";
  return CONFIG.departments.find((d) => d.id === id)?.name ?? id;
}
export function getDepartments(): Department[] {
  return CONFIG.departments;
}
