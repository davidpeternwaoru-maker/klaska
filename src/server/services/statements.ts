import "server-only";

// Financial statements — real P&L, expense breakdown, cash flow and a
// balance-sheet-style summary computed from recorded fees, payments, invoices
// and expenses, for a chosen period (month / term / session). Money data, so
// access is Owner/Bursar only (matrix "financial"), enforced here — not the UI.

import { prisma } from "@/lib/db";
import { canView } from "@/lib/auth/permissions";
import { detectTerm, TERM_LABEL, type TermKey } from "@/lib/terms";
import { type Ctx, ServiceError } from "@/server/context";

export type Period = "month" | "term" | "session";
export type StatementLine = { label: string; amount: number };
export type FinancialStatements = {
  meta: { school: string; logoUrl: string | null; session: string; termLabel: string; periodLabel: string; period: Period };
  pnl: { revenue: StatementLine[]; revenueTotal: number; expenses: StatementLine[]; expenseTotal: number; net: number };
  expenseRows: { date: string; ref: string; category: string; description: string; amount: number }[];
  expenseByCategory: { category: string; amount: number; pct: number }[];
  cashflow: { months: { label: string; inflow: number; outflow: number; net: number }[]; totalIn: number; totalOut: number; net: number };
  balance: { cash: number; receivables: number; payables: number };
};

const CATEGORY_LABEL: Record<string, string> = {
  SALARIES: "Salaries & payroll",
  RENT: "Rent",
  UTILITIES: "Diesel, power & utilities",
  SUPPLIES: "Supplies & materials",
  TRANSPORT: "Transport",
  MAINTENANCE: "Maintenance & repairs",
  OTHER: "Levies & other",
};
const catLabel = (c: string) => CATEGORY_LABEL[c] ?? c.charAt(0) + c.slice(1).toLowerCase();
const fmtDay = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function periodRange(school: { session: string | null; term: string | null; termStart: Date | null; termEnd: Date | null }, period: Period) {
  const now = new Date();
  const fallback = detectTerm();
  if (period === "month") {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now, label: now.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) };
  }
  if (period === "term") {
    const start = school.termStart ?? fallback.termStart;
    const end = school.termEnd && school.termEnd < now ? school.termEnd : now;
    const termKey = (school.term as TermKey) || fallback.term;
    return { start, end, label: `${TERM_LABEL[termKey]} · ${school.session ?? fallback.session}` };
  }
  // session (full academic year)
  const y1 = parseInt((school.session ?? "").split("/")[0] || "", 10) || now.getFullYear();
  return { start: new Date(y1, 8, 1), end: now, label: `Session ${school.session ?? `${y1}/${y1 + 1}`}` };
}

export async function getFinancialStatements(ctx: Ctx, period: Period): Promise<FinancialStatements> {
  if (!canView(ctx.role, "financial")) throw new ServiceError("Only the owner or bursar can view financial statements.");
  const school = await prisma.school.findUnique({ where: { id: ctx.schoolId }, select: { name: true, logoUrl: true, session: true, term: true, termStart: true, termEnd: true } });
  const { start, end, label } = periodRange(school ?? { session: null, term: null, termStart: null, termEnd: null }, period);
  const termKey = (school?.term as TermKey) || detectTerm().term;

  const [payments, expenses, invoices] = await Promise.all([
    prisma.payment.findMany({ where: { schoolId: ctx.schoolId }, include: { invoice: { include: { lines: true } } }, orderBy: { paidAt: "asc" } }),
    prisma.expense.findMany({ where: { schoolId: ctx.schoolId }, orderBy: { spentAt: "asc" } }),
    prisma.invoice.findMany({ where: { schoolId: ctx.schoolId, session: school?.session ?? undefined, term: school?.term ?? undefined }, include: { payments: true } }),
  ]);

  const inPeriod = (d: Date) => d >= start && d <= end;
  const periodPayments = payments.filter((p) => inPeriod(p.paidAt));
  const periodExpenses = expenses.filter((e) => inPeriod(e.spentAt));

  // ── P&L revenue: allocate each payment across its invoice's fee lines ──
  const revMap = new Map<string, number>();
  let unallocated = 0;
  for (const p of periodPayments) {
    const lines = p.invoice?.lines ?? [];
    const lineTotal = lines.reduce((t, l) => t + l.amount, 0);
    if (lineTotal > 0) {
      for (const l of lines) revMap.set(l.description, (revMap.get(l.description) ?? 0) + Math.round(p.amount * (l.amount / lineTotal)));
    } else unallocated += p.amount;
  }
  if (unallocated > 0) revMap.set("Other fees", (revMap.get("Other fees") ?? 0) + unallocated);
  const revenue: StatementLine[] = [...revMap.entries()].map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount);
  const revenueTotal = periodPayments.reduce((t, p) => t + p.amount, 0);
  // rounding drift → fold into the largest line so revenue sums exactly
  const revSum = revenue.reduce((t, r) => t + r.amount, 0);
  if (revenue.length && revSum !== revenueTotal) revenue[0].amount += revenueTotal - revSum;

  // ── expenses by category ──
  const expMap = new Map<string, number>();
  for (const e of periodExpenses) expMap.set(e.category, (expMap.get(e.category) ?? 0) + e.amount);
  const expenseTotal = periodExpenses.reduce((t, e) => t + e.amount, 0);
  const expensesLines: StatementLine[] = [...expMap.entries()].map(([c, amount]) => ({ label: catLabel(c), amount })).sort((a, b) => b.amount - a.amount);
  const expenseByCategory = [...expMap.entries()]
    .map(([c, amount]) => ({ category: catLabel(c), amount, pct: expenseTotal ? Math.round((amount / expenseTotal) * 1000) / 10 : 0 }))
    .sort((a, b) => b.amount - a.amount);

  const expenseRows = periodExpenses
    .slice()
    .reverse()
    .map((e, i) => ({ date: fmtDay(e.spentAt), ref: `EX-${String(periodExpenses.length - i).padStart(4, "0")}`, category: catLabel(e.category), description: e.description ?? "", amount: e.amount }));

  // ── cash flow by month within the period ──
  const monthKeys: { key: string; label: string; d: Date }[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end) {
    monthKeys.push({ key: `${cur.getFullYear()}-${cur.getMonth()}`, label: cur.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }), d: new Date(cur) });
    cur.setMonth(cur.getMonth() + 1);
  }
  const monthOf = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  const cfMonths = monthKeys.map((m) => {
    const inflow = periodPayments.filter((p) => monthOf(p.paidAt) === m.key).reduce((t, p) => t + p.amount, 0);
    const outflow = periodExpenses.filter((e) => monthOf(e.spentAt) === m.key).reduce((t, e) => t + e.amount, 0);
    return { label: m.label, inflow, outflow, net: inflow - outflow };
  });

  // ── balance-sheet summary ──
  const cashToDate = payments.filter((p) => p.paidAt <= end).reduce((t, p) => t + p.amount, 0) - expenses.filter((e) => e.spentAt <= end).reduce((t, e) => t + e.amount, 0);
  const invoicedNow = invoices.reduce((t, inv) => t + inv.total, 0);
  const collectedNow = invoices.reduce((t, inv) => t + Math.min(inv.total, inv.payments.reduce((s, p) => s + p.amount, 0)), 0);
  const receivables = Math.max(0, invoicedNow - collectedNow);

  return {
    meta: { school: school?.name ?? "Your school", logoUrl: school?.logoUrl ?? null, session: school?.session ?? "", termLabel: TERM_LABEL[termKey], periodLabel: label, period },
    pnl: { revenue, revenueTotal, expenses: expensesLines, expenseTotal, net: revenueTotal - expenseTotal },
    expenseRows,
    expenseByCategory,
    cashflow: { months: cfMonths, totalIn: cfMonths.reduce((t, m) => t + m.inflow, 0), totalOut: cfMonths.reduce((t, m) => t + m.outflow, 0), net: cfMonths.reduce((t, m) => t + m.net, 0) },
    balance: { cash: cashToDate, receivables, payables: 0 },
  };
}
