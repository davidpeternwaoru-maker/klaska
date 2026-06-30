/* ------------------------------------------------------------------
   Offline engine — a framework-agnostic singleton that owns connectivity,
   the durable write queue, and sync. React subscribes to it via
   `useSyncExternalStore` (see useOffline.ts), so the UI only ever *reads*
   from here — no setState-in-effect, no provider needed.
   ------------------------------------------------------------------ */

import { flushOp, loadQueue, makeOp, saveQueue, type PendingOp } from "./store";

export type SyncStatus = "synced" | "offline" | "syncing";

export type OfflineSnapshot = {
  online: boolean;
  status: SyncStatus;
  pendingCount: number;
  lastSyncedAt: number | null;
};

const SERVER_SNAPSHOT: OfflineSnapshot = {
  online: true,
  status: "synced",
  pendingCount: 0,
  lastSyncedAt: null,
};

class OfflineEngine {
  private listeners = new Set<() => void>();
  private snapshot: OfflineSnapshot = SERVER_SNAPSHOT;
  private online = true;
  private pending: PendingOp[] = [];
  private syncing = false;
  private lastSyncedAt: number | null = null;
  private started = false;

  /** Lazily wire up browser listeners + hydrate the queue (client only). */
  private start() {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
    this.online = navigator.onLine;
    this.pending = loadQueue();
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
    this.recompute();
    if (this.online) void this.flush();
  }

  private handleOnline = () => {
    this.online = true;
    this.recompute();
    void this.flush();
  };

  private handleOffline = () => {
    this.online = false;
    this.recompute();
  };

  private recompute() {
    const status: SyncStatus = !this.online
      ? "offline"
      : this.syncing || this.pending.length > 0
        ? "syncing"
        : "synced";
    this.snapshot = {
      online: this.online,
      status,
      pendingCount: this.pending.length,
      lastSyncedAt: this.lastSyncedAt,
    };
    this.listeners.forEach((l) => l());
  }

  private async flush() {
    if (this.syncing || !this.online) return;
    if (this.pending.length === 0) {
      if (this.lastSyncedAt === null) {
        this.lastSyncedAt = Date.now();
        this.recompute();
      }
      return;
    }
    this.syncing = true;
    this.recompute();
    try {
      // Process FIFO; persist after each op so a mid-flush crash loses nothing.
      while (this.online && this.pending.length > 0) {
        const op = this.pending[0];
        await flushOp(op);
        this.pending = this.pending.slice(1);
        saveQueue(this.pending);
        this.recompute();
      }
      this.lastSyncedAt = Date.now();
    } finally {
      this.syncing = false;
      this.recompute();
    }
  }

  // ---- public API (called from event handlers, never from effects) ----

  subscribe = (listener: () => void) => {
    this.start();
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): OfflineSnapshot => this.snapshot;

  getServerSnapshot = (): OfflineSnapshot => SERVER_SNAPSHOT;

  /** Persist a mutation; flush now if online, otherwise queue for later. */
  enqueue = (type: string, payload: unknown = null) => {
    this.start();
    this.pending = [...this.pending, makeOp(type, payload)];
    saveQueue(this.pending);
    this.recompute();
    if (this.online) void this.flush();
  };

  /** Manual retry (e.g. a "Sync now" button). */
  syncNow = () => {
    this.start();
    void this.flush();
  };
}

export const offlineEngine = new OfflineEngine();
