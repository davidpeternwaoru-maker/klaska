"use client";

// Invoices & payments (manual mode). Every student's bill for the term, what
// they've paid, what's owed — with one-click payment recording and a
// defaulters view. The bursar's daily screen.

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Card, Pill, SegTabs } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { generateInvoices, recordPayment, type FinanceState } from "@/lib/actions/finance";

export type InvoiceRow = {
  id: string;
  student: string;
  className: string | null;
  total: number;
  paid: number;
  payments: { id: string; amount: number; method: string; reference: string | null; when: string; by: string | null }[];
};

const ngn = (n: number) => "₦" + n.toLocaleString("en-NG");
const hueOf = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};

function statusOf(r: InvoiceRow): { label: string; tone: "green" | "amber" | "red" } {
  if (r.paid >= r.total) return { label: "Paid", tone: "green" };
  if (r.paid > 0) return { label: "Part-paid", tone: "amber" };
  return { label: "Unpaid", tone: "red" };
}

function PayModal({ row, onClose }: { row: InvoiceRow; onClose: () => void }) {
  const [state, action, pending] = useActionState<FinanceState, FormData>(recordPayment, {});
  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, state, onClose]);
  const balance = Math.max(0, row.total - row.paid);
  const input = "h-10 w-full rounded-[10px] border border-border bg-secondary px-3 text-[13.5px] text-ink outline-none focus:border-forest-line focus:bg-card";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="mt-14 w-full max-w-[440px]" onClick={(e) => e.stopPropagation()}>
        <Card>
          <div className="mb-1 text-[14px] font-semibold text-ink">Record payment — {row.student}</div>
          <div className="mb-3 text-[12.5px] text-ink-4">
            Balance <b className="text-ink">{ngn(balance)}</b> of {ngn(row.total)}
          </div>
          <form action={action} className="flex flex-col gap-3">
            <input type="hidden" name="invoiceId" value={row.id} />
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Amount (₦) *</span>
              <input name="amount" inputMode="numeric" required defaultValue={balance || ""} className={input} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Method</span>
                <select name="method" defaultValue="TRANSFER" className={input}>
                  <option value="TRANSFER">Bank transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="POS">POS</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Reference</span>
                <input name="reference" placeholder="teller / transfer ref" className={input} />
              </label>
            </div>
            {state.error && <p className="text-[12.5px] font-medium text-red">{state.error}</p>}
            <div className="flex gap-2">
              <button disabled={pending} className="h-10 rounded-[10px] bg-forest px-5 text-[13.5px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-60">
                {pending ? "Saving…" : "Record payment"}
              </button>
              <button type="button" onClick={onClose} className="h-10 rounded-[10px] border border-border px-4 text-[13px] font-medium text-ink-2 hover:bg-secondary">
                Cancel
              </button>
            </div>
          </form>
          {row.payments.length > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-4">Payment history</div>
              {row.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1 text-[12.5px]">
                  <span className="text-ink-3">{p.when} · {p.method.toLowerCase()}{p.reference ? ` · ${p.reference}` : ""}</span>
                  <span className="font-semibold text-ink">{ngn(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export function FinanceCenter({ rows, canManageMoney, termLabel }: { rows: InvoiceRow[]; canManageMoney: boolean; termLabel: string }) {
  const [filter, setFilter] = useState("all");
  const [paying, setPaying] = useState<InvoiceRow | null>(null);
  const [genPending, startGen] = useTransition();
  const [genMsg, setGenMsg] = useState<string | null>(null);

  const totals = useMemo(() => {
    const invoiced = rows.reduce((t, r) => t + r.total, 0);
    const collected = rows.reduce((t, r) => t + Math.min(r.paid, r.total), 0);
    return { invoiced, collected, outstanding: invoiced - collected, owing: rows.filter((r) => r.paid < r.total).length };
  }, [rows]);

  const shown = useMemo(() => {
    if (filter === "owing") return rows.filter((r) => r.paid < r.total);
    if (filter === "paid") return rows.filter((r) => r.paid >= r.total);
    return rows;
  }, [rows, filter]);

  const gen = () =>
    startGen(async () => {
      setGenMsg(null);
      const res = await generateInvoices();
      setGenMsg(res.ok ? `Created ${res.created} invoice(s).` : res.error ?? "Nothing to do.");
    });

  return (
    <div className="flex flex-col gap-4">
      {/* money KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card pad={16}>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-4">Invoiced ({termLabel})</div>
          <div className="mt-1 font-display text-[22px] font-bold text-ink">{ngn(totals.invoiced)}</div>
        </Card>
        <Card pad={16}>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-4">Collected</div>
          <div className="mt-1 font-display text-[22px] font-bold text-green">{ngn(totals.collected)}</div>
        </Card>
        <Card pad={16}>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-4">Outstanding</div>
          <div className="mt-1 font-display text-[22px] font-bold text-red">{ngn(totals.outstanding)}</div>
        </Card>
      </div>

      <Card pad={0} className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <SegTabs
            value={filter}
            onChange={setFilter}
            tabs={[
              { value: "all", label: `All (${rows.length})` },
              { value: "owing", label: `Owing (${totals.owing})` },
              { value: "paid", label: "Paid up" },
            ]}
          />
          {canManageMoney && (
            <div className="flex items-center gap-2">
              {genMsg && <span className="text-[12px] text-ink-4">{genMsg}</span>}
              <button onClick={gen} disabled={genPending} className="flex h-9 items-center gap-1.5 rounded-[9px] bg-forest px-3.5 text-[12.5px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-60">
                <Icon name="receipt" size={15} /> {genPending ? "Generating…" : "Generate this term's invoices"}
              </button>
            </div>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="px-4 pb-9 pt-3 text-center text-[13px] text-ink-4">
            No invoices for this term yet.{canManageMoney ? " Click “Generate this term's invoices” to bill every student from your fee structure." : ""}
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-[0.05em] text-ink-4">
                  <th className="px-4 py-2.5 text-left font-medium">Student</th>
                  <th className="px-4 py-2.5 text-left font-medium">Class</th>
                  <th className="px-4 py-2.5 text-right font-medium">Bill</th>
                  <th className="px-4 py-2.5 text-right font-medium">Paid</th>
                  <th className="px-4 py-2.5 text-right font-medium">Balance</th>
                  <th className="px-4 py-2.5 text-left font-medium">Status</th>
                  {canManageMoney && <th className="px-4 py-2.5 text-right font-medium"></th>}
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const st = statusOf(r);
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={r.student} hue={hueOf(r.id)} size={28} />
                          <span className="font-medium text-ink">{r.student}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-ink-3">{r.className ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right text-ink-3">{ngn(r.total)}</td>
                      <td className="px-4 py-2.5 text-right text-ink-3">{ngn(r.paid)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-ink">{ngn(Math.max(0, r.total - r.paid))}</td>
                      <td className="px-4 py-2.5"><Pill tone={st.tone}>{st.label}</Pill></td>
                      {canManageMoney && (
                        <td className="px-4 py-2.5 text-right">
                          <button onClick={() => setPaying(r)} className="rounded-[8px] border border-border px-2.5 py-1.5 text-[12px] font-medium text-ink-2 transition hover:bg-secondary">
                            Record payment
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {paying && <PayModal row={paying} onClose={() => setPaying(null)} />}
    </div>
  );
}
