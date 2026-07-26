import { notFound } from "next/navigation";
import { paymentsService } from "@/server/services/payments";
import { KLogo } from "@/components/ui/Icon";
import { PayButton } from "./PayButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pay school fees · Klaska" };

const naira = (n: number) => "₦" + n.toLocaleString("en-NG");

export default async function Page({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const intent = await paymentsService.publicIntent(reference);
  if (!intent) notFound();

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-border bg-card px-6 py-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-forest-soft"><KLogo size={22} /></span>
            <div>
              <div className="text-[14px] font-semibold text-ink">{intent.school}</div>
              <div className="text-[11.5px] text-ink-4">School fees payment</div>
            </div>
          </div>

          <div className="px-6 py-6">
            <div className="text-[12px] uppercase tracking-wide text-ink-4">Amount due</div>
            <div className="font-display text-[34px] font-bold leading-none text-ink">{naira(intent.amount)}</div>

            <dl className="mt-5 flex flex-col gap-2.5 text-[13px]">
              <Row k="Student" v={intent.student} />
              {intent.className && <Row k="Class" v={intent.className} />}
              {intent.term && <Row k="Term" v={`${termLabel(intent.term)}${intent.session ? " · " + intent.session : ""}`} />}
            </dl>

            <div className="mt-6">
              {intent.payable ? (
                <PayButton reference={intent.reference} amount={intent.amount} />
              ) : (
                <div className="rounded-[var(--radius-card)] bg-secondary px-4 py-3 text-center text-[13px] text-ink-3">
                  {intent.status === "PAID" ? "✓ " : ""}{intent.reason ?? "This payment link is no longer active."}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border bg-secondary/50 px-6 py-3 text-center text-[11px] text-ink-4">
            Secured by Paystack · Your card details never touch this school&apos;s systems.
          </div>
        </div>
        <div className="mt-3 text-center text-[11px] text-ink-4">Powered by Klaska</div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line-2 pb-2 last:border-0">
      <dt className="text-ink-4">{k}</dt>
      <dd className="font-medium text-ink">{v}</dd>
    </div>
  );
}

function termLabel(t: string) {
  return { FIRST: "First Term", SECOND: "Second Term", THIRD: "Third Term" }[t] ?? t;
}
