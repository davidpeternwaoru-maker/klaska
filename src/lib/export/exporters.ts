/* Professional exports — clean multi-sheet .xlsx (ExcelJS) and printable PDF
   (jsPDF + autotable), each with a school header (logo, name, term, session).
   Libraries are dynamically imported so they stay out of the initial bundle. */

import type { Appraisal, RaterId } from "@/lib/appraisals/config";
import { COMPETENCIES, STATUS_META } from "@/lib/appraisals/config";

export type SchoolMeta = { name: string; term: string; session: string };

const GREEN = "FF1B5E20";
const SOFT = "FFEAF2EA";

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ============================ EXCEL ============================ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function titleBlock(ws: any, school: SchoolMeta, docTitle: string, cols: number) {
  const last = String.fromCharCode(64 + Math.max(2, cols));
  ws.mergeCells(`A1:${last}1`);
  ws.getCell("A1").value = school.name;
  ws.getCell("A1").font = { bold: true, size: 16, color: { argb: GREEN } };
  ws.mergeCells(`A2:${last}2`);
  ws.getCell("A2").value = docTitle;
  ws.getCell("A2").font = { bold: true, size: 12 };
  ws.mergeCells(`A3:${last}3`);
  ws.getCell("A3").value = `${school.term} · ${school.session}`;
  ws.getCell("A3").font = { size: 10, color: { argb: "FF6B6B66" } };
  return 5; // first row for the table header
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function styleHeader(row: any) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
  row.alignment = { vertical: "middle" };
  row.height = 20;
}

export async function exportFinancialExcel(fin: FinancialData, school: SchoolMeta) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Klaska";

  const pl = wb.addWorksheet("P&L Summary");
  pl.columns = [{ width: 30 }, { width: 20 }];
  let r = titleBlock(pl, school, "Financial Statement — P&L Summary", 2);
  pl.getRow(r).values = ["Item", "Amount (₦)"];
  styleHeader(pl.getRow(r));
  pl.addRow(["Revenue (fees collected)", fin.revenue]);
  pl.addRow(["Expected fees", fin.expected]);
  pl.addRow(["Outstanding", fin.expected - fin.revenue]);
  pl.addRow(["Total costs", fin.costs]);
  pl.addRow(["Net profit", fin.profit]);
  pl.addRow(["Profit margin", `${fin.margin}%`]);
  pl.views = [{ state: "frozen", ySplit: r }];

  const cc = wb.addWorksheet("Costs by category");
  cc.columns = [{ width: 26 }, { width: 18 }, { width: 12 }];
  r = titleBlock(cc, school, "Costs by category", 3);
  cc.getRow(r).values = ["Category", "Amount (₦)", "% of costs"];
  styleHeader(cc.getRow(r));
  fin.byCategory.forEach((c) => cc.addRow([c.label, c.value, `${Math.round((c.value / fin.costs) * 100)}%`]));
  cc.views = [{ state: "frozen", ySplit: r }];

  const fc = wb.addWorksheet("Fee collection");
  fc.columns = [{ width: 16 }, { width: 16 }, { width: 16 }, { width: 12 }];
  r = titleBlock(fc, school, "Fee collection by class", 4);
  fc.getRow(r).values = ["Class", "Collected (₦)", "Expected (₦)", "Rate"];
  styleHeader(fc.getRow(r));
  fin.byClass.forEach((c) => fc.addRow([c.klass, c.paid, c.due, `${c.rate}%`]));
  fc.views = [{ state: "frozen", ySplit: r }];

  const buf = await wb.xlsx.writeBuffer();
  downloadBlob("klaska-financial-statement.xlsx", new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
}

/* ============================ PDF ============================ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pdfHeader(doc: any, school: SchoolMeta, title: string) {
  // brand badge
  doc.setFillColor(27, 94, 32);
  doc.roundedRect(14, 12, 12, 12, 2.5, 2.5, "F");
  doc.setFillColor(245, 158, 11);
  doc.circle(18.4, 18, 2.6, "F");
  // school + title
  doc.setTextColor(27, 94, 32);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(school.name, 30, 18);
  doc.setTextColor(40, 40, 37);
  doc.setFontSize(11);
  doc.text(title, 30, 24);
  doc.setTextColor(110, 110, 102);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`${school.term} · ${school.session}`, 196, 18, { align: "right" });
  doc.setDrawColor(225, 225, 222);
  doc.line(14, 28, 196, 28);
}


export async function exportFinancialPDF(fin: FinancialData, school: SchoolMeta) {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  pdfHeader(doc, school, "Financial Statement");
  const headStyle = { fillColor: [27, 94, 32] as [number, number, number], textColor: 255, fontStyle: "bold" as const };
  const naira = (n: number) => "NGN " + n.toLocaleString("en-NG");

  autoTable(doc, {
    startY: 34,
    head: [["Profit & Loss", "Amount"]],
    body: [
      ["Revenue (fees collected)", naira(fin.revenue)],
      ["Expected fees", naira(fin.expected)],
      ["Outstanding", naira(fin.expected - fin.revenue)],
      ["Total costs", naira(fin.costs)],
      ["Net profit", naira(fin.profit)],
      ["Profit margin", `${fin.margin}%`],
    ],
    theme: "grid",
    headStyles: headStyle,
    styles: { fontSize: 9.5, cellPadding: 2.5 },
    columnStyles: { 1: { halign: "right" } },
  });

  autoTable(doc, {
    head: [["Costs by category", "Amount", "% of costs"]],
    body: fin.byCategory.map((c) => [c.label, naira(c.value), `${Math.round((c.value / fin.costs) * 100)}%`]),
    theme: "striped",
    headStyles: headStyle,
    styles: { fontSize: 9.5, cellPadding: 2.5 },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
  });

  autoTable(doc, {
    head: [["Fee collection by class", "Collected", "Expected", "Rate"]],
    body: fin.byClass.map((c) => [c.klass, naira(c.paid), naira(c.due), `${c.rate}%`]),
    theme: "grid",
    headStyles: headStyle,
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
  });

  doc.save("klaska-financial-statement.pdf");
}

/* ===================== STAFF APPRAISALS ===================== */

function raterAvg(a: Appraisal, id: RaterId): string {
  const e = a.entries[id];
  if (!e) return "—";
  const vals = Object.values(e.ratings);
  return (vals.reduce((p, q) => p + q, 0) / vals.length).toFixed(1);
}

function appraisalStats(rows: Appraisal[]) {
  const signed = rows.filter((a) => a.status === "signed_off").length;
  const awaiting = rows.filter((a) => a.status === "awaiting_principal").length;
  const inProgress = rows.filter((a) => a.status === "self" || a.status === "in_review").length;
  const scored = rows.filter((a) => a.overall != null);
  const avg = scored.length ? scored.reduce((t, a) => t + (a.overall ?? 0), 0) / scored.length : 0;
  return { signed, awaiting, inProgress, avg };
}

export async function exportAppraisalsExcel(rows: Appraisal[], school: SchoolMeta, cycle: string) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Klaska";
  const { signed, awaiting, inProgress, avg } = appraisalStats(rows);

  // Summary
  const sum = wb.addWorksheet("Summary");
  sum.columns = [{ width: 30 }, { width: 24 }];
  let r = titleBlock(sum, school, `Staff Appraisal Summary — ${cycle}`, 2);
  sum.getRow(r).values = ["Metric", "Value"];
  styleHeader(sum.getRow(r));
  sum.addRow(["Total staff", rows.length]);
  sum.addRow(["Signed off by principal", signed]);
  sum.addRow(["Awaiting principal", awaiting]);
  sum.addRow(["In progress (self / peer)", inProgress]);
  sum.addRow(["Average rating (of 5.0)", avg.toFixed(2)]);
  sum.views = [{ state: "frozen", ySplit: r }];

  // Roster — per-rater averages + overall + sign-off
  const ros = wb.addWorksheet("Roster");
  ros.columns = [
    { width: 24 }, { width: 14 }, { width: 16 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 9 },
    { width: 10 }, { width: 18 }, { width: 18 }, { width: 26 },
  ];
  const top = titleBlock(ros, school, `Appraisal roster — ${cycle}`, 11);
  ros.getRow(top).values = ["Staff", "Role", "Department", "Self", "Peer", "Head", "Princ.", "Overall", "Band", "Status", "Signed (by · date)"];
  styleHeader(ros.getRow(top));
  rows.forEach((a) => {
    ros.addRow([
      a.staff.name,
      a.staff.role,
      a.staff.department ?? "—",
      raterAvg(a, "self"),
      raterAvg(a, "peer"),
      raterAvg(a, "head"),
      raterAvg(a, "principal"),
      a.overall != null ? a.overall.toFixed(2) : "—",
      a.band?.label ?? "—",
      STATUS_META[a.status].label,
      a.signed ? `${a.signed.by} · ${a.signed.date}` : "—",
    ]);
  });
  ros.views = [{ state: "frozen", ySplit: top, xSplit: 1 }];

  // By competency — weighted score per competency per staff
  const comp = wb.addWorksheet("By competency");
  comp.columns = [{ width: 24 }, ...COMPETENCIES.map(() => ({ width: 14 })), { width: 10 }];
  const ctop = titleBlock(comp, school, `Weighted scores by competency — ${cycle}`, COMPETENCIES.length + 2);
  comp.getRow(ctop).values = ["Staff", ...COMPETENCIES.map((c) => c.label), "Overall"];
  styleHeader(comp.getRow(ctop));
  rows.forEach((a) => {
    comp.addRow([
      a.staff.name,
      ...a.perComp.map((p) => (p.weighted != null ? p.weighted.toFixed(1) : "—")),
      a.overall != null ? a.overall.toFixed(2) : "—",
    ]);
  });
  comp.views = [{ state: "frozen", ySplit: ctop, xSplit: 1 }];

  const buf = await wb.xlsx.writeBuffer();
  downloadBlob("klaska-staff-appraisals.xlsx", new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
}

export async function exportAppraisalsPDF(rows: Appraisal[], school: SchoolMeta, cycle: string) {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  pdfHeader(doc, school, "Staff Performance Appraisal — Summary");
  const headStyle = { fillColor: [27, 94, 32] as [number, number, number], textColor: 255, fontStyle: "bold" as const };
  const { signed, awaiting, inProgress, avg } = appraisalStats(rows);

  autoTable(doc, {
    startY: 34,
    head: [["Appraisal cycle", cycle]],
    body: [
      ["Total staff", String(rows.length)],
      ["Signed off by principal", String(signed)],
      ["Awaiting principal", String(awaiting)],
      ["In progress (self / peer)", String(inProgress)],
      ["Average rating (of 5.0)", avg.toFixed(2)],
    ],
    theme: "grid",
    headStyles: headStyle,
    styles: { fontSize: 9.5, cellPadding: 2.5 },
    columnStyles: { 1: { halign: "right" } },
  });

  autoTable(doc, {
    head: [["Staff", "Role", "Self", "Peer", "Head", "Princ.", "Overall", "Status"]],
    body: rows.map((a) => [
      a.staff.name,
      a.staff.role,
      raterAvg(a, "self"),
      raterAvg(a, "peer"),
      raterAvg(a, "head"),
      raterAvg(a, "principal"),
      a.overall != null ? a.overall.toFixed(2) : "—",
      STATUS_META[a.status].label,
    ]),
    theme: "striped",
    headStyles: headStyle,
    styles: { fontSize: 8.5, cellPadding: 2 },
    columnStyles: { 2: { halign: "center" }, 3: { halign: "center" }, 4: { halign: "center" }, 5: { halign: "center" }, 6: { halign: "center" } },
  });

  doc.save("klaska-staff-appraisals.pdf");
}

export type FinancialData = {
  revenue: number;
  expected: number;
  costs: number;
  profit: number;
  margin: number;
  byCategory: { label: string; value: number }[];
  byClass: { klass: string; paid: number; due: number; rate: number }[];
};
