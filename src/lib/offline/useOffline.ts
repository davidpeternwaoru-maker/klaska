"use client";

import { useSyncExternalStore } from "react";
import { offlineEngine, type OfflineSnapshot } from "./engine";

/**
 * Read the live offline/sync state. UI only reads — all mutations go through
 * `enqueue` / `syncNow`, which run in event handlers (never in effects).
 */
export function useOffline(): OfflineSnapshot & {
  enqueue: (type: string, payload?: unknown) => void;
  syncNow: () => void;
} {
  const snap = useSyncExternalStore(
    offlineEngine.subscribe,
    offlineEngine.getSnapshot,
    offlineEngine.getServerSnapshot,
  );
  return { ...snap, enqueue: offlineEngine.enqueue, syncNow: offlineEngine.syncNow };
}
