// Analysis exports for any drill-down scope: a multi-sheet .xlsx (ExcelJS —
// summary + one broadsheet sheet per class + departments, frozen headers, school
// header) and a clean branded PDF (jsPDF + autotable). Libraries are dynamically
// imported so they stay out of the initial bundle.

import type { AnalysisRow } from "@/lib/analysis-drill";
import { computeBundle, scopeFilter, type Scope } from "@/lib/analysis-compute";

const GREEN = "FF1B5E20";
const SOFT = "FFEAF2EA";

export type AnalysisMeta = { school: string; logoUrl: string | null; session: string; termLabel: string; prevLabel: string; sectionLabels: Record<string, string> };

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportAnalysisWorkbook(rows: AnalysisRow[], prevAvg: Record<string, number>, scope: Scope, meta: AnalysisMeta) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Klaska";
  const bundle = computeBundle(rows, prevAvg, scope, meta.sectionLabels);

  const header = (ws: import("exceljs").Worksheet, title: string, cols: number) => {
    ws.mergeCells(1, 1, 1, cols);
    ws.getCell("A1").value = meta.school;
    ws.getCell("A1").font = { bold: true, size: 15, color: { argb: GREEN } };
    ws.mergeCells(2, 1, 2, cols);
    ws.getCell("A2").value = `${title}  ·  ${meta.termLabel} ${meta.session}`;
    ws.getCell("A2").font = { size: 10, color: { argb: "FF6B6B66" } };
    ws.addRow([]);
  };
  const headRow = (ws: import("exceljs").Worksheet, r: number) => {
    const row = ws.getRow(r);
    row.eachCell((c) => {
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    });
    ws.views = [{ state: "frozen", ySplit: r }];
  };

  // ---- Summary sheet ----
  const s = wb.addWorksheet("Summary");
  s.columns = [{ width: 34 }, { width: 16 }, { width: 16 }, { width: 16 }];
  header(s, `Analysis — ${bundle.scopeTitle}`, 4);
  s.addRow(["Students scored", bundle.count]);
  s.addRow(["Average", bundle.average]);
  s.addRow(["Pass rate (≥50)", `${bundle.passRate}%`]);
  s.addRow([]);
  let r = s.rowCount + 1;
  s.addRow(["Overall best students", "Average", "Class"]);
  headRow(s, r);
  bundle.bestStudents.forEach((b) => s.addRow([b.name, b.average, b.className]));
  s.addRow([]);
  r = s.rowCount + 1;
  s.addRow(["Best in each subject", "Student", "Score", "Subject avg"]);
  headRow(s, r);
  bundle.bestPerSubject.forEach((b) => s.addRow([b.subject, b.best?.name ?? "—", b.best?.total ?? "—", b.average]));
  s.addRow([]);
  r = s.rowCount + 1;
  s.addRow([`Most improved (vs ${meta.prevLabel})`, "From", "To", "Δ"]);
  headRow(s, r);
  bundle.mostImproved.forEach((m) => s.addRow([m.name, m.from, m.to, `+${m.delta}`]));
  if (bundle.bestPerDept.length) {
    s.addRow([]);
    r = s.rowCount + 1;
    s.addRow(["Best in each department", "Student", "Average"]);
    headRow(s, r);
    bundle.bestPerDept.forEach((d) => s.addRow([d.department, d.best?.name ?? "—", d.best?.average ?? "—"]));
  }

  // ---- one broadsheet sheet per class within scope ----
  const scoped = scopeFilter(rows, scope);
  const classes = [...new Set(scoped.map((r) => r.className))].sort();
  for (const cls of classes.slice(0, 40)) {
    const crows = scoped.filter((r) => r.className === cls);
    const subjects = [...new Set(crows.map((r) => r.subject))].sort();
    const byStudent = new Map<string, Record<string, number>>();
    for (const r of crows) {
      const e = byStudent.get(r.student) ?? {};
      e[r.subject] = r.total;
      byStudent.set(r.student, e);
    }
    const ws = wb.addWorksheet(cls.slice(0, 28).replace(/[\\/*?:[\]]/g, " "));
    ws.columns = [{ width: 26 }, ...subjects.map(() => ({ width: 12 })), { width: 12 }, { width: 8 }];
    header(ws, `${cls} broadsheet`, subjects.length + 3);
    const hr = ws.rowCount + 1;
    ws.addRow(["Student", ...subjects, "Average", "Pos"]);
    headRow(ws, hr);
    const ranked = [...byStudent.entries()]
      .map(([name, sub]) => ({ name, sub, avg: Math.round((Object.values(sub).reduce((a, b) => a + b, 0) / Object.values(sub).length) * 10) / 10 }))
      .sort((a, b) => b.avg - a.avg);
    ranked.forEach((st, i) => ws.addRow([st.name, ...subjects.map((sj) => st.sub[sj] ?? ""), st.avg, i + 1]));
  }

  const buf = await wb.xlsx.writeBuffer();
  download(`analysis-${bundle.scopeTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.xlsx`, new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
}

export async function exportAnalysisPDF(rows: AnalysisRow[], prevAvg: Record<string, number>, scope: Scope, meta: AnalysisMeta) {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const bundle = computeBundle(rows, prevAvg, scope, meta.sectionLabels);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  doc.setFillColor(27, 94, 32);
  doc.rect(0, 0, W, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(meta.school, 14, 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Result Analysis — ${bundle.scopeTitle}   ·   ${meta.termLabel} ${meta.session}`, 14, 16);
  doc.setTextColor(26, 26, 24);
  doc.setFontSize(10);
  doc.text(`Students: ${bundle.count}      Average: ${bundle.average}      Pass rate: ${bundle.passRate}%`, 14, 30);

  let y = 34;
  const table = (title: string, head: string[], body: (string | number)[][]) => {
    if (!body.length) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(27, 94, 32);
    doc.text(title, 14, y + 4);
    autoTable(doc, {
      startY: y + 6,
      margin: { left: 14, right: 14 },
      head: [head],
      body,
      styles: { fontSize: 8.5, cellPadding: 1.3 },
      headStyles: { fillColor: [27, 94, 32], textColor: [255, 255, 255] },
      theme: "grid",
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  };

  table("Overall best students", ["Student", "Average", "Class"], bundle.bestStudents.map((b) => [b.name, b.average, b.className]));
  table("Best in each subject", ["Subject", "Top student", "Score", "Subject avg"], bundle.bestPerSubject.map((b) => [b.subject, b.best?.name ?? "—", b.best?.total ?? "—", b.average]));
  if (bundle.bestPerDept.length) table("Best in each department", ["Department", "Student", "Average"], bundle.bestPerDept.map((d) => [d.department, d.best?.name ?? "—", d.best?.average ?? "—"]));
  table(`Most improved (vs ${meta.prevLabel})`, ["Student", "From", "To", "Change"], bundle.mostImproved.map((m) => [m.name, m.from, m.to, `+${m.delta}`]));
  table("Weakest subjects", ["Subject", "Average"], bundle.weakest.map((w) => [w.subject, w.average]));

  doc.save(`analysis-${bundle.scopeTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`);
}
