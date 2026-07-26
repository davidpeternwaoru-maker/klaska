import { paymentsService } from "@/server/services/payments";
import { KLogo } from "@/components/ui/Icon";

// Paystack redirects the payer here after checkout. We verify with Paystack
// (source of truth) and record the payment if the webhook hasn't already —
// belt-and-suspenders so a missed webhook never loses a payment.
export const dynamic = "force-dynamic";
export const metadata = { title: "Payment status · Klaska" };

export default async function Page({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const status = await paymentsService.reconcileByReference(reference);

  const view =
    status === "PAID"
      ? { tone: "ok" as const, icon: "✓", title: "Payment received", body: "Thank you. Your school fees payment has been recorded. You can close this page." }
      : status === "FAILED"
        ? { tone: "bad" as const, icon: "✕", title: "Payment not completed", body: "The payment didn't go through. No money was taken. Please try the link again." }
        : { tone: "wait" as const, icon: "…", title: "Confirming your payment", body: "If you completed the payment, it will be confirmed shortly. You can refresh this page in a moment." };

  const ring = view.tone === "ok" ? "bg-forest-soft text-forest" : view.tone === "bad" ? "bg-red-soft text-red" : "bg-secondary text-ink-3";

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4 py-10">
      <div className="w-full max-w-[420px] rounded-[var(--radius-card)] border border-border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto flex h-8 w-8 items-center justify-center"><KLogo size={26} /></span>
        <div className={`mx-auto mt-5 flex h-14 w-14 items-center justify-center rounded-full text-[24px] font-bold ${ring}`}>{view.icon}</div>
        <h1 className="mt-4 text-[18px] font-semibold text-ink">{view.title}</h1>
        <p className="mx-auto mt-1.5 max-w-[320px] text-[13.5px] leading-relaxed text-ink-3">{view.body}</p>
        <div className="mt-6 text-[11px] text-ink-4">Reference: <span className="font-mono">{reference}</span></div>
      </div>
    </div>
  );
}
