// Report builders — turn a screen's view-data into a ReportSpec for the shared
// export engine. Keeping these separate means every feature describes its report
// once and gets a consistently branded, formatted .xlsx AND .pdf for free.

import type { ReportSpec, Sheet, Row } from "./engine";
import type { FeeRow, ClassStat, FeeKpis } from "@/components/finance/FeesCollection";
import type { AnalysisRow } from "@/lib/analysis-drill";
import { computeBundle, scopeFilter, type Scope } from "@/lib/analysis-compute";
import type { FinancialStatements } from "@/server/services/statements";

type Brand = { school: string; logoUrl?: string | null; term?: string | null; session?: string | null };

const statusOf = (r: { paid: number; total: number }) => (r.paid >= r.total && r.total > 0 ? "paid" : r.paid > 0 ? "part" : "unpaid");

/** Fees & Payments report: Overview + per-class collection + a tab per class. */
export function feesReport(brand: Brand, rows: FeeRow[], classStats: ClassStat[], kpis: FeeKpis): ReportSpec {
  const overview: Sheet = {
    name: "Overview",
    title: "Fees Collection — Overview",
    columns: [
      { header: "Metric", width: 26 },
      { header: "Amount", format: "ngn", width: 18 },
      { header: "Rate", format: "pct", width: 10 },
    ],
    rows: [
      { cells: ["Total invoiced", kpis.invoiced, null] },
      { cells: ["Collected", { v: kpis.collected, tone: "pos" }, kpis.pctCollected] },
      { cells: ["Outstanding", { v: kpis.outstanding, tone: kpis.outstanding > 0 ? "neg" : null }, Math.max(0, 100 - kpis.pctCollected)] },
      { cells: ["Students fully paid", null, kpis.fullyPaidPct] },
      { role: "total", cells: ["Net collected", { v: kpis.collected, tone: "pos" }, kpis.pctCollected] },
    ],
    note: "Fees summary generated from recorded invoices and payments — for management use.",
  };

  const byClass: Sheet = {
    name: "By class",
    title: "Collection by class",
    columns: [
      { header: "Class", width: 18 },
      { header: "Expected", format: "ngn", width: 16 },
      { header: "Collected", format: "ngn", width: 16 },
      { header: "Outstanding", format: "ngn", width: 16 },
      { header: "Rate", format: "pct", width: 10 },
    ],
    rows: [
      ...classStats.map<Row>((c) => ({
        cells: [
          c.label,
          c.expected,
          { v: c.collected, tone: "pos" },
          { v: c.expected - c.collected, tone: c.expected - c.collected > 0 ? "neg" : null },
          c.pct,
        ],
      })),
      {
        role: "total",
        cells: [
          "All classes",
          classStats.reduce((t, c) => t + c.expected, 0),
          classStats.reduce((t, c) => t + c.collected, 0),
          classStats.reduce((t, c) => t + (c.expected - c.collected), 0),
          kpis.pctCollected,
        ],
      },
    ],
  };

  // one sheet per class (student-level status)
  const groups = new Map<string, FeeRow[]>();
  for (const r of rows) {
    const k = r.className ?? "Unassigned";
    const arr = groups.get(k) ?? [];
    arr.push(r);
    groups.set(k, arr);
  }
  const classSheets: Sheet[] = [...groups.entries()].map(([cls, list]) => ({
    name: cls,
    title: `${cls} — fee status`,
    columns: [
      { header: "Student", width: 26 },
      { header: "Adm. no.", width: 14 },
      { header: "Expected", format: "ngn", width: 15 },
      { header: "Paid", format: "ngn", width: 15 },
      { header: "Balance", format: "ngn", width: 15 },
      { header: "Status", width: 12, align: "center" },
    ],
    rows: [
      ...list.map<Row>((r) => {
        const st = statusOf(r);
        return {
          cells: [
            r.student,
            r.admissionNo ?? "—",
            r.total,
            { v: r.paid, tone: st === "paid" ? "paid" : st === "unpaid" ? "neg" : null },
            { v: Math.max(0, r.total - r.paid), tone: r.total - r.paid > 0 ? "neg" : null },
            st === "paid" ? { v: "Paid", tone: "paid" } : st === "unpaid" ? { v: "Unpaid", tone: "unpaid" } : { v: "Part-paid" },
          ],
        };
      }),
      {
        role: "subtotal",
        cells: [
          `Subtotal · ${list.length} students`,
          "",
          list.reduce((t, r) => t + r.total, 0),
          list.reduce((t, r) => t + Math.min(r.paid, r.total), 0),
          list.reduce((t, r) => t + Math.max(0, r.total - r.paid), 0),
          "",
        ],
      },
    ],
  }));

  return {
    fileName: `fees-${(brand.session ?? "").replace(/\//g, "-")}-${brand.term ?? ""}`.replace(/\s+/g, "").toLowerCase() || "fees",
    title: "Fees Collection Report",
    brand,
    sheets: [overview, byClass, ...classSheets],
  };
}

// ── Result / report analysis ────────────────────────────────────────────────
type AnalysisMeta = { school: string; logoUrl?: string | null; term?: string | null; session?: string | null; prevLabel: string; sectionLabels: Record<string, string> };

/** Result-analysis report for a drill-down scope: summary + best students / per
 *  subject / per department / most improved / ranked, plus a tab per class. */
export function analysisReport(rows: AnalysisRow[], prevAvg: Record<string, number>, scope: Scope, meta: AnalysisMeta): ReportSpec {
  const b = computeBundle(rows, prevAvg, scope, meta.sectionLabels);
  const scoped = scopeFilter(rows, scope);

  const summary: Sheet = {
    name: "Summary",
    title: `Analysis — ${b.scopeTitle}`,
    columns: [{ header: "Metric", width: 24 }, { header: "Value", width: 18 }],
    rows: [
      { cells: ["Students scored", b.count] },
      { cells: ["Average", b.average] },
      { cells: ["Pass rate (≥50)", { v: b.passRate + "%" }] },
      { cells: ["Top student", b.bestStudents[0] ? `${b.bestStudents[0].name} (${b.bestStudents[0].average})` : "—"] },
      { cells: ["Subjects", b.subjectAverages.length] },
    ],
    note: "Analysis generated from recorded results.",
  };

  const bestStudents: Sheet = {
    name: "Best students",
    columns: [{ header: "#", width: 5, align: "center" }, { header: "Student", width: 26 }, { header: "Average", format: "num1", width: 12 }, { header: "Class", width: 14 }, { header: "Department", width: 14 }],
    rows: b.ranked.slice(0, 30).map<Row>((s, i) => ({ cells: [i + 1, s.name, { v: s.average, tone: i === 0 ? "pos" : null }, s.className, s.department ?? "—"] })),
  };

  const bestSubject: Sheet = {
    name: "Best per subject",
    columns: [{ header: "Subject", width: 22 }, { header: "Top student", width: 24 }, { header: "Score", format: "int", width: 10 }, { header: "Subject avg", format: "num1", width: 12 }],
    rows: b.bestPerSubject.map<Row>((s) => ({ cells: [s.subject, s.best?.name ?? "—", s.best?.total ?? null, s.average] })),
  };

  const improved: Sheet = {
    name: "Most improved",
    columns: [{ header: "Student", width: 26 }, { header: meta.prevLabel, format: "num1", width: 14 }, { header: "This term", format: "num1", width: 12 }, { header: "Change", format: "num1", width: 10 }],
    rows: b.mostImproved.map<Row>((m) => ({ cells: [m.name, m.from, m.to, { v: m.delta, tone: "pos" }] })),
  };

  const sheets: Sheet[] = [summary, bestStudents, bestSubject, improved];

  if (b.bestPerDept.length) {
    sheets.push({
      name: "By department",
      columns: [{ header: "Department", width: 16 }, { header: "Best student", width: 26 }, { header: "Average", format: "num1", width: 12 }],
      rows: b.bestPerDept.map<Row>((d) => ({ cells: [d.department, d.best?.name ?? "—", { v: d.best?.average ?? null, tone: "pos" }] })),
    });
  }

  sheets.push({
    name: "Ranked list",
    columns: [{ header: "#", width: 5, align: "center" }, { header: "Student", width: 26 }, { header: "Class", width: 14 }, { header: "Department", width: 14 }, { header: "Average", format: "num1", width: 12 }],
    rows: b.ranked.map<Row>((s, i) => ({ cells: [i + 1, s.name, s.className, s.department ?? "—", s.average] })),
  });

  // one broadsheet tab per class in scope
  const classes = [...new Set(scoped.map((r) => r.className))].sort();
  for (const cls of classes.slice(0, 30)) {
    const crows = scoped.filter((r) => r.className === cls);
    const subjects = [...new Set(crows.map((r) => r.subject))].sort();
    const byStudent = new Map<string, Record<string, number>>();
    for (const r of crows) {
      const e = byStudent.get(r.student) ?? {};
      e[r.subject] = r.total;
      byStudent.set(r.student, e);
    }
    const ranked = [...byStudent.entries()]
      .map(([name, sub]) => ({ name, sub, avg: Math.round((Object.values(sub).reduce((a, c) => a + c, 0) / Object.values(sub).length) * 10) / 10 }))
      .sort((a, c) => c.avg - a.avg);
    sheets.push({
      name: cls,
      title: `${cls} — broadsheet`,
      columns: [
        { header: "Student", width: 24 },
        ...subjects.map((s) => ({ header: s.length > 14 ? s.slice(0, 12) + "…" : s, format: "int" as const, width: 11 })),
        { header: "Average", format: "num1", width: 11 },
        { header: "Pos", format: "int", width: 7, align: "center" as const },
      ],
      rows: ranked.map<Row>((st, i) => ({ cells: [st.name, ...subjects.map((sj) => st.sub[sj] ?? null), { v: st.avg, tone: i === 0 ? "pos" : null }, i + 1] })),
    });
  }

  return {
    fileName: `analysis-${b.scopeTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
    title: `Result Analysis — ${b.scopeTitle}`,
    brand: { school: meta.school, logoUrl: meta.logoUrl, term: meta.term, session: meta.session },
    sheets,
  };
}

// ── Financial statements (P&L, expenses, cash flow, balance summary) ─────────
export type StatementKind = "pnl" | "expenses" | "cashflow" | "balance" | "all";

const pnlSheet = (d: FinancialStatements): Sheet => ({
  name: "Profit & Loss",
  title: "Profit & Loss (Income Statement)",
  columns: [{ header: "Item", width: 34 }, { header: "Amount", format: "ngn", width: 18 }],
  rows: [
    { role: "section", cells: ["REVENUE", null] },
    ...d.pnl.revenue.map<Row>((r) => ({ cells: [r.label, r.amount] })),
    { role: "subtotal", cells: ["Total revenue", d.pnl.revenueTotal] },
    { role: "spacer", cells: [] },
    { role: "section", cells: ["EXPENSES", null] },
    ...d.pnl.expenses.map<Row>((e) => ({ cells: [e.label, { v: e.amount, tone: "neg" }] })),
    { role: "subtotal", cells: ["Total expenses", { v: d.pnl.expenseTotal, tone: "neg" }] },
    { role: "spacer", cells: [] },
    { role: "total", cells: ["NET PROFIT", { v: d.pnl.net, tone: d.pnl.net >= 0 ? "pos" : "neg" }] },
  ],
  note: "For management use — computed from fees, payments and expenses recorded in Klaska.",
});

const expenseCatSheet = (d: FinancialStatements): Sheet => ({
  name: "Expenses by category",
  columns: [{ header: "Category", width: 26 }, { header: "Amount", format: "ngn", width: 18 }, { header: "% of total", format: "num1", width: 12 }],
  rows: [
    ...d.expenseByCategory.map<Row>((c) => ({ cells: [c.category, { v: c.amount, tone: "neg" }, c.pct] })),
    { role: "total", cells: ["Total expenses", { v: d.pnl.expenseTotal, tone: "neg" }, 100] },
  ],
});

const expenseRegisterSheet = (d: FinancialStatements): Sheet => ({
  name: "Expense register",
  columns: [{ header: "Date", width: 14 }, { header: "Ref", width: 10 }, { header: "Category", width: 22 }, { header: "Description", width: 36 }, { header: "Amount", format: "ngn", width: 16 }],
  rows: [
    ...d.expenseRows.map<Row>((e) => ({ cells: [e.date, e.ref, e.category, e.description, e.amount] })),
    { role: "total", cells: ["", "", "", "Total", { v: d.pnl.expenseTotal, tone: "neg" }] },
  ],
});

const cashflowSheet = (d: FinancialStatements): Sheet => ({
  name: "Cash flow",
  title: "Cash flow summary",
  columns: [{ header: "Month", width: 14 }, { header: "Money in", format: "ngn", width: 16 }, { header: "Money out", format: "ngn", width: 16 }, { header: "Net", format: "ngn", width: 16 }],
  rows: [
    ...d.cashflow.months.map<Row>((m) => ({ cells: [m.label, { v: m.inflow, tone: "pos" }, { v: m.outflow, tone: "neg" }, { v: m.net, tone: m.net >= 0 ? "pos" : "neg" }] })),
    { role: "total", cells: ["Total", { v: d.cashflow.totalIn, tone: "pos" }, { v: d.cashflow.totalOut, tone: "neg" }, { v: d.cashflow.net, tone: d.cashflow.net >= 0 ? "pos" : "neg" }] },
  ],
});

const balanceSheet = (d: FinancialStatements): Sheet => ({
  name: "Balance summary",
  title: "Balance-sheet summary",
  columns: [{ header: "Item", width: 40 }, { header: "Amount", format: "ngn", width: 18 }],
  rows: [
    { role: "section", cells: ["ASSETS", null] },
    { cells: ["Cash position (from recorded transactions)", { v: d.balance.cash, tone: d.balance.cash >= 0 ? "pos" : "neg" }] },
    { cells: ["Receivables — outstanding fees", { v: d.balance.receivables, tone: d.balance.receivables > 0 ? "neg" : null }] },
    { role: "subtotal", cells: ["Total assets (indicative)", d.balance.cash + d.balance.receivables] },
    { role: "spacer", cells: [] },
    { role: "section", cells: ["LIABILITIES", null] },
    { cells: ["Payables (recorded)", d.balance.payables] },
    { role: "subtotal", cells: ["Total liabilities (recorded)", d.balance.payables] },
  ],
  note: "Summary — for management use, to be completed by your accountant. Derived only from transactions recorded in Klaska; these are not audited accounts.",
});

const kindTitle: Record<StatementKind, string> = {
  pnl: "Profit & Loss Statement",
  expenses: "Expense Breakdown Report",
  cashflow: "Cash Flow Summary",
  balance: "Balance-Sheet Summary",
  all: "Financial Statements",
};

/** Financial statements report for the chosen period + statement selection. */
export function statementsReport(d: FinancialStatements, which: StatementKind): ReportSpec {
  const sheets: Sheet[] = [];
  if (which === "pnl" || which === "all") sheets.push(pnlSheet(d));
  if (which === "expenses" || which === "all") sheets.push(expenseCatSheet(d), expenseRegisterSheet(d));
  if (which === "cashflow" || which === "all") sheets.push(cashflowSheet(d));
  if (which === "balance" || which === "all") sheets.push(balanceSheet(d));
  return {
    fileName: `${which === "all" ? "financial-statements" : which}-${d.meta.period}`,
    title: kindTitle[which],
    brand: { school: d.meta.school, logoUrl: d.meta.logoUrl, term: d.meta.periodLabel, session: null },
    sheets,
  };
}
