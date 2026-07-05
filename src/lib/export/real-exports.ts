// Excel exports built from REAL data (Flow 4: "formatted statements with the
// school header, any time"). ExcelJS is dynamically imported client-side.

export type ExportMeta = { school: string; session: string; termLabel: string };

function download(filename: string, buf: ArrayBuffer) {
  const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function header(ws: any, meta: ExportMeta, title: string, cols: number) {
  const last = String.fromCharCode(64 + Math.max(2, Math.min(26, cols)));
  ws.mergeCells(`A1:${last}1`);
  ws.getCell("A1").value = meta.school;
  ws.getCell("A1").font = { bold: true, size: 16, color: { argb: "FF1B5E20" } };
  ws.mergeCells(`A2:${last}2`);
  ws.getCell("A2").value = title;
  ws.getCell("A2").font = { bold: true, size: 12 };
  ws.mergeCells(`A3:${last}3`);
  ws.getCell("A3").value = `${meta.termLabel} · ${meta.session}`;
  ws.getCell("A3").font = { size: 10, color: { argb: "FF6B6B66" } };
  return 5;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function headRow(row: any) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B5E20" } };
  row.height = 20;
}

/** Class broadsheet: student × subject totals + average, ranked. */
export async function exportBroadsheet(
  meta: ExportMeta,
  classLabel: string,
  subjects: string[],
  rows: { student: string; perSubject: Record<string, number | null>; average: number | null }[],
) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(classLabel.slice(0, 31));
  ws.columns = [{ width: 6 }, { width: 26 }, ...subjects.map(() => ({ width: 12 })), { width: 10 }];
  const top = header(ws, meta, `Class broadsheet — ${classLabel}`, subjects.length + 3);
  ws.getRow(top).values = ["Pos", "Student", ...subjects, "Average"];
  headRow(ws.getRow(top));
  rows.forEach((r, i) => ws.addRow([i + 1, r.student, ...subjects.map((s) => r.perSubject[s] ?? ""), r.average ?? ""]));
  ws.views = [{ state: "frozen", ySplit: top, xSplit: 2 }];
  download(`broadsheet-${classLabel.replace(/\s+/g, "-").toLowerCase()}.xlsx`, await wb.xlsx.writeBuffer());
}

/** Financial statement: revenue vs expenses + payment & expense registers. */
export async function exportFinancialStatement(
  meta: ExportMeta,
  summary: { invoiced: number; collected: number; outstanding: number; expensesTotal: number; net: number },
  payments: { when: string; student: string; amount: number; method: string; reference: string }[],
  expenses: { when: string; category: string; description: string; amount: number }[],
) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();

  const sum = wb.addWorksheet("Statement");
  sum.columns = [{ width: 30 }, { width: 20 }];
  let r = header(sum, meta, "Financial Statement", 2);
  sum.getRow(r).values = ["Item", "Amount (₦)"];
  headRow(sum.getRow(r));
  sum.addRow(["Fees invoiced", summary.invoiced]);
  sum.addRow(["Fees collected (revenue)", summary.collected]);
  sum.addRow(["Outstanding", summary.outstanding]);
  sum.addRow(["Total expenses", summary.expensesTotal]);
  sum.addRow(["Net (collected − expenses)", summary.net]);

  const pay = wb.addWorksheet("Payments");
  pay.columns = [{ width: 14 }, { width: 26 }, { width: 14 }, { width: 12 }, { width: 20 }];
  r = header(pay, meta, "Payments register", 5);
  pay.getRow(r).values = ["Date", "Student", "Amount (₦)", "Method", "Reference"];
  headRow(pay.getRow(r));
  payments.forEach((p) => pay.addRow([p.when, p.student, p.amount, p.method, p.reference]));
  pay.views = [{ state: "frozen", ySplit: r }];

  const exp = wb.addWorksheet("Expenses");
  exp.columns = [{ width: 14 }, { width: 16 }, { width: 34 }, { width: 14 }];
  r = header(exp, meta, "Expense register", 4);
  exp.getRow(r).values = ["Date", "Category", "Description", "Amount (₦)"];
  headRow(exp.getRow(r));
  expenses.forEach((e) => exp.addRow([e.when, e.category, e.description, e.amount]));
  exp.views = [{ state: "frozen", ySplit: r }];

  download("financial-statement.xlsx", await wb.xlsx.writeBuffer());
}
