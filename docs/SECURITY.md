# Klaska security posture

State of the backend after the hardening pass (branch `backend-hardening`).
Two parts: **what's in place now**, and **what a professional security auditor
should review before we handle real student data and payments.**

---

## Security measures in place

### Authentication
- Passwords hashed with **bcrypt (work factor 12)**; never stored or logged in
  plaintext. Generic "invalid email or password" (no account enumeration).
- Sessions are **signed JWTs (HS256)** in an **httpOnly, Secure, SameSite=Lax**
  cookie — not readable by browser JS.
- **Token invalidation**: each account has a `tokenVersion` embedded in its
  token; **logout and password reset bump it**, instantly revoking every
  outstanding token for that account. Enforced server-side on each request.
- Signup password minimum 8 chars; env `AUTH_SECRET` validated (≥16) and
  fail-fast at boot.

### Authorization
- A single **permission matrix** (role × area) enforced **server-side on every
  path** — pages (`requireAccess`), services (`requireCan`), and API routes.
  The UI only hides things; the server is the gate.
- Scoped roles enforced in queries (teachers → their classes, HODs → their
  department). Verified: a teacher/bursar calling a forbidden route/endpoint is
  denied (307/403), not just hidden.

### Multi-tenancy isolation
- Every tenant-owned query is **auto-scoped to the caller's school at the data
  layer** (Prisma extension), on top of explicit `schoolId` filtering. Proven
  with a two-school test: an unscoped query returns only the caller's rows.

### Brute force & rate limiting
- **Login lockout** after repeated failures per email and per IP (DB-backed).
- **Per-IP rate limiting** on `/api/v1/*`, via an **atomic** counter (safe under
  concurrency). Proven: a burst past the limit returns `429`.
- DB-backed (shared across instances), so limits hold when scaled horizontally.

### Input safety
- **All input validated with Zod** at the boundary (auth, results, API pagination).
- **All DB access parameterized** through Prisma (no string-built SQL; the only
  raw query is a parameter-less `SELECT 1` health probe).
- **No `dangerouslySetInnerHTML`** — React auto-escapes rendered output (XSS).
- Server Action request body capped (2 MB).

### Transport & headers
- **HSTS**, `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` (clickjacking),
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`;
  `X-Powered-By` removed.
- CORS is **default-deny** for cross-origin browser reads (no
  `Access-Control-Allow-Origin` set).

### Secrets
- No secrets in the repo or client bundle. `.env*` is gitignored (verified); the
  codebase reads config only through the validated `src/env.ts`. Secrets are
  per-environment.

### Auditing & observability
- **Append-only audit log** (who/what/when/IP) for logins, failed logins,
  logout, signup, staff create/remove, password reset, fee payments, and exports.
- **Structured JSON logging** + `captureError` (forwards to a monitoring webhook
  when configured). Errors return **clean envelopes — no stack traces to clients**.

### Reliability
- Stateless app (JWT + DB-backed state) → horizontally scalable.
- Health/readiness endpoint. Documented backup + restore (Neon PITR + `pg_dump`).

---

## Remaining risks — review before real student data & payments

Ordered roughly by priority. None are blocking a pilot, but a professional
auditor should sign these off before production with real families' data and
money.

1. **Payments handling (highest).** Fee payments are currently recorded manually
   (no payment processor integrated). Before taking real money: use a PCI-compliant
   processor (never store card data), verify **webhook signatures**, ensure
   **idempotency** on payment writes, and reconcile. Have the payment flow
   penetration-tested.
2. **Access/refresh token split.** We use revocable versioned tokens (good), but
   the access token lifetime is still relatively long. An auditor may want short
   access tokens + rotating refresh tokens, and per-device session listing/revoke.
3. **Field-level encryption at rest.** Neon encrypts storage at rest, but
   sensitive PII (guardian phone/email, student DOB) is not application-encrypted.
   Decide which fields warrant app-level encryption (note: encrypting the phone
   would break guardian de-duplication — needs design).
4. **CSP is minimal.** Only `frame-ancestors` is set. A full script/style CSP
   (with nonces) to harden against XSS injection should be added — it needs a
   nonce pipeline so it doesn't break inline styles.
5. **Rate-limiting coverage.** Limits cover `/api/v1/*` and login. Server
   Actions (the web mutation path) are not yet globally rate-limited; consider a
   shared limiter there too, and a WAF/CDN in front for volumetric DDoS.
6. **Self-service password reset** is not built (admin-set only). When added, use
   single-use, expiring, hashed tokens over email/SMS.
7. **Offline sync is a prototype** (`docs/OFFLINE.md`) — must not be enabled for
   real writes until idempotency + a per-entity conflict strategy + server-side
   validation are in place.
8. **Audit log integrity & retention.** Logs are append-only by convention but
   not tamper-evident; define retention and consider write-once storage for
   financial/authorization events. Also add an in-app audit viewer for owners.
9. **Dependency & secret scanning.** Add automated `npm audit` / SCA and secret
   scanning to CI, and a key-rotation runbook (rotating `AUTH_SECRET` logs
   everyone out — by design).
10. **Backups are documented, not yet automated/tested.** Schedule the dump job
    to encrypted storage and run a **restore drill** on a copy.

## Not applicable / handled
- SQL injection — parameterized queries only.
- Stored XSS — React auto-escaping, no raw HTML injection.
- Cross-tenant data access — enforced at the data layer (tested).
- Secret leakage in repo/client — verified none.
