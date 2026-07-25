// Report builders — turn a screen's view-data into a ReportSpec for the shared
// export engine. Keeping these separate means every feature describes its report
// once and gets a consistently branded, formatted .xlsx AND .pdf for free.

import type { ReportSpec, Sheet, Row } from "./engine";
import type { FeeRow, ClassStat, FeeKpis } from "@/components/finance/FeesCollection";

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
