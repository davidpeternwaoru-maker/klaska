/* ------------------------------------------------------------------
   Offline-first foundation (v1).

   Staff can record data (attendance, scores, payments…) while offline.
   Each write becomes a "pending op" persisted to localStorage. When the
   network returns, the queue is flushed to the server automatically.

   This v1 deliberately keeps it simple: a durable FIFO queue + a pluggable
   `flush` transport. No conflict resolution yet — that's a later milestone.
   Swap localStorage for IndexedDB and the simulated transport for real
   `fetch` calls without changing the React layer.
   ------------------------------------------------------------------ */

export type PendingOp = {
  id: string;
  /** e.g. "attendance.mark", "fees.recordPayment", "scores.save" */
  type: string;
  payload: unknown;
  createdAt: number;
};

const KEY = "klaska.offline.queue.v1";

export function loadQueue(): PendingOp[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingOp[]) : [];
  } catch {
    return [];
  }
}

export function saveQueue(ops: PendingOp[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ops));
  } catch {
    /* storage full / unavailable — ignore for v1 */
  }
}

export function makeOp(type: string, payload: unknown): PendingOp {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `op_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type,
    payload,
    createdAt: Date.now(),
  };
}

/**
 * Transport for a single op. In v1 this simulates a server round-trip so the
 * sync states are demonstrable. Replace the body with a real API call later:
 *   await fetch(`/api/sync`, { method: "POST", body: JSON.stringify(op) })
 */
export async function flushOp(op: PendingOp): Promise<void> {
  void op; // (op will be POSTed to the sync endpoint once the backend exists)
  await new Promise((r) => setTimeout(r, 550));
}
