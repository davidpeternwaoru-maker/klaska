# Online payments (Paystack)

Parents pay school fees online; the money reconciles into the school's invoices
automatically. **Card data never touches our servers** — Paystack hosts the
checkout; we only ever see a reference and a signature-verified webhook.

## How it works

1. **Owner/Bursar** opens a student's fee record → **Record payment** → **Generate
   payment link**. This creates a `PaymentIntent` for the outstanding balance and
   returns a secure link (`/pay/<reference>`) to send the parent (WhatsApp/SMS).
2. **Parent** opens the link (no login), sees the student + amount, taps **Pay** →
   we start a Paystack transaction and redirect them to Paystack's hosted checkout.
3. **Paystack** calls our webhook (`/api/webhooks/paystack`). We verify the HMAC
   signature, then record the real `Payment` **exactly once** (idempotent on the
   reference) and the invoice reconciles. The completion page also verifies with
   Paystack as a fallback, so a missed webhook never loses a payment.

**Verified in dev:** RBAC (only Owner/Bursar create links), public page renders,
bad webhook signature → 401, valid signature → payment recorded, duplicate
webhook → still exactly one payment, invoice reconciled, audit trail written.

## Setup / go-live checklist

1. **Create a Paystack account** → dashboard.paystack.com. Start in **Test mode**.
2. **Get keys**: Settings → API Keys & Webhooks. Copy the **Test** secret
   (`sk_test_…`) and public (`pk_test_…`) keys.
3. **Set env vars** (see `.env.example`), **per environment**:
   - Local `.env`: `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `APP_URL=http://localhost:3000` → **Test** keys.
   - Vercel **Preview**: Test keys, `APP_URL` = the preview URL.
   - Vercel **Production**: **Live** keys (`sk_live_…`), `APP_URL=https://klaska-mu.vercel.app`. Mark them **Sensitive**.
   - When these are unset, online payments are simply disabled — the app still runs.
4. **Set the webhook URL** in Paystack (Settings → API Keys & Webhooks →
   Webhook URL), for **both** Test and Live:
   `https://YOUR-DOMAIN/api/webhooks/paystack`
5. **Run the DB migration on each environment** (the build does NOT auto-migrate):
   with that environment's `DATABASE_URL`/`DIRECT_URL` in scope, run
   `npx prisma migrate deploy`. (Local/dev is already done.)
6. **Test with a Paystack test card** before going live:
   card `4084 0840 8408 4081`, any future expiry, any CVV, OTP `123456`.
   Generate a link → pay → confirm the invoice shows paid and the completion page
   says "Payment received".
7. **Go live**: switch Production to **Live** keys, then make one small real
   payment end-to-end and confirm it reconciles.

## Security notes (for the auditor)

- Card data never touches our servers (provider-hosted checkout).
- Webhook authenticated by **HMAC-SHA512** signature (timing-safe compare); the
  raw body is used for the digest.
- Recording is **idempotent** (unique `reference`; a single atomic
  `PENDING→PAID` claim), so retried/duplicate webhooks can't double-charge.
- Amounts are **server-authoritative** (we bill the invoice's outstanding
  balance; a mismatch is audited).
- Link creation is **Owner/Bursar only** (server-enforced). The public pay page &
  checkout are keyed by an unguessable reference and rate-limited.
- Every payment writes a `FEE_PAYMENT` audit entry.

## Still recommended before large-scale real money
- Reconciliation report/alerting for intents stuck PENDING.
- A signed **receipt** emailed/SMS'd to the parent on success.
- Load/penetration test of the payment + webhook path.
