// Report builders — turn a screen's view-data into a ReportSpec for the shared
// export engine. Keeping these separate means every feature describes its report
// once and gets a consistently branded, formatted .xlsx AND .pdf for free.

import type { ReportSpec, Sheet, Row } from "./engine";
import type { FeeRow, ClassStat, FeeKpis } from "@/components/finance/FeesCollection";
import type { AnalysisRow } from "@/lib/analysis-drill";
import { computeBundle, scopeFilter, type Scope } from "@/lib/analysis-compute";
import type { FinancialStatements } from "@/server/services/statements";
import { COMPETENCIES, type Appraisal } from "@/lib/appraisals/config";
import { ROLE_LABEL } from "@/lib/auth/permissions";
import type { Role } from "@/lib/auth/jwt";

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

// ── Fee defaulters ──────────────────────────────────────────────────────────
export function defaultersReport(brand: Brand, rows: FeeRow[]): ReportSpec {
  const owing = rows.filter((r) => r.paid < r.total).map((r) => ({ ...r, balance: r.total - r.paid })).sort((a, b) => b.balance - a.balance);
  return {
    fileName: `fee-defaulters-${brand.term ?? ""}`.replace(/\s+/g, "").toLowerCase() || "fee-defaulters",
    title: "Fee Defaulters",
    brand,
    sheets: [
      {
        name: "Defaulters",
        columns: [
          { header: "Student", width: 26 },
          { header: "Adm. no.", width: 14 },
          { header: "Class", width: 16 },
          { header: "Expected", format: "ngn", width: 15 },
          { header: "Paid", format: "ngn", width: 15 },
          { header: "Balance owed", format: "ngn", width: 16 },
        ],
        rows: [
          ...owing.map<Row>((r) => ({ cells: [r.student, r.admissionNo ?? "—", r.className ?? "—", r.total, r.paid, { v: r.balance, tone: "neg" }] })),
          { role: "total", cells: [`Total · ${owing.length} students owing`, "", "", owing.reduce((t, r) => t + r.total, 0), owing.reduce((t, r) => t + r.paid, 0), { v: owing.reduce((t, r) => t + r.balance, 0), tone: "neg" }] },
        ],
        note: "Students with an outstanding fee balance — for management use.",
      },
    ],
  };
}

// ── Student directory ───────────────────────────────────────────────────────
type DirStudent = { name: string; admissionNo: string | null; gender: string | null; className: string | null };
export function studentDirectoryReport(brand: Brand, students: DirStudent[]): ReportSpec {
  const sorted = [...students].sort((a, b) => (a.className ?? "~").localeCompare(b.className ?? "~") || a.name.localeCompare(b.name));
  return {
    fileName: "student-directory",
    title: "Student Directory",
    brand,
    sheets: [
      {
        name: "All students",
        columns: [{ header: "#", width: 5, align: "center" }, { header: "Student", width: 28 }, { header: "Adm. no.", width: 14 }, { header: "Class", width: 16 }, { header: "Sex", width: 8, align: "center" }],
        rows: [
          ...sorted.map<Row>((s, i) => ({ cells: [i + 1, s.name, s.admissionNo ?? "—", s.className ?? "Unassigned", s.gender === "M" ? "M" : s.gender === "F" ? "F" : "—"] })),
          { role: "total", cells: ["", `Total · ${sorted.length} students`, "", "", ""] },
        ],
      },
    ],
  };
}

// ── Tax summary ─────────────────────────────────────────────────────────────
export function taxReport(brand: Brand, revenue: number, expensesByCat: { category: string; amount: number }[], net: number): ReportSpec {
  const deductible = expensesByCat.reduce((t, e) => t + e.amount, 0);
  return {
    fileName: `tax-summary-${brand.term ?? ""}`.replace(/\s+/g, "").toLowerCase() || "tax-summary",
    title: "Tax Summary",
    brand,
    sheets: [
      {
        name: "Tax summary",
        columns: [{ header: "Item", width: 34 }, { header: "Amount", format: "ngn", width: 18 }],
        rows: [
          { role: "section", cells: ["INCOME", null] },
          { cells: ["Gross revenue (fees collected)", { v: revenue, tone: "pos" }] },
          { role: "spacer", cells: [] },
          { role: "section", cells: ["DEDUCTIBLE EXPENSES", null] },
          ...expensesByCat.map<Row>((e) => ({ cells: [e.category, { v: e.amount, tone: "neg" }] })),
          { role: "subtotal", cells: ["Total deductible expenses", { v: deductible, tone: "neg" }] },
          { role: "spacer", cells: [] },
          { role: "total", cells: ["Net surplus (taxable basis)", { v: net, tone: net >= 0 ? "pos" : "neg" }] },
        ],
        note: "Indicative tax basis for management use — to be confirmed with your accountant. Not a filed return.",
      },
    ],
  };
}

// ── Staff appraisals ────────────────────────────────────────────────────────
export function appraisalsReport(brand: Brand, board: Appraisal[]): ReportSpec {
  const roster: Sheet = {
    name: "Appraisal roster",
    columns: [
      { header: "Staff", width: 26 },
      { header: "Role", width: 18 },
      { header: "Department", width: 16 },
      { header: "Overall", format: "num1", width: 10 },
      { header: "Band", width: 20 },
      { header: "Status", width: 18 },
    ],
    rows: [
      ...board.map<Row>((a) => ({
        cells: [
          a.staff.name,
          ROLE_LABEL[a.staff.role as Role] ?? a.staff.role,
          a.staff.department ?? "—",
          { v: a.overall ?? null, tone: a.overall != null && a.overall >= 3.5 ? "pos" : a.overall != null && a.overall < 2.5 ? "neg" : null },
          a.band?.label ?? "—",
          a.signed ? "Signed off" : a.status.replace(/_/g, " "),
        ],
      })),
    ],
    note: "360° staff appraisals — weighted overall out of 5.",
  };

  const competency: Sheet = {
    name: "By competency",
    columns: [{ header: "Staff", width: 24 }, ...COMPETENCIES.map((c) => ({ header: c.label.length > 16 ? c.label.slice(0, 14) + "…" : c.label, format: "num1" as const, width: 12 })), { header: "Overall", format: "num1", width: 10 }],
    rows: board.map<Row>((a) => ({
      cells: [a.staff.name, ...COMPETENCIES.map((c) => a.perComp.find((p) => p.id === c.id)?.weighted ?? null), { v: a.overall ?? null, tone: "pos" }],
    })),
  };

  return { fileName: `staff-appraisals-${brand.term ?? ""}`.replace(/\s+/g, "").toLowerCase() || "staff-appraisals", title: "Staff Appraisals", brand, sheets: [roster, competency] };
}

// ── Payroll ─────────────────────────────────────────────────────────────────
export function payrollReport(data: { school: string; session: string; termLabel: string; rows: { name: string; role: string; title: string | null; gross: number }[] }): ReportSpec {
  const total = data.rows.reduce((t, r) => t + r.gross, 0);
  return {
    fileName: "payroll",
    title: "Payroll — monthly",
    brand: { school: data.school, term: data.termLabel, session: data.session },
    sheets: [
      {
        name: "Payroll",
        columns: [{ header: "Staff", width: 26 }, { header: "Role", width: 18 }, { header: "Job title", width: 22 }, { header: "Gross / month", format: "ngn", width: 16 }],
        rows: [
          ...data.rows.map<Row>((r) => ({ cells: [r.name, ROLE_LABEL[r.role as Role] ?? r.role, r.title ?? "—", { v: r.gross, tone: "pos" }] })),
          { role: "total", cells: [`Total · ${data.rows.length} staff`, "", "", { v: total, tone: "pos" }] },
        ],
        note: "Gross monthly salaries on record — Owner & Bursar only.",
      },
    ],
  };
}

// ── Attendance report ───────────────────────────────────────────────────────
export function attendanceReport(data: { school: string; rows: { class: string; present: number; late: number; absent: number; excused: number; total: number; rate: number }[] }): ReportSpec {
  const sum = (k: "present" | "late" | "absent" | "excused" | "total") => data.rows.reduce((t, r) => t + r[k], 0);
  return {
    fileName: "attendance-report",
    title: "Attendance Report",
    brand: { school: data.school },
    sheets: [
      {
        name: "By class",
        columns: [
          { header: "Class", width: 18 },
          { header: "Present", format: "int", width: 10 },
          { header: "Late", format: "int", width: 8 },
          { header: "Absent", format: "int", width: 10 },
          { header: "Excused", format: "int", width: 10 },
          { header: "Records", format: "int", width: 10 },
          { header: "Rate", format: "pct", width: 10 },
        ],
        rows: [
          ...data.rows.map<Row>((r) => ({ cells: [r.class, { v: r.present, tone: "pos" }, r.late, { v: r.absent, tone: r.absent > 0 ? "neg" : null }, r.excused, r.total, { v: r.rate, tone: r.rate >= 75 ? "pos" : r.rate < 50 ? "neg" : null }] })),
          { role: "total", cells: ["All classes", { v: sum("present"), tone: "pos" }, sum("late"), { v: sum("absent"), tone: "neg" }, sum("excused"), sum("total"), { v: sum("total") ? Math.round(((sum("present") + sum("late")) / sum("total")) * 100) : 0 }] },
        ],
        note: "Attendance recorded across the period.",
      },
    ],
  };
}
