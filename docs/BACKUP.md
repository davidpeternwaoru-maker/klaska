# Database backup & restore

Klaska's data lives in **Neon Postgres**. There are two layers of backup: Neon's
built-in continuous backups (primary) and periodic logical dumps (secondary,
portable). **Restore drills should be run on a copy, never on production.**

---

## 1. Primary — Neon continuous backup + Point-in-Time Restore (PITR)

Neon continuously backs up the database and lets you restore to **any moment**
within your plan's retention window (7 days on paid tiers; check the project's
_Settings → Storage_). Nothing to configure in the app.

**Restore to a point in time (safe method — via a branch):**
1. Neon Console → the project → **Branches → New branch**.
2. Set **"Include data up to"** to the timestamp _just before_ the incident.
3. Neon creates a branch containing the data as it was at that time.
4. Verify the data on the branch (connect with its connection string).
5. Repoint the app: copy the branch's **pooled** and **direct** connection
   strings into the environment's `DATABASE_URL` / `DIRECT_URL` and redeploy —
   or promote the branch to primary.

This is non-destructive: production is untouched until you deliberately repoint.

**Retention:** confirm the retention window matches your recovery needs; increase
it in Neon if 7 days is not enough for a school-data product.

---

## 2. Secondary — logical dumps (`pg_dump`)

Portable, host-independent snapshots you control (store them in object storage,
e.g. S3/R2, with a lifecycle policy). Useful for long-term archival and for
migrating off Neon entirely.

**Take a backup** (requires the Postgres client tools; uses `DIRECT_URL`):

```bash
node scripts/backup.mjs            # writes backups/klaska-<timestamp>.dump
```

Automate it (daily) with the platform's scheduler / a cron job / a GitHub Action,
and upload the file to encrypted object storage. Keep, e.g., 30 daily + 12
monthly copies.

**Restore a dump** into a fresh/empty database:

```bash
# 1. Point at a NEW empty database (never restore over live data).
# 2. Restore:
pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname "$TARGET_DIRECT_URL" backups/klaska-<timestamp>.dump
# 3. Verify, then repoint the app's DATABASE_URL/DIRECT_URL and redeploy.
```

---

## Recovery checklist (RTO/RPO)

- **RPO** (max data loss): ~0 with Neon PITR; up to 24h with daily dumps alone.
- **RTO** (time to restore): minutes via a Neon branch; longer via `pg_restore`.
- After ANY restore: run `npx prisma migrate status` to confirm the schema
  matches the codebase, then smoke-test login + a read on the restored data.
- Rotate `AUTH_SECRET` only if you suspect it was exposed — note it will log
  every user out (all tokens invalidated).
