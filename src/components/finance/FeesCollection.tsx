"use client";

// Fees & Payments in the original "Fees collection" design:
// header actions → collection-mode banner → 4 stat cards → collection rate by
// class → tabbed student table (All / Unpaid / Partial / Paid / Receipts).
// All figures are the school's real invoices & payments.

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Card, Pill, SectionTitle } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import { Icon, type IconName } from "@/components/ui/Icon";
import { generateInvoices, recordPayment, type FinanceState } from "@/lib/actions/finance";
import { type ExportMeta } from "@/lib/export/real-exports";
import { exportExcel, exportPdf } from "@/lib/export/engine";
import { feesReport, defaultersReport } from "@/lib/export/reports";

export type FeeRow = {
  id: string; // invoice id
  studentId: string;
  student: string;
  admissionNo: string | null;
  className: string | null;
  total: number;
  paid: number;
  payments: { id: string; amount: number; method: string; reference: string | null; when: string }[];
};
export type ClassStat = { label: string; expected: number; collected: number; pct: number };
export type FeeKpis = {
  collected: number;
  invoiced: number;
  pctCollected: number;
  outstanding: number;
  owingCount: number;
  fullyPaid: number;
  fullyPaidPct: number;
  avgDays: number | null;
};

const ngn = (n: number) => "₦" + n.toLocaleString("en-NG");
const ngnCompact = (n: number) => {
  if (n >= 1_000_000) return "₦" + (n / 1_000_000).toFixed(2).replace(/\.00$/, "") + "M";
  if (n >= 1_000) return "₦" + Math.round(n / 1_000) + "k";
  return "₦" + n;
};
const hueOf = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};

type StatusKey = "paid" | "partial" | "unpaid";
const statusOf = (r: FeeRow): StatusKey => (r.paid >= r.total ? "paid" : r.paid > 0 ? "partial" : "unpaid");
const STATUS_META: Record<StatusKey, { label: string; tone: "green" | "amber" | "red" }> = {
  paid: { label: "Paid in full", tone: "green" },
  partial: { label: "Partial", tone: "amber" },
  unpaid: { label: "Unpaid", tone: "red" },
};

/* ---------- stat card (matches screenshot look) ---------- */
function Stat({ label, value, sub, subTone, icon }: { label: string; value: string; sub: string; subTone: "green" | "amber"; icon: IconName }) {
  return (
    <Card pad={18}>
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-4">{label}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-secondary text-ink-3">
          <Icon name={icon} size={16} />
        </span>
      </div>
      <div className="mt-1 font-display text-[30px] font-bold tracking-[-0.02em] text-ink">{value}</div>
      <div className={`mt-1 text-[12.5px] font-medium ${subTone === "green" ? "text-green" : "text-amber-2"}`}>{sub}</div>
    </Card>
  );
}

/* ---------- record payment modal ---------- */
function PayModal({ row, onClose }: { row: FeeRow; onClose: () => void }) {
  const [state, action, pending] = useActionState<FinanceState, FormData>(recordPayment, {});
  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, state, onClose]);
  const balance = Math.max(0, row.total - row.paid);
  const input = "h-10 w-full rounded-[var(--radius-card)] border border-border bg-secondary px-3 text-[13.5px] text-ink outline-none focus:border-forest-line focus:bg-card";
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="mt-14 w-full max-w-[440px]" onClick={(e) => e.stopPropagation()}>
        <Card>
          <div className="mb-1 text-body font-semibold text-ink">Record payment — {row.student}</div>
          <div className="mb-3 text-[12.5px] text-ink-4">Balance <b className="text-ink">{ngn(balance)}</b> of {ngn(row.total)}</div>
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
              <button disabled={pending} className="h-10 rounded-[var(--radius-card)] bg-forest px-5 text-[13.5px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-60">
                {pending ? "Saving…" : "Record payment"}
              </button>
              <button type="button" onClick={onClose} className="h-10 rounded-[var(--radius-card)] border border-border px-4 text-[13px] font-medium text-ink-2 hover:bg-secondary">
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

/* ---------- record payment with student picker (header button) ---------- */
function PickPayModal({ rows, onClose }: { rows: FeeRow[]; onClose: () => void }) {
  // owing students first, then everyone else
  const ordered = useMemo(() => [...rows].sort((a, b) => Number(statusOf(a) === "paid") - Number(statusOf(b) === "paid")), [rows]);
  const [selectedId, setSelectedId] = useState(ordered[0]?.id ?? "");
  const row = ordered.find((r) => r.id === selectedId) ?? null;

  if (rows.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/45 p-4 backdrop-blur-sm" onClick={onClose}>
        <div className="mt-14 w-full max-w-[440px]" onClick={(e) => e.stopPropagation()}>
          <Card>
            <div className="mb-1 text-body font-semibold text-ink">Record payment</div>
            <p className="text-[13px] text-ink-4">No invoices for this term yet — use “Generate this term&apos;s invoices” in the banner above first, then record payments against them.</p>
            <div className="mt-4 flex justify-end">
              <button onClick={onClose} className="h-10 rounded-[var(--radius-card)] border border-border px-4 text-[13px] font-medium text-ink-2 hover:bg-secondary">Close</button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="mt-14 w-full max-w-[460px]" onClick={(e) => e.stopPropagation()}>
        <Card>
          <div className="mb-3 text-body font-semibold text-ink">Record payment</div>
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Student</span>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="h-10 w-full rounded-[var(--radius-card)] border border-border bg-secondary px-3 text-[13.5px] text-ink outline-none focus:border-forest-line focus:bg-card"
            >
              {ordered.map((r) => {
                const bal = Math.max(0, r.total - r.paid);
                return (
                  <option key={r.id} value={r.id}>
                    {r.student} — {r.className ?? "no class"} · {bal > 0 ? `owes ${ngn(bal)}` : "paid in full"}
                  </option>
                );
              })}
            </select>
          </label>
          {row && <InlinePayForm row={row} onDone={onClose} />}
        </Card>
      </div>
    </div>
  );
}

function InlinePayForm({ row, onDone }: { row: FeeRow; onDone: () => void }) {
  const [state, action, pending] = useActionState<FinanceState, FormData>(recordPayment, {});
  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, state, onDone]);
  const balance = Math.max(0, row.total - row.paid);
  const input = "h-10 w-full rounded-[var(--radius-card)] border border-border bg-secondary px-3 text-[13.5px] text-ink outline-none focus:border-forest-line focus:bg-card";
  return (
    <form key={row.id} action={action} className="mt-3 flex flex-col gap-3">
      <input type="hidden" name="invoiceId" value={row.id} />
      <div className="rounded-[var(--radius-card)] bg-secondary px-3 py-2 text-[12.5px] text-ink-3">
        Bill {ngn(row.total)} · paid {ngn(row.paid)} · balance <b className="text-ink">{ngn(balance)}</b>
      </div>
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
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="h-10 rounded-[var(--radius-card)] border border-border px-4 text-[13px] font-medium text-ink-2 hover:bg-secondary">Cancel</button>
        <button disabled={pending} className="h-10 rounded-[var(--radius-card)] bg-forest px-5 text-[13.5px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-60">
          {pending ? "Saving…" : "Record payment"}
        </button>
      </div>
    </form>
  );
}

/* ---------- main ---------- */
export function FeesCollection({
  meta,
  rows,
  classStats,
  kpis,
  classRange,
  termEndsWeeks,
  feeMode,
  canManage,
}: {
  meta: ExportMeta;
  rows: FeeRow[];
  classStats: ClassStat[];
  kpis: FeeKpis;
  classRange: string;
  termEndsWeeks: number | null;
  feeMode: string;
  canManage: boolean;
}) {
  const [tab, setTab] = useState<"all" | StatusKey | "receipts">("all");
  const [classFilter, setClassFilter] = useState("all");
  const [q, setQ] = useState("");
  const [paying, setPaying] = useState<FeeRow | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [genPending, startGen] = useTransition();

  const counts = useMemo(() => {
    const c = { paid: 0, partial: 0, unpaid: 0 };
    rows.forEach((r) => c[statusOf(r)]++);
    return c;
  }, [rows]);

  const classOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.className).filter(Boolean))) as string[], [rows]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab !== "all" && tab !== "receipts" && statusOf(r) !== tab) return false;
      if (classFilter !== "all" && r.className !== classFilter) return false;
      if (t && !r.student.toLowerCase().includes(t) && !(r.admissionNo ?? "").toLowerCase().includes(t)) return false;
      return true;
    });
  }, [rows, tab, classFilter, q]);

  const receipts = useMemo(
    () => rows.flatMap((r) => r.payments.map((p) => ({ ...p, student: r.student, className: r.className }))).sort((a, b) => (a.when < b.when ? 1 : -1)),
    [rows],
  );

  const flash = (m: string) => {
    setNote(m);
    setTimeout(() => setNote(null), 3500);
  };

  const gen = () =>
    startGen(async () => {
      const res = await generateInvoices();
      flash(res.ok ? `Created ${res.created} invoice(s).` : res.error ?? "Nothing to do.");
    });

  
  const tabBtn = (v: typeof tab, label: string) => (
    <button
      key={v}
      onClick={() => setTab(v)}
      className={`h-9 rounded-[9px] px-3.5 text-[13px] font-medium transition ${tab === v ? "bg-card text-ink shadow-[0_1px_2px_rgba(20,20,18,0.08)]" : "text-ink-3 hover:text-ink"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="mx-auto max-w-[1320px]">
      <SectionTitle
        eyebrow="Fees & Payments"
        title="Fees collection"
        sub={`Term fee status for every student across ${classRange}.`}
        right={
          <>
            <button onClick={() => exportExcel(feesReport({ school: meta.school, term: meta.termLabel, session: meta.session }, rows, classStats, kpis))} className="inline-flex items-center gap-1.5 rounded-[var(--radius-card)] border border-border px-3.5 py-2 text-[13px] font-medium text-ink-2 transition hover:bg-secondary">
              <Icon name="download" size={15} /> Export to Excel
            </button>
            <button onClick={() => exportPdf(feesReport({ school: meta.school, term: meta.termLabel, session: meta.session }, rows, classStats, kpis))} className="inline-flex items-center gap-1.5 rounded-[var(--radius-card)] border border-border px-3.5 py-2 text-[13px] font-medium text-ink-2 transition hover:bg-secondary">
              <Icon name="reports" size={15} /> PDF
            </button>
            <button onClick={() => exportExcel(defaultersReport({ school: meta.school, term: meta.termLabel, session: meta.session }, rows))} className="inline-flex items-center gap-1.5 rounded-[var(--radius-card)] border border-border px-3.5 py-2 text-[13px] font-medium text-ink-2 transition hover:bg-secondary">
              <Icon name="alert" size={15} /> Defaulters
            </button>
            <button onClick={() => flash("Pay links arrive with virtual collection — coming soon.")} className="inline-flex items-center gap-1.5 rounded-[var(--radius-card)] border border-border px-3.5 py-2 text-[13px] font-medium text-ink-2 transition hover:bg-secondary">
              <Icon name="bell" size={15} /> Send pay link
            </button>
            {canManage && (
              <button onClick={() => setPickerOpen(true)} className="inline-flex items-center gap-1.5 rounded-[var(--radius-card)] bg-forest px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-forest-2">
                <Icon name="plus" size={15} /> Record payment
              </button>
            )}
          </>
        }
      />

      {note && <div className="mb-3 rounded-[var(--radius-card)] bg-amber-soft px-3.5 py-2 text-[12.5px] font-medium text-amber-2">{note}</div>}

      {/* collection-mode banner */}
      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[var(--radius-card)] bg-forest-soft text-forest">
            <Icon name={feeMode === "VIRTUAL" ? "nfc" : "receipt"} size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[14.5px] font-semibold text-ink">
                {feeMode === "VIRTUAL" ? "Automatic collection — virtual accounts" : "Manual collection — bursar records payments"}
              </span>
              <Pill tone={feeMode === "VIRTUAL" ? "green" : "amber"}>{feeMode === "VIRTUAL" ? "Instant match" : "Manual mode"}</Pill>
            </div>
            <div className="text-[12.5px] text-ink-4">
              {feeMode === "VIRTUAL"
                ? "Each student has a dedicated virtual account. Payments match and reflect instantly — receipt generated on the spot."
                : "Payments are recorded here as they come in (cash, transfer, POS). Virtual accounts with instant matching are coming."}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <button onClick={gen} disabled={genPending} className="rounded-[var(--radius-card)] border border-border px-3.5 py-2 text-[13px] font-medium text-ink-2 transition hover:bg-secondary disabled:opacity-60">
                {genPending ? "Generating…" : "Generate this term's invoices"}
              </button>
            )}
            <Link href="/settings" className="inline-flex items-center gap-1 rounded-[var(--radius-card)] border border-border px-3.5 py-2 text-[13px] font-medium text-ink-2 transition hover:bg-secondary">
              Change in Settings <Icon name="arrowR" size={14} />
            </Link>
          </div>
        </div>
      </Card>

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Collected this term" value={ngnCompact(kpis.collected)} sub={`↑ ${kpis.pctCollected}% of total`} subTone="green" icon="fees" />
        <Stat label="Outstanding" value={ngnCompact(kpis.outstanding)} sub={`${kpis.owingCount} students`} subTone="amber" icon="clock" />
        <Stat label="Fully paid" value={String(kpis.fullyPaid)} sub={`↑ ${kpis.fullyPaidPct}% of school`} subTone="green" icon="check" />
        <Stat label="Avg time to pay" value={kpis.avgDays != null ? `${kpis.avgDays} days` : "—"} sub={kpis.avgDays != null ? "from invoice to paid-up" : "no fully-paid bills yet"} subTone="green" icon="trend" />
      </div>

      {/* collection rate by class */}
      <Card className="mt-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-[15px] font-semibold text-ink">Collection rate by class</div>
          {termEndsWeeks != null && <Pill tone="neutral">Term ends in {termEndsWeeks} week{termEndsWeeks === 1 ? "" : "s"}</Pill>}
        </div>
        {classStats.length === 0 ? (
          <div className="text-[13px] text-ink-4">No invoices yet — generate this term&apos;s invoices to see collection by class.</div>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 xl:grid-cols-6">
            {classStats.map((c) => (
              <div key={c.label}>
                <div className="text-[13px] font-medium text-ink">{c.label}</div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.pct >= 75 ? "var(--color-forest)" : "var(--color-amber)" }} />
                </div>
                <div className="mt-1 text-[12px]">
                  <span className="font-semibold text-ink">{c.pct}%</span> <span className="text-ink-4">{ngnCompact(c.collected)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* tabbed table */}
      <Card pad={0} className="mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5">
          <div className="inline-flex flex-wrap gap-0.5 rounded-[11px] bg-secondary p-1">
            {tabBtn("all", "All students")}
            {tabBtn("unpaid", `Unpaid · ${counts.unpaid}`)}
            {tabBtn("partial", `Partial · ${counts.partial}`)}
            {tabBtn("paid", `Paid in full · ${counts.paid}`)}
            {tabBtn("receipts", "Receipts")}
          </div>
          <div className="flex items-center gap-2">
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="h-9 rounded-[var(--radius-card)] border border-border bg-card px-2.5 text-[13px] text-ink outline-none focus:border-forest-line">
              <option value="all">All classes</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="relative">
              <Icon name="search" size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-ink-4)" }} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-9 w-36 rounded-[var(--radius-card)] border border-border bg-card pl-7.5 pr-2 text-[13px] text-ink outline-none placeholder:text-ink-4 focus:border-forest-line" style={{ paddingLeft: 30 }} />
            </div>
          </div>
        </div>

        {tab === "receipts" ? (
          receipts.length === 0 ? (
            <div className="border-t border-border px-4 py-10 text-center text-[13px] text-ink-4">No payments recorded yet.</div>
          ) : (
            <div className="max-h-[55vh] overflow-auto border-t border-border">
              <table className="w-full border-collapse text-[13px]">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-[11px] uppercase tracking-[0.06em] text-ink-4">
                    <th className="px-5 py-2.5 text-left font-medium">Date</th>
                    <th className="px-5 py-2.5 text-left font-medium">Student</th>
                    <th className="px-5 py-2.5 text-left font-medium">Class</th>
                    <th className="px-5 py-2.5 text-left font-medium">Method</th>
                    <th className="px-5 py-2.5 text-left font-medium">Reference</th>
                    <th className="px-5 py-2.5 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                      <td className="px-5 py-2.5 text-ink-4">{p.when}</td>
                      <td className="px-5 py-2.5 font-medium text-ink">{p.student}</td>
                      <td className="px-5 py-2.5 text-ink-3">{p.className ?? "—"}</td>
                      <td className="px-5 py-2.5 text-ink-3">{p.method.toLowerCase()}</td>
                      <td className="px-5 py-2.5 text-ink-4">{p.reference ?? "—"}</td>
                      <td className="px-5 py-2.5 text-right font-semibold text-green">{ngn(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : shown.length === 0 ? (
          <div className="border-t border-border px-4 py-10 text-center text-[13px] text-ink-4">
            {rows.length === 0 ? (
              <>No invoices for this term yet.{canManage ? " Use “Generate this term's invoices” above to bill every student." : ""}</>
            ) : (
              "No students match this filter."
            )}
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-auto border-t border-border">
            <table className="w-full border-collapse text-[13px]">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-[11px] uppercase tracking-[0.06em] text-ink-4">
                  <th className="px-5 py-2.5 text-left font-medium">Student</th>
                  <th className="px-5 py-2.5 text-left font-medium">Class</th>
                  <th className="px-5 py-2.5 text-left font-medium">Fee</th>
                  <th className="px-5 py-2.5 text-left font-medium">Paid</th>
                  <th className="px-5 py-2.5 text-left font-medium">Status</th>
                  <th className="px-5 py-2.5 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const st = STATUS_META[statusOf(r)];
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={r.student} hue={hueOf(r.studentId)} size={34} />
                          <span className="min-w-0">
                            <span className="block truncate text-[13.5px] font-semibold text-ink">{r.student}</span>
                            <span className="block text-[11.5px] text-ink-4">{r.admissionNo ?? "—"}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-ink-3">{r.className ?? "—"}</td>
                      <td className="px-5 py-3 font-medium text-ink">{ngn(r.total)}</td>
                      <td className="px-5 py-3 text-ink-3">{r.paid > 0 ? ngn(r.paid) : "₦0"}</td>
                      <td className="px-5 py-3"><Pill tone={st.tone}>{st.label}</Pill></td>
                      <td className="px-5 py-3 text-right">
                        {canManage && (
                          <button onClick={() => setPaying(r)} title="Record payment" className="rounded-[8px] px-2 py-1 text-[16px] font-bold leading-none text-ink-4 transition hover:bg-secondary hover:text-ink">
                            …
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {paying && <PayModal row={paying} onClose={() => setPaying(null)} />}
      {pickerOpen && <PickPayModal rows={rows} onClose={() => setPickerOpen(false)} />}
    </div>
  );
}
