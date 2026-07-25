// ─────────────────────────────────────────────────────────────────────────────
// Klaska shared export engine — ONE place that turns a declarative report spec
// into a genuinely professional, branded workbook (.xlsx via ExcelJS) or a
// matching clean PDF (jsPDF + autotable). Every "Export" button in the app goes
// through here so exports look consistent and accountant-grade.
//
// You describe the report (sheets → columns → rows, with number formats and row
// roles); the engine handles the branded header, green frozen header row,
// currency/percent formatting, subtotal/total emphasis, restrained colour
// coding, borders, column sizing and multi-tab layout. Libraries are loaded
// dynamically so they stay out of the initial bundle.
// ─────────────────────────────────────────────────────────────────────────────

const GREEN = "FF1B5E20";
const GREEN_SOFT = "FFEAF2EA";
const INK = "FF1A1A18";
const MUTED = "FF6B6B66";
const LINE = "FFE3E3E0";
const ZEBRA = "FFF7F7F5";
const RED = "FFC0392B";
const RED_SOFT = "FFFDECEC";
const GREEN_TEXT = "FF1B7A32";

export type CellFormat = "text" | "ngn" | "int" | "num1" | "pct" | "date";
export type CellTone = "pos" | "neg" | "paid" | "unpaid" | "muted" | null;

export type Column = {
  header: string;
  width?: number; // characters; auto-sized from content if omitted
  align?: "left" | "center" | "right";
  format?: CellFormat;
};

export type Cell = { v: string | number | null; tone?: CellTone };
export type RowRole = "data" | "section" | "subtotal" | "total" | "spacer";
export type Row = { cells: (Cell | string | number | null)[]; role?: RowRole };

export type Sheet = {
  name: string; // tab name (auto-sanitised, ≤ 31 chars)
  title?: string; // sheet report title (defaults to workbook title)
  columns: Column[];
  rows: Row[];
  note?: string; // footnote under the table (e.g. a disclaimer)
};

export type ReportSpec = {
  fileName: string; // without extension
  title: string; // report title, e.g. "Profit & Loss Statement"
  brand: { school: string; logoUrl?: string | null; term?: string | null; session?: string | null };
  sheets: Sheet[];
};

// ── helpers ──────────────────────────────────────────────────────────────────
const numFmt: Record<CellFormat, string | undefined> = {
  text: undefined,
  ngn: '"₦"#,##0;[Red]-"₦"#,##0',
  int: "#,##0",
  num1: "#,##0.0",
  pct: '0"%"',
  date: "dd mmm yyyy",
};
const norm = (c: Cell | string | number | null): Cell => (c !== null && typeof c === "object" ? c : { v: c });
const sanitizeTab = (s: string) => (s || "Sheet").replace(/[\\/*?:[\]]/g, " ").slice(0, 31).trim() || "Sheet";
const today = () =>
  new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

function toneFill(tone: CellTone): string | null {
  if (tone === "unpaid" || tone === "neg") return RED_SOFT;
  if (tone === "paid") return GREEN_SOFT;
  return null;
}
function toneText(tone: CellTone): string | null {
  if (tone === "neg") return RED;
  if (tone === "pos") return GREEN_TEXT;
  if (tone === "unpaid") return RED;
  if (tone === "paid") return GREEN_TEXT;
  if (tone === "muted") return MUTED;
  return null;
}

// ── Excel (ExcelJS) ──────────────────────────────────────────────────────────
export async function buildWorkbook(spec: ReportSpec) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Klaska";
  wb.created = new Date();

  // school logo, added once, reused per sheet
  let logoId: number | null = null;
  if (spec.brand.logoUrl && spec.brand.logoUrl.startsWith("data:image")) {
    try {
      const [, ext = "png"] = spec.brand.logoUrl.match(/data:image\/(\w+)/) ?? [];
      const base64 = spec.brand.logoUrl.split(",")[1];
      logoId = wb.addImage({ base64, extension: (ext === "jpg" ? "jpeg" : ext) as "png" | "jpeg" });
    } catch {
      logoId = null;
    }
  }

  for (const sheet of spec.sheets) {
    const ws = wb.addWorksheet(sanitizeTab(sheet.name), { views: [{ showGridLines: false }] });
    const nCols = Math.max(1, sheet.columns.length);
    const lastCol = String.fromCharCode(64 + nCols); // A, B, C … (fine ≤ 26 cols)

    // ---- branded header (rows 1–3) ----
    ws.mergeCells(`A1:${lastCol}1`);
    ws.getCell("A1").value = spec.brand.school;
    ws.getCell("A1").font = { name: "Calibri", bold: true, size: 15, color: { argb: GREEN } };
    ws.mergeCells(`A2:${lastCol}2`);
    ws.getCell("A2").value = sheet.title ?? spec.title;
    ws.getCell("A2").font = { name: "Calibri", bold: true, size: 11, color: { argb: INK } };
    ws.mergeCells(`A3:${lastCol}3`);
    const cycle = [sheet.title ? spec.title : null, [spec.brand.term, spec.brand.session].filter(Boolean).join(" · ")]
      .filter(Boolean)
      .join("  ·  ");
    ws.getCell("A3").value = `${cycle ? cycle + "  ·  " : ""}Generated ${today()}`;
    ws.getCell("A3").font = { name: "Calibri", size: 9, color: { argb: MUTED } };
    for (const r of [1, 2, 3]) ws.getRow(r).height = r === 1 ? 20 : 15;
    if (logoId != null) ws.addImage(logoId, { tl: { col: nCols - 0.9, row: 0 }, ext: { width: 74, height: 74 }, editAs: "oneCell" });

    // ---- column header row (row 5, frozen) ----
    const HEAD = 5;
    const headRow = ws.getRow(HEAD);
    sheet.columns.forEach((c, i) => {
      const cell = headRow.getCell(i + 1);
      cell.value = c.header;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
      cell.font = { name: "Calibri", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      cell.alignment = { horizontal: c.align ?? (c.format && c.format !== "text" && c.format !== "date" ? "right" : "left"), vertical: "middle" };
      cell.border = { bottom: { style: "thin", color: { argb: GREEN } } };
    });
    headRow.height = 20;
    ws.views = [{ state: "frozen", ySplit: HEAD, showGridLines: false }];

    // ---- data rows ----
    let r = HEAD + 1;
    let zebra = false;
    for (const row of sheet.rows) {
      const role = row.role ?? "data";
      if (role === "spacer") {
        r++;
        continue;
      }
      const xl = ws.getRow(r);
      const isTotal = role === "total";
      const isSub = role === "subtotal";
      const isSection = role === "section";
      sheet.columns.forEach((col, i) => {
        const cellSpec = norm(row.cells[i] ?? null);
        const cell = xl.getCell(i + 1);
        cell.value = cellSpec.v as ExcelJSValue;
        if (col.format && col.format !== "text" && typeof cellSpec.v === "number") {
          const nf = numFmt[col.format];
          if (nf) cell.numFmt = nf;
        }
        cell.alignment = { horizontal: col.align ?? (col.format && col.format !== "text" && col.format !== "date" ? "right" : "left"), vertical: "middle" };
        // base font
        const bold = isTotal || isSub || isSection;
        const textColor = isSection ? GREEN : toneText(cellSpec.tone ?? null) ?? INK;
        cell.font = { name: "Calibri", size: 10, bold, color: { argb: textColor } };
        // fills
        const tf = toneFill(cellSpec.tone ?? null);
        if (isTotal) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN_SOFT } };
        else if (isSection) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN_SOFT } };
        else if (isSub) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
        else if (tf) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: tf } };
        else if (zebra) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
        // borders
        cell.border = {
          bottom: { style: "thin", color: { argb: isTotal ? GREEN : LINE } },
          ...(isTotal ? { top: { style: "thin", color: { argb: GREEN } } } : {}),
        };
      });
      xl.height = isSection || isTotal ? 18 : 16;
      if (role === "data") zebra = !zebra;
      r++;
    }

    // ---- note / disclaimer ----
    if (sheet.note) {
      r++;
      ws.mergeCells(`A${r}:${lastCol}${r}`);
      ws.getCell(`A${r}`).value = sheet.note;
      ws.getCell(`A${r}`).font = { name: "Calibri", italic: true, size: 9, color: { argb: MUTED } };
    }

    // ---- column widths (explicit, else auto from content) ----
    sheet.columns.forEach((c, i) => {
      let w = c.width;
      if (!w) {
        let max = c.header.length;
        for (const row of sheet.rows) {
          const cv = norm(row.cells[i] ?? null).v;
          const len = cv == null ? 0 : String(c.format === "ngn" ? "₦" + Number(cv).toLocaleString() : cv).length;
          if (len > max) max = len;
        }
        w = Math.min(46, Math.max(10, max + 3));
      }
      ws.getColumn(i + 1).width = w;
    });
  }

  return wb;
}

// ExcelJS accepts several value types; keep this loose but not `any`.
type ExcelJSValue = string | number | boolean | Date | null;

// ── PDF (jsPDF + autotable) ──────────────────────────────────────────────────
export async function buildPdf(spec: ReportSpec) {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const landscapeHint = spec.sheets.some((s) => s.columns.length > 6);
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: landscapeHint ? "landscape" : "portrait" });
  const W = doc.internal.pageSize.getWidth();

  const fmtCell = (v: string | number | null, f?: CellFormat) => {
    if (v == null || v === "") return "";
    if (typeof v === "number") {
      if (f === "ngn") return "₦" + v.toLocaleString("en-NG");
      if (f === "int") return v.toLocaleString("en-NG");
      if (f === "num1") return v.toLocaleString("en-NG", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      if (f === "pct") return v + "%";
    }
    return String(v);
  };

  spec.sheets.forEach((sheet, si) => {
    if (si > 0) doc.addPage();
    // header band
    doc.setFillColor(27, 94, 32);
    doc.rect(0, 0, W, 20, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(spec.brand.school, 14, 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const sub = [sheet.title ?? spec.title, [spec.brand.term, spec.brand.session].filter(Boolean).join(" · "), "Generated " + today()].filter(Boolean).join("   ·   ");
    doc.text(sub, 14, 15);

    autoTable(doc, {
      startY: 24,
      margin: { left: 14, right: 14 },
      head: [sheet.columns.map((c) => c.header)],
      body: sheet.rows
        .filter((row) => (row.role ?? "data") !== "spacer")
        .map((row) => ({
          _role: row.role ?? "data",
          cells: sheet.columns.map((c, i) => fmtCell(norm(row.cells[i] ?? null).v, c.format)),
        }))
        .map((r) => r.cells),
      styles: { fontSize: 8.5, cellPadding: 1.6, lineColor: [227, 227, 224], lineWidth: 0.1, textColor: [26, 26, 24] },
      headStyles: { fillColor: [27, 94, 32], textColor: [255, 255, 255], fontStyle: "bold", halign: "left" },
      alternateRowStyles: { fillColor: [247, 247, 245] },
      columnStyles: Object.fromEntries(
        sheet.columns.map((c, i) => [i, { halign: c.align ?? (c.format && c.format !== "text" && c.format !== "date" ? "right" : "left") }]),
      ),
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const role = (sheet.rows.filter((r) => (r.role ?? "data") !== "spacer")[data.row.index]?.role ?? "data") as RowRole;
        if (role === "total") {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [234, 242, 234];
          data.cell.styles.textColor = [27, 94, 32];
        } else if (role === "subtotal" || role === "section") {
          data.cell.styles.fontStyle = "bold";
          if (role === "section") data.cell.styles.textColor = [27, 94, 32];
        }
      },
    });

    if (sheet.note) {
      const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 104);
      doc.text(doc.splitTextToSize(sheet.note, W - 28), 14, y);
    }
  });

  // page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 145);
    doc.text(`${spec.brand.school} · ${spec.title} · Page ${i}/${pages}`, W / 2, doc.internal.pageSize.getHeight() - 7, { align: "center" });
  }
  return doc;
}

// ── downloads (browser) ──────────────────────────────────────────────────────
function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function exportExcel(spec: ReportSpec) {
  const wb = await buildWorkbook(spec);
  const buf = await wb.xlsx.writeBuffer();
  download(`${spec.fileName}.xlsx`, new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
}

export async function exportPdf(spec: ReportSpec) {
  const doc = await buildPdf(spec);
  doc.save(`${spec.fileName}.pdf`);
}
