# Offline sync — current state & safety requirements

## What exists today (honest status)

`src/lib/offline/` is a **v1 foundation / UI prototype**, not a live data-sync
system:

- **Transport is simulated.** `flushOp` in `store.ts` is a 550 ms `setTimeout`
  no-op — it does **not** POST anything to the server. Queued operations drain
  into nothing.
- The durable queue lives in **localStorage** (FIFO, persisted after each op).
- It is consumed only by `components/layout/SyncIndicator.tsx` (a connectivity /
  "pending" status badge). Real writes — attendance, scores, payments — go
  **straight to the server online** through Server Actions.

**Conclusion:** because no offline write actually reaches the server, there is
**no conflict-resolution risk and no possibility of corrupting server data
today.** The engine cannot double-apply or clobber anything, because it applies
nothing.

## Before enabling real offline sync (must-haves)

Turning `flushOp` into a real API call is a **feature**, not a hardening tweak,
and must not ship until these are in place — otherwise it *can* corrupt data:

1. **Idempotency.** Each op already has a stable `id`. The server sync endpoint
   must dedupe on it (store processed op ids per school) so a retry after a
   flaky network can't apply the same payment/score twice.
2. **Conflict strategy, explicitly chosen per entity.** e.g. attendance &
   scores = last-write-wins keyed by (student, date/term) with a server
   timestamp; payments = insert-only + idempotency (never overwrite). Document
   the rule for every synced entity. There is **no** conflict handling in v1.
3. **Durable client storage.** Move from localStorage (~5 MB, synchronous, can
   silently drop on quota) to **IndexedDB**.
4. **Server-authoritative validation.** The sync endpoint must run the SAME
   service + Zod validation + tenant/permission checks as the online path
   (reuse the services — do not trust the queued payload).
5. **Ordering & partial failure.** Keep FIFO, stop-on-first-failure (already
   done), and surface un-syncable ops to the user instead of dropping them.

Until then, the app should be treated as **online-only** for writes.
