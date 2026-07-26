import "server-only";

// Online payments (Paystack). Flow:
//   1. Owner/Bursar generates a payment link for an invoice  → PaymentIntent (PENDING)
//   2. Parent opens the public /pay/<reference> page (no login) and clicks pay
//   3. We initialize a Paystack transaction → redirect to Paystack's hosted checkout
//   4. Paystack calls our signature-verified webhook → we record the real Payment
//      ONCE (idempotent on `reference`) and the invoice reconciles automatically.
// Card data never touches our servers.

import crypto from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { env } from "@/env";
import { canManage } from "@/lib/auth/permissions";
import { type Ctx, ServiceError } from "@/server/context";
import { logAudit } from "@/server/services/audit";
import { initializeTransaction, verifyTransaction, verifyWebhookSignature } from "@/lib/paystack";

async function appBaseUrl(): Promise<string> {
  if (env.APP_URL) return env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : "";
}

const outstandingOf = (total: number, payments: { amount: number }[]) => Math.max(0, total - payments.reduce((t, p) => t + p.amount, 0));

export type PublicIntent = {
  reference: string;
  status: string;
  school: string;
  student: string;
  className: string | null;
  session: string;
  term: string;
  amount: number; // naira
  payable: boolean;
  reason: string | null;
  paymentsEnabled: boolean;
};

export const paymentsService = {
  /** Owner/Bursar: generate a shareable payment link for an invoice's balance. */
  async createLink(ctx: Ctx, invoiceId: string): Promise<{ url: string; reference: string; amount: number }> {
    if (!canManage(ctx.role, "fees")) throw new ServiceError("Only the owner or bursar can create payment links.");
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, schoolId: ctx.schoolId },
      include: { payments: { select: { amount: true } }, student: { select: { id: true, firstName: true, lastName: true, guardian: { select: { email: true } } } } },
    });
    if (!invoice) throw new ServiceError("Invoice not found.", "NOT_FOUND");
    const amount = outstandingOf(invoice.total, invoice.payments);
    if (amount <= 0) throw new ServiceError("This invoice is already fully paid.", "INVALID");

    const reference = `klaska_${crypto.randomBytes(12).toString("hex")}`;
    const email = invoice.student.guardian?.email || `parent+${invoice.studentId}@klaska.pay`;
    await prisma.paymentIntent.create({
      data: { schoolId: ctx.schoolId, invoiceId: invoice.id, studentId: invoice.studentId, amount, reference, email, status: "PENDING" },
    });
    await logAudit({ action: "FEE_PAYMENT", schoolId: ctx.schoolId, actorId: ctx.staffId, actorEmail: ctx.email, target: reference, meta: { kind: "link_created", invoiceId, amount } });
    return { url: `${await appBaseUrl()}/pay/${reference}`, reference, amount };
  },

  /** Public: display data for the /pay/<reference> page (keyed by the unguessable
   *  reference — no login, no tenant scoping needed). */
  async publicIntent(reference: string): Promise<PublicIntent | null> {
    const intent = await prisma.paymentIntent.findUnique({ where: { reference } });
    if (!intent) return null;
    const [school, student, invoice] = await Promise.all([
      prisma.school.findUnique({ where: { id: intent.schoolId }, select: { name: true } }),
      prisma.student.findUnique({ where: { id: intent.studentId }, select: { firstName: true, lastName: true, class: { select: { name: true, arm: true } } } }),
      intent.invoiceId ? prisma.invoice.findUnique({ where: { id: intent.invoiceId }, include: { payments: { select: { amount: true } } } }) : Promise.resolve(null),
    ]);
    const settled = invoice ? outstandingOf(invoice.total, invoice.payments) <= 0 : false;
    const payable = intent.status === "PENDING" && !settled;
    const reason = intent.status === "PAID" ? "This payment has already been completed." : settled ? "This invoice has already been fully settled." : !env.PAYSTACK_SECRET_KEY ? "Online payments are not yet enabled for this school." : null;
    return {
      reference: intent.reference,
      status: intent.status,
      school: school?.name ?? "School",
      student: student ? `${student.firstName} ${student.lastName}` : "Student",
      className: student?.class ? (student.class.arm ? `${student.class.name} ${student.class.arm}` : student.class.name) : null,
      session: invoice?.session ?? "",
      term: invoice?.term ?? "",
      amount: intent.amount,
      payable,
      reason,
      paymentsEnabled: !!env.PAYSTACK_SECRET_KEY,
    };
  },

  /** Public: start the Paystack checkout for a pending intent; returns the hosted
   *  checkout URL to redirect the payer to. */
  async startCheckout(reference: string): Promise<string> {
    const intent = await prisma.paymentIntent.findUnique({ where: { reference } });
    if (!intent) throw new ServiceError("Payment link not found.", "NOT_FOUND");
    if (intent.status === "PAID") throw new ServiceError("This payment has already been completed.", "INVALID");
    const base = await appBaseUrl();
    const init = await initializeTransaction({
      email: intent.email || `parent+${intent.studentId}@klaska.pay`,
      amountKobo: intent.amount * 100,
      reference: intent.reference,
      callbackUrl: `${base}/pay/${intent.reference}/complete`,
      metadata: { schoolId: intent.schoolId, studentId: intent.studentId, invoiceId: intent.invoiceId },
    });
    await prisma.paymentIntent.update({ where: { id: intent.id }, data: { authorizationUrl: init.authorization_url, accessCode: init.access_code } });
    return init.authorization_url;
  },

  /** Process a signature-verified webhook. Records the Payment exactly once. */
  async handleWebhook(rawBody: string, signature: string | null): Promise<{ ok: boolean; reason?: string }> {
    if (!verifyWebhookSignature(rawBody, signature)) return { ok: false, reason: "bad_signature" };
    let event: { event?: string; data?: { reference?: string; channel?: string; amount?: number } };
    try {
      event = JSON.parse(rawBody);
    } catch {
      return { ok: false, reason: "bad_json" };
    }
    if (event.event !== "charge.success" || !event.data?.reference) return { ok: true }; // ignore other events
    await this.reconcile(event.data.reference, event.data.channel ?? null, event.data.amount ?? null);
    return { ok: true };
  },

  /** Public fallback (completion page): verify with Paystack, then record if paid.
   *  Returns the resulting status. Safe to call repeatedly (idempotent). */
  async reconcileByReference(reference: string): Promise<string> {
    if (!env.PAYSTACK_SECRET_KEY) return "PENDING";
    try {
      const v = await verifyTransaction(reference);
      if (v.status === "success") await this.reconcile(reference, v.channel ?? null, v.amount ?? null);
      else if (v.status === "failed") await prisma.paymentIntent.updateMany({ where: { reference, status: "PENDING" }, data: { status: "FAILED" } });
    } catch {
      /* leave as-is; the webhook is the primary path */
    }
    return (await prisma.paymentIntent.findUnique({ where: { reference }, select: { status: true } }))?.status ?? "PENDING";
  },

  /** The atomic, idempotent core: flip PENDING→PAID once and write the Payment. */
  async reconcile(reference: string, channel: string | null, amountKobo: number | null): Promise<void> {
    // Only the FIRST caller flips the row (row-level lock) → exactly-once.
    const claimed = await prisma.paymentIntent.updateMany({
      where: { reference, status: { not: "PAID" } },
      data: { status: "PAID", paidAt: new Date(), channel: channel ?? undefined },
    });
    if (claimed.count !== 1) return; // already processed (or unknown reference)

    const intent = await prisma.paymentIntent.findUnique({ where: { reference } });
    if (!intent) return;
    // Defence-in-depth: the paid amount should match what we billed.
    if (amountKobo != null && Math.round(amountKobo / 100) !== intent.amount) {
      await logAudit({ action: "FEE_PAYMENT", schoolId: intent.schoolId, target: reference, meta: { kind: "amount_mismatch", expected: intent.amount, got: Math.round(amountKobo / 100) } });
    }
    const payment = await prisma.payment.create({
      data: {
        schoolId: intent.schoolId,
        studentId: intent.studentId,
        invoiceId: intent.invoiceId,
        amount: intent.amount,
        method: (channel ?? "online").toUpperCase(),
        reference,
        recordedBy: "Paystack (online)",
      },
    });
    await logAudit({ action: "FEE_PAYMENT", schoolId: intent.schoolId, target: payment.id, meta: { kind: "online_paid", reference, amount: intent.amount, channel } });
  },
};
