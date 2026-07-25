"use client";

// The Financial Operating System — the reference design, on real records:
// dark hero band (revenue / costs / net / cash) with live strip, Revenue·Cost·
// Profit monthly chart, cost-breakdown donut, revenue by class level, payroll
// snapshot, and the Recent Expenses register. Every button works:
// Tax summary + Full P&L + Log expense are modals; Export builds the Excel
// statement; Filter filters; row "…" deletes.

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Card, Pill, SectionTitle } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { addExpense, deleteExpense, type ActionState } from "@/lib/actions/expenses";
import { type ExportMeta } from "@/lib/export/real-exports";
import { exportExcel, exportPdf } from "@/lib/export/engine";
import { statementsReport, taxReport, payrollReport, type StatementKind } from "@/lib/export/reports";
import { financialStatementsAction } from "@/lib/actions/statements";
import { payrollAction } from "@/lib/actions/report-data";

/* ---------------- types ---------------- */
export type MonthPoint = { label: string; revenue: number; cost: number };
export type CostSlice = { category: string; amount: number };
export type LevelRevenue = { label: string; amount: number };
export type ExpenseRow = { id: string; date: string; ref: string; category: string; description: string; amount: number };
export type PayRow = { when: string; student: string; amount: number; method: string; reference: string };
export type Hero = {
  revenueTerm: number;
  costsTerm: number;
  net: number;
  margin: number;
  cash: number;
  lastPayment: string | null;
  lastExpense: string | null;
};
export type PayrollInfo = { teaching: number; nonTeaching: number; totalStaff: number; salariesThisMonth: number; monthLabel: string };

/* ---------------- helpers ---------------- */
const ngn = (n: number) => "₦" + n.toLocaleString("en-NG");
const ngnSmart = (n: number) => {
  const sign = n < 0 ? "−" : "";
  const v = Math.abs(n);
  if (v >= 1_000_000) return sign + "₦" + (v / 1_000_000).toFixed(2).replace(/\.00$/, "") + "M";
  return sign + "₦" + v.toLocaleString("en-NG");
};

const CAT_COLORS: Record<string, string> = {
  SALARIES: "var(--color-forest)",
  RENT: "var(--color-blue)",
  UTILITIES: "var(--color-amber)",
  SUPPLIES: "var(--color-ink-4)",
  TRANSPORT: "var(--color-blue)",
  MAINTENANCE: "var(--color-red)",
  OTHER: "var(--color-amber-2)",
};
const catLabel = (c: string) => c.charAt(0) + c.slice(1).toLowerCase();
const CATS = ["SALARIES", "RENT", "UTILITIES", "SUPPLIES", "TRANSPORT", "MAINTENANCE", "OTHER"];

const inputCls = "h-10 w-full rounded-[var(--radius-card)] border border-border bg-secondary px-3 text-[13.5px] text-ink outline-none focus:border-forest-line focus:bg-card";

/* ---------------- modals ---------------- */
function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className={`mt-12 w-full ${wide ? "max-w-[640px]" : "max-w-[460px]"}`} onClick={(e) => e.stopPropagation()}>
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[15px] font-semibold text-ink">{title}</div>
            <button onClick={onClose} className="rounded-[7px] p-1.5 text-ink-4 hover:bg-secondary hover:text-ink">
              <Icon name="x" size={16} />
            </button>
          </div>
          {children}
        </Card>
      </div>
    </div>
  );
}

function StatementsModal({ onClose }: { onClose: () => void }) {
  const [period, setPeriod] = useState<"month" | "term" | "session">("term");
  const [kind, setKind] = useState<StatementKind>("all");
  const [busy, setBusy] = useState<null | "xlsx" | "pdf">(null);
  const [error, setError] = useState<string | null>(null);

  const periods: { v: "month" | "term" | "session"; label: string }[] = [
    { v: "month", label: "This month" },
    { v: "term", label: "This term" },
    { v: "session", label: "Full session" },
  ];
  const kinds: { v: StatementKind; label: string }[] = [
    { v: "all", label: "All statements" },
    { v: "pnl", label: "Profit & Loss" },
    { v: "expenses", label: "Expense breakdown" },
    { v: "cashflow", label: "Cash flow" },
    { v: "balance", label: "Balance-sheet summary" },
  ];

  async function run(fmt: "xlsx" | "pdf") {
    setBusy(fmt);
    setError(null);
    const res = await financialStatementsAction(period);
    if (!res.ok) {
      setBusy(null);
      setError(res.error);
      return;
    }
    try {
      const spec = statementsReport(res.data, kind);
      if (fmt === "xlsx") await exportExcel(spec);
      else await exportPdf(spec);
      onClose();
    } catch {
      setError("Could not build the file. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal title="Financial statements" onClose={onClose}>
      <p className="mb-4 text-[12.5px] text-ink-4">Proper P&amp;L, expense breakdown, cash flow and a balance-sheet summary — from your recorded fees, payments and expenses.</p>
      <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-4">Period</label>
      <div className="mt-2 flex gap-2">
        {periods.map((p) => (
          <button key={p.v} onClick={() => setPeriod(p.v)} className={`flex-1 rounded-[var(--radius-card)] border px-3 py-2 text-[13px] font-medium transition ${period === p.v ? "border-forest bg-forest text-white" : "border-border bg-card text-ink-2 hover:bg-secondary"}`}>
            {p.label}
          </button>
        ))}
      </div>
      <label className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-4">Statement</label>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {kinds.map((k) => (
          <button key={k.v} onClick={() => setKind(k.v)} className={`rounded-[var(--radius-card)] border px-3 py-2 text-left text-[13px] font-medium transition ${kind === k.v ? "border-forest bg-forest-soft text-forest" : "border-border bg-card text-ink-2 hover:bg-secondary"}`}>
            {k.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-3 text-[12.5px] font-medium text-red">{error}</p>}
      <div className="mt-6 flex items-center justify-between">
        <span className="text-[11.5px] text-ink-4">Owner &amp; Bursar only · recorded transactions</span>
        <div className="flex gap-2">
          <button onClick={() => run("pdf")} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-[var(--radius-card)] border border-border px-3.5 py-2 text-[13px] font-medium text-ink-2 transition hover:bg-secondary disabled:opacity-50">
            <Icon name="reports" size={15} /> {busy === "pdf" ? "Building…" : "PDF"}
          </button>
          <button onClick={() => run("xlsx")} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-[var(--radius-card)] bg-forest px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-50">
            <Icon name="download" size={15} /> {busy === "xlsx" ? "Building…" : "Export Excel"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function LogExpenseModal({ onClose }: { onClose: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addExpense, {});
  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, state, onClose]);
  return (
    <Modal title="Log expense" onClose={onClose}>
      <form action={action} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Category</span>
            <select name="category" className={inputCls}>
              {CATS.map((c) => (
                <option key={c} value={c}>{catLabel(c)}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Amount (₦) *</span>
            <input name="amount" inputMode="numeric" required className={inputCls} />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Vendor / description</span>
          <input name="description" placeholder="e.g. Total Energies — 1,200L diesel" className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Date</span>
          <input name="spentAt" type="date" className={inputCls} />
        </label>
        {state.error && <p className="text-[12.5px] font-medium text-red">{state.error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-[var(--radius-card)] border border-border px-4 text-[13px] font-medium text-ink-2 hover:bg-secondary">Cancel</button>
          <button disabled={pending} className="h-10 rounded-[var(--radius-card)] bg-forest px-5 text-[13.5px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-60">
            {pending ? "Saving…" : "Log expense"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TaxSummaryModal({ hero, slices, meta, onClose }: { hero: Hero; slices: CostSlice[]; meta: ExportMeta; onClose: () => void }) {
  const deductible = slices.reduce((t, s) => t + s.amount, 0);
  const Row = ({ k, v, bold }: { k: string; v: string; bold?: boolean }) => (
    <div className={`flex items-center justify-between border-b border-border py-2 last:border-0 ${bold ? "font-semibold text-ink" : "text-ink-2"}`}>
      <span className="text-[13px]">{k}</span>
      <span className="text-[13px]">{v}</span>
    </div>
  );
  return (
    <Modal title={`Tax summary — ${meta.termLabel} · ${meta.session}`} onClose={onClose}>
      <Row k="Gross revenue (fees collected)" v={ngn(hero.revenueTerm)} />
      {slices.map((s) => (
        <Row key={s.category} k={`Less: ${catLabel(s.category)}`} v={`− ${ngn(s.amount)}`} />
      ))}
      <Row k="Total deductible expenses" v={`− ${ngn(deductible)}`} />
      <Row k="Net surplus (taxable basis)" v={ngn(hero.revenueTerm - deductible)} bold />
      <p className="mt-3 rounded-[var(--radius-card)] bg-secondary p-3 text-[12px] text-ink-3">
        Accountant-ready estimate from your recorded fees and expenses. Company income tax / PAYE rates depend on your registration — share this with your accountant for filing.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        {(() => {
          const rep = () => taxReport({ school: meta.school, term: meta.termLabel, session: meta.session }, hero.revenueTerm, slices.map((s) => ({ category: catLabel(s.category), amount: s.amount })), hero.revenueTerm - deductible);
          return (
            <>
              <button onClick={() => exportPdf(rep())} className="inline-flex items-center gap-1.5 rounded-[var(--radius-card)] border border-border px-3.5 py-2 text-[13px] font-medium text-ink-2 transition hover:bg-secondary">
                <Icon name="reports" size={15} /> PDF
              </button>
              <button onClick={() => exportExcel(rep())} className="inline-flex items-center gap-1.5 rounded-[var(--radius-card)] bg-forest px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-forest-2">
                <Icon name="download" size={15} /> Export Excel
              </button>
            </>
          );
        })()}
      </div>
    </Modal>
  );
}

function PnLModal({ months, meta, onClose }: { months: MonthPoint[]; meta: ExportMeta; onClose: () => void }) {
  return (
    <Modal title={`Profit & Loss — last 6 months (${meta.school})`} onClose={onClose} wide>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-border text-[11px] uppercase tracking-wide text-ink-4">
            <th className="py-2 text-left font-medium">Month</th>
            <th className="py-2 text-right font-medium">Revenue</th>
            <th className="py-2 text-right font-medium">Costs</th>
            <th className="py-2 text-right font-medium">Profit</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => (
            <tr key={m.label} className="border-b border-border last:border-0">
              <td className="py-2 font-medium text-ink">{m.label}</td>
              <td className="py-2 text-right text-green">{ngn(m.revenue)}</td>
              <td className="py-2 text-right text-red">{m.cost ? `− ${ngn(m.cost)}` : "₦0"}</td>
              <td className={`py-2 text-right font-semibold ${m.revenue - m.cost >= 0 ? "text-ink" : "text-red"}`}>{ngn(m.revenue - m.cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}

/* ---------------- charts (hand-rolled, design-matched) ---------------- */
function GroupedBars({ months }: { months: MonthPoint[] }) {
  const max = Math.max(1, ...months.flatMap((m) => [m.revenue, m.cost, Math.max(0, m.revenue - m.cost)]));
  const h = (v: number) => Math.max(v > 0 ? 6 : 2, Math.round((v / max) * 180));
  return (
    <div>
      <div className="flex items-end justify-between gap-2" style={{ height: 200 }}>
        {months.map((m) => {
          const profit = Math.max(0, m.revenue - m.cost);
          return (
            <div key={m.label} className="flex flex-1 items-end justify-center gap-1.5">
              <div title={`Revenue ${ngn(m.revenue)}`} className="w-4 rounded-t-[4px]" style={{ height: h(m.revenue), background: "var(--color-forest)" }} />
              <div title={`Cost ${ngn(m.cost)}`} className="w-4 rounded-t-[4px]" style={{ height: h(m.cost), background: "var(--color-red)" }} />
              <div title={`Profit ${ngn(profit)}`} className="w-4 rounded-t-[4px]" style={{ height: h(profit), background: "var(--color-amber)" }} />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between gap-2">
        {months.map((m) => (
          <div key={m.label} className="flex-1 text-center text-[11.5px] text-ink-4">{m.label}</div>
        ))}
      </div>
    </div>
  );
}

function Donut({ slices }: { slices: CostSlice[] }) {
  const total = slices.reduce((t, s) => t + s.amount, 0);
  const R = 52;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <div className="relative flex-none">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={R} fill="none" stroke="var(--color-secondary)" strokeWidth="18" />
          {total > 0 &&
            slices.map((s) => {
              const frac = s.amount / total;
              const el = (
                <circle
                  key={s.category}
                  cx="70" cy="70" r={R} fill="none"
                  stroke={CAT_COLORS[s.category] ?? "var(--color-ink-4)"}
                  strokeWidth="18"
                  strokeDasharray={`${frac * C} ${C}`}
                  strokeDashoffset={-offset * C}
                  transform="rotate(-90 70 70)"
                />
              );
              offset += frac;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[17px] font-bold text-ink">{ngnSmart(total)}</span>
          <span className="text-[10.5px] text-ink-4">Total costs</span>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {slices.length === 0 && <span className="text-[12.5px] text-ink-4">No expenses this month yet.</span>}
        {slices.map((s) => (
          <div key={s.category} className="flex items-center gap-2 text-[12.5px]">
            <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: CAT_COLORS[s.category] ?? "var(--color-ink-4)" }} />
            <span className="flex-1 truncate text-ink-2">{catLabel(s.category)}</span>
            <span className="font-semibold text-ink">{ngnSmart(s.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LevelBars({ levels }: { levels: LevelRevenue[] }) {
  const max = Math.max(1, ...levels.map((l) => l.amount));
  return (
    <div>
      <div className="flex items-end justify-around gap-3" style={{ height: 170 }}>
        {levels.map((l) => (
          <div key={l.label} title={ngn(l.amount)} className="w-9 rounded-t-[5px]" style={{ height: Math.max(l.amount > 0 ? 8 : 2, Math.round((l.amount / max) * 160)), background: "var(--color-forest)" }} />
        ))}
      </div>
      <div className="mt-2 flex justify-around gap-3">
        {levels.map((l) => (
          <div key={l.label} className="w-9 text-center text-[11px] text-ink-4">{l.label}</div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- main ---------------- */
export function FinancialOS({
  meta,
  hero,
  months,
  slices,
  monthName,
  levels,
  payroll,
  expenses,
  payments,
  canEdit,
}: {
  meta: ExportMeta;
  hero: Hero;
  months: MonthPoint[];
  slices: CostSlice[];
  monthName: string;
  levels: LevelRevenue[];
  payroll: PayrollInfo;
  expenses: ExpenseRow[];
  payments: PayRow[];
  canEdit: boolean;
}) {
  const [modal, setModal] = useState<"none" | "expense" | "tax" | "pnl" | "statements">("none");
  const [filter, setFilter] = useState("all");
  const [note, setNote] = useState<string | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flash = (m: string) => {
    setNote(m);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(null), 3500);
  };

  const shownExpenses = useMemo(() => (filter === "all" ? expenses : expenses.filter((e) => e.category === filter)), [expenses, filter]);

  const heroCell = (label: string, value: string, sub1: string, sub2: string, sub2Tone: string) => (
    <div className="min-w-0 flex-1 px-5 first:pl-0 last:pr-0">
      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/60">{label}</div>
      <div className="mt-1 font-display text-[32px] font-bold leading-none tracking-[-0.02em] text-white">{value}</div>
      <div className="mt-1.5 text-[12px] text-white/70">{sub1}</div>
      <div className={`text-[12px] font-medium ${sub2Tone}`}>{sub2}</div>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1320px]">
      <SectionTitle
        eyebrow="Financial Operating System"
        title="The school's full financial picture — live"
        sub="Revenue, cost, and profit all in one place. Updated as fees come in and expenses are logged."
        right={
          <>
            <button onClick={() => setModal("tax")} className="inline-flex items-center gap-1.5 rounded-[var(--radius-card)] border border-border px-3.5 py-2 text-[13px] font-medium text-ink-2 transition hover:bg-secondary">
              <Icon name="receipt" size={15} /> Tax summary
            </button>
            <button onClick={() => setModal("statements")} className="inline-flex items-center gap-1.5 rounded-[var(--radius-card)] border border-border px-3.5 py-2 text-[13px] font-medium text-ink-2 transition hover:bg-secondary">
              <Icon name="reports" size={15} /> Financial statements
            </button>
            <button onClick={async () => { const r = await payrollAction(); if (r.ok) await exportExcel(payrollReport(r.data)); else flash(r.error); }} className="inline-flex items-center gap-1.5 rounded-[var(--radius-card)] border border-border px-3.5 py-2 text-[13px] font-medium text-ink-2 transition hover:bg-secondary">
              <Icon name="badge" size={15} /> Payroll
            </button>
            {canEdit && (
              <button onClick={() => setModal("expense")} className="inline-flex items-center gap-1.5 rounded-[var(--radius-card)] bg-forest px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-forest-2">
                <Icon name="plus" size={15} /> Log expense
              </button>
            )}
          </>
        }
      />

      {note && <div className="mb-3 rounded-[var(--radius-card)] bg-amber-soft px-3.5 py-2 text-[12.5px] font-medium text-amber-2">{note}</div>}

      {/* dark hero band */}
      <div className="overflow-hidden rounded-[18px]" style={{ background: "linear-gradient(135deg,#17531c 0%,#0f3812 100%)" }}>
        <div className="flex flex-col divide-y divide-white/10 p-6 sm:flex-row sm:divide-x sm:divide-y-0">
          {heroCell("Revenue (term)", ngnSmart(hero.revenueTerm), "Fees collected", `${meta.termLabel} · ${meta.session}`, "text-green-300")}
          {heroCell("Operating costs", hero.costsTerm ? `− ${ngnSmart(hero.costsTerm)}` : "₦0", "Salaries, diesel, supplies…", `${expensesLabel(hero.costsTerm)}`, "text-red-300")}
          {heroCell("Net profit", ngnSmart(hero.net), `Profit margin ${hero.margin}%`, hero.net >= 0 ? "healthy" : "spending exceeds fees", hero.net >= 0 ? "text-amber-300" : "text-red-300")}
          {heroCell("Cash recorded", ngnSmart(hero.cash), "All collections − all expenses", "from your records", "text-white/60")}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/10 bg-black/15 px-6 py-3">
          <span className="flex items-center gap-1.5 text-[12.5px] text-white/80">
            <span className="k-live-dot h-2 w-2 rounded-full bg-green-400" /> Updating live
          </span>
          {hero.lastExpense && <span className="text-[12.5px] text-white/70">Last expense: {hero.lastExpense}</span>}
          {hero.lastPayment && <span className="text-[12.5px] text-white/70">Last payment: {hero.lastPayment}</span>}
          <button onClick={() => setModal("pnl")} className="ml-auto inline-flex items-center gap-1.5 rounded-[var(--radius-card)] bg-white/10 px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-white/20">
            View full P&L <Icon name="arrowR" size={14} />
          </button>
        </div>
      </div>

      {/* charts row */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <div className="text-[15px] font-semibold text-ink">Revenue · Cost · Profit</div>
              <div className="text-[12px] text-ink-4">Last 6 months · ₦</div>
            </div>
            <div className="flex items-center gap-3 text-[12px] text-ink-3">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--color-forest)" }} /> Revenue</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--color-red)" }} /> Cost</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--color-amber)" }} /> Profit</span>
            </div>
          </div>
          <GroupedBars months={months} />
        </Card>
        <Card>
          <div className="mb-4 flex items-start justify-between">
            <div>
              <div className="text-[15px] font-semibold text-ink">Cost breakdown</div>
              <div className="text-[12px] text-ink-4">{monthName}</div>
            </div>
          </div>
          <Donut slices={slices} />
        </Card>
      </div>

      {/* revenue by level + payroll */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-start justify-between">
            <div>
              <div className="text-[15px] font-semibold text-ink">Revenue by class level</div>
              <div className="text-[12px] text-ink-4">This term, collected</div>
            </div>
            {levels.length > 0 && (
              <Pill tone="green">{[...levels].sort((a, b) => b.amount - a.amount)[0].label} leads</Pill>
            )}
          </div>
          {levels.length === 0 ? <div className="py-10 text-center text-[13px] text-ink-4">No payments yet.</div> : <LevelBars levels={levels} />}
        </Card>

        <Card>
          <div className="mb-4 flex items-start justify-between">
            <div>
              <div className="text-[15px] font-semibold text-ink">Payroll · {payroll.monthLabel}</div>
              <div className="text-[12px] text-ink-4">{payroll.totalStaff} staff on record</div>
            </div>
            <Pill tone="amber">module coming</Pill>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[var(--radius-card)] bg-secondary p-3">
              <div className="text-[12px] text-ink-4">Teaching</div>
              <div className="font-display text-[20px] font-bold text-ink">{payroll.teaching}</div>
              <div className="text-[11.5px] text-ink-4">staff</div>
            </div>
            <div className="rounded-[var(--radius-card)] bg-secondary p-3">
              <div className="text-[12px] text-ink-4">Non-teaching</div>
              <div className="font-display text-[20px] font-bold text-ink">{payroll.nonTeaching}</div>
              <div className="text-[11.5px] text-ink-4">staff</div>
            </div>
          </div>
          <div className="mt-3 rounded-[var(--radius-card)] border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-ink-2">Salaries logged this month</span>
              <span className="font-display text-[17px] font-bold text-ink">{ngn(payroll.salariesThisMonth)}</span>
            </div>
            <div className="mt-1 text-[11.5px] text-ink-4">Log salary payments as “Salaries” expenses — full payslips & approvals arrive with the payroll module.</div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => flash("Payslips arrive with the payroll module — coming soon.")} className="h-10 flex-1 rounded-[var(--radius-card)] border border-border text-[13px] font-medium text-ink-2 transition hover:bg-secondary">Review payslips</button>
            <button onClick={() => flash("Payroll approval arrives with the payroll module — coming soon.")} className="h-10 flex-1 rounded-[var(--radius-card)] bg-forest text-[13px] font-semibold text-white transition hover:bg-forest-2">Approve payroll</button>
          </div>
        </Card>
      </div>

      {/* recent expenses */}
      <Card pad={0} className="mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="text-[15px] font-semibold text-ink">Recent expenses</div>
          <div className="flex items-center gap-2">
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 rounded-[var(--radius-card)] border border-border bg-card px-2.5 text-[13px] text-ink outline-none focus:border-forest-line">
              <option value="all">All categories</option>
              {CATS.map((c) => (
                <option key={c} value={c}>{catLabel(c)}</option>
              ))}
            </select>
            {canEdit && (
              <button onClick={() => setModal("expense")} className="inline-flex items-center gap-1.5 rounded-[var(--radius-card)] bg-forest px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-forest-2">
                <Icon name="plus" size={15} /> Add expense
              </button>
            )}
          </div>
        </div>
        {shownExpenses.length === 0 ? (
          <div className="border-t border-border px-4 py-10 text-center text-[13px] text-ink-4">
            {expenses.length === 0 ? "No expenses logged yet — click “Log expense” to record your first." : "No expenses in this category."}
          </div>
        ) : (
          <div className="max-h-[55vh] overflow-auto border-t border-border">
            <table className="w-full border-collapse text-[13px]">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-[11px] uppercase tracking-[0.06em] text-ink-4">
                  <th className="px-5 py-2.5 text-left font-medium">Date</th>
                  <th className="px-5 py-2.5 text-left font-medium">Category</th>
                  <th className="px-5 py-2.5 text-left font-medium">Vendor / description</th>
                  <th className="px-5 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-5 py-2.5 text-left font-medium">Status</th>
                  {canEdit && <th className="px-5 py-2.5 text-right font-medium"></th>}
                </tr>
              </thead>
              <tbody>
                {shownExpenses.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                    <td className="px-5 py-3 text-ink-3">
                      {e.date} <span className="text-[11px] text-ink-4">{e.ref}</span>
                    </td>
                    <td className="px-5 py-3"><Pill tone={e.category === "SALARIES" ? "green" : e.category === "MAINTENANCE" ? "blue" : "amber"}>{catLabel(e.category)}</Pill></td>
                    <td className="px-5 py-3 text-ink-2">{e.description || "—"}</td>
                    <td className="px-5 py-3 text-right font-semibold text-ink">{ngn(e.amount)}</td>
                    <td className="px-5 py-3"><Pill tone="green">✓ Paid</Pill></td>
                    {canEdit && (
                      <td className="px-5 py-3 text-right">
                        <form action={deleteExpense} className="inline">
                          <input type="hidden" name="id" value={e.id} />
                          <button title="Delete" className="rounded-[7px] p-1.5 text-ink-4 hover:bg-red-soft hover:text-red">
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
      </Card>

      {modal === "expense" && <LogExpenseModal onClose={() => setModal("none")} />}
      {modal === "tax" && <TaxSummaryModal hero={hero} slices={slices} meta={meta} onClose={() => setModal("none")} />}
      {modal === "pnl" && <PnLModal months={months} meta={meta} onClose={() => setModal("none")} />}
      {modal === "statements" && <StatementsModal onClose={() => setModal("none")} />}
    </div>
  );
}

function expensesLabel(costs: number) {
  return costs > 0 ? "logged this term" : "none logged yet";
}
