"use client";

// The money loop, live: fees in − expenses out = net, plus payment & expense
// registers and a one-click formatted Excel statement.

import { useActionState, useEffect, useRef } from "react";
import { Card, Pill } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { addExpense, deleteExpense, type ActionState } from "@/lib/actions/expenses";
import { exportFinancialStatement, type ExportMeta } from "@/lib/export/real-exports";

export type PaymentRow = { id: string; when: string; student: string; amount: number; method: string; reference: string };
export type ExpenseRow = { id: string; when: string; category: string; description: string; amount: number };

const ngn = (n: number) => "₦" + n.toLocaleString("en-NG");
const input =
  "h-9 w-full rounded-[9px] border border-border bg-secondary px-2.5 text-[13px] text-ink outline-none focus:border-forest-line focus:bg-card";

const CATS = ["SALARIES", "RENT", "UTILITIES", "SUPPLIES", "TRANSPORT", "MAINTENANCE", "OTHER"];

function AddExpense() {
  const [state, action, pending] = useActionState<ActionState, FormData>(addExpense, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok, state]);
  return (
    <form ref={ref} action={action} className="flex flex-wrap items-end gap-2 border-t border-border bg-secondary/40 px-4 py-3">
      <label className="block">
        <span className="mb-1 block text-[11px] font-medium text-ink-3">Category</span>
        <select name="category" className={`${input} w-36`}>
          {CATS.map((c) => (
            <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
          ))}
        </select>
      </label>
      <label className="block flex-1 min-w-[160px]">
        <span className="mb-1 block text-[11px] font-medium text-ink-3">Description</span>
        <input name="description" placeholder="e.g. May salaries" className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-[11px] font-medium text-ink-3">Amount (₦)</span>
        <input name="amount" inputMode="numeric" required className={`${input} w-28`} />
      </label>
      <label className="block">
        <span className="mb-1 block text-[11px] font-medium text-ink-3">Date</span>
        <input name="spentAt" type="date" className={`${input} w-36`} />
      </label>
      <button disabled={pending} className="h-9 rounded-[9px] bg-forest px-3.5 text-[12.5px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-60">
        {pending ? "Saving…" : "Log expense"}
      </button>
      {state.error && <span className="text-[12px] font-medium text-red">{state.error}</span>}
    </form>
  );
}

export function FinancialSystem({
  meta,
  summary,
  payments,
  expenses,
  canEdit,
}: {
  meta: ExportMeta;
  summary: { invoiced: number; collected: number; outstanding: number; expensesTotal: number; net: number };
  payments: PaymentRow[];
  expenses: ExpenseRow[];
  canEdit: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          { label: "Invoiced", value: summary.invoiced, tone: "text-ink" },
          { label: "Collected", value: summary.collected, tone: "text-green" },
          { label: "Outstanding", value: summary.outstanding, tone: "text-red" },
          { label: "Expenses", value: summary.expensesTotal, tone: "text-amber-2" },
          { label: "Net", value: summary.net, tone: summary.net >= 0 ? "text-green" : "text-red" },
        ].map((k) => (
          <Card key={k.label} pad={16}>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-4">{k.label}</div>
            <div className={`mt-1 font-display text-[20px] font-bold ${k.tone}`}>{ngn(k.value)}</div>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => exportFinancialStatement(meta, summary, payments, expenses)}
          className="flex items-center gap-1.5 rounded-[10px] bg-forest px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-forest-2"
        >
          <Icon name="download" size={15} /> Export statement (Excel)
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* payments register */}
        <Card pad={0} className="overflow-hidden">
          <div className="flex items-center justify-between p-4">
            <div className="text-[14px] font-semibold text-ink">Payments in</div>
            <Pill tone="green">{payments.length}</Pill>
          </div>
          {payments.length === 0 ? (
            <div className="px-4 pb-8 text-[13px] text-ink-4">No payments recorded yet.</div>
          ) : (
            <div className="max-h-[46vh] overflow-auto border-t border-border">
              <table className="w-full border-collapse text-[12.5px]">
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 text-ink-4">{p.when}</td>
                      <td className="px-4 py-2 font-medium text-ink">{p.student}</td>
                      <td className="px-4 py-2 text-ink-4">{p.method.toLowerCase()}</td>
                      <td className="px-4 py-2 text-right font-semibold text-green">{ngn(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* expenses register */}
        <Card pad={0} className="overflow-hidden">
          <div className="flex items-center justify-between p-4">
            <div className="text-[14px] font-semibold text-ink">Expenses out</div>
            <Pill tone="amber">{expenses.length}</Pill>
          </div>
          {expenses.length === 0 ? (
            <div className="px-4 pb-4 text-[13px] text-ink-4">No expenses logged yet.</div>
          ) : (
            <div className="max-h-[38vh] overflow-auto border-t border-border">
              <table className="w-full border-collapse text-[12.5px]">
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 text-ink-4">{e.when}</td>
                      <td className="px-4 py-2"><Pill tone="neutral">{e.category.toLowerCase()}</Pill></td>
                      <td className="px-4 py-2 text-ink-2">{e.description}</td>
                      <td className="px-4 py-2 text-right font-semibold text-ink">{ngn(e.amount)}</td>
                      {canEdit && (
                        <td className="px-2 py-2 text-right">
                          <form action={deleteExpense}>
                            <input type="hidden" name="id" value={e.id} />
                            <button title="Delete" className="rounded-[6px] p-1 text-ink-4 hover:bg-red-soft hover:text-red">
                              <Icon name="trash" size={14} />
                            </button>
                          </form>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {canEdit && <AddExpense />}
        </Card>
      </div>
    </div>
  );
}
