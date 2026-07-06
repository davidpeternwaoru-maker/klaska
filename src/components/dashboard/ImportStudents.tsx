"use client";

// Bulk student import. Everything before "Import" happens in the browser:
// we read the uploaded .xlsx/CSV, map its columns to our fields, validate each
// row, and show a preview. Only on confirm do we send the clean rows to the
// importStudents server action. ExcelJS (already a dependency) reads the file.

import { useState } from "react";
import Link from "next/link";
import { Card, Pill } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { importStudents, type ImportRow, type ImportResult } from "@/lib/actions/students";

// Map many possible spreadsheet headers onto our fields.
const COLUMNS: { key: keyof ImportRow; header: string; aliases: string[] }[] = [
  { key: "firstName", header: "First name", aliases: ["first name", "firstname", "first", "given name"] },
  { key: "lastName", header: "Last name", aliases: ["last name", "lastname", "surname", "last"] },
  { key: "gender", header: "Gender", aliases: ["gender", "sex"] },
  { key: "dob", header: "Date of birth", aliases: ["date of birth", "dob", "birth date", "birthday"] },
  { key: "className", header: "Class", aliases: ["class", "class/arm", "level", "grade"] },
  { key: "admissionNo", header: "Admission no", aliases: ["admission no", "admission number", "adm no", "admno", "admission"] },
  { key: "guardianName", header: "Guardian name", aliases: ["guardian name", "parent name", "guardian", "parent"] },
  { key: "guardianPhone", header: "Guardian phone", aliases: ["guardian phone", "parent phone", "phone", "contact"] },
];

type ParsedRow = ImportRow & { _row: number; _valid: boolean; _class: "existing" | "new" | "unassigned" };

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function cellText(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as { text?: string; result?: unknown; richText?: { text: string }[] };
    if (o.richText) return o.richText.map((r) => r.text).join("");
    if (o.text) return o.text;
    if (o.result != null) return String(o.result);
    return "";
  }
  return String(v);
}

function normGender(s: string): string | null {
  const t = s.trim().toLowerCase();
  if (!t) return null;
  if (t.startsWith("m")) return "M";
  if (t.startsWith("f")) return "F";
  return null;
}

function normDob(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

// minimal CSV line splitter that respects quoted fields
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else q = false;
      } else cur += ch;
    } else if (ch === ",") { out.push(cur); cur = ""; }
    else if (ch === '"') q = true;
    else cur += ch;
  }
  out.push(cur);
  return out;
}

export function ImportStudents({ existingClasses }: { existingClasses: string[] }) {
  const existingSet = new Set(existingClasses.map(normalize));
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [createMissing, setCreateMissing] = useState(true);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  function classify(className: string | null | undefined): ParsedRow["_class"] {
    if (!className || !className.trim()) return "unassigned";
    if (existingSet.has(normalize(className))) return "existing";
    return createMissing ? "new" : "unassigned";
  }

  // turn a 2D grid (header row + data rows) into ParsedRows
  function rowsFromGrid(grid: string[][]) {
    if (!grid.length) { setParseError("That file looks empty."); return; }
    const headers = grid[0].map((h) => normalize(h));
    const indexFor = (key: keyof ImportRow) => {
      const col = COLUMNS.find((c) => c.key === key)!;
      return headers.findIndex((h) => col.aliases.includes(h) || h === normalize(col.header));
    };
    const idx = Object.fromEntries(COLUMNS.map((c) => [c.key, indexFor(c.key)])) as Record<keyof ImportRow, number>;
    if (idx.firstName < 0 || idx.lastName < 0) {
      setParseError("Couldn't find 'First name' and 'Last name' columns. Use the template headers.");
      return;
    }
    const parsed: ParsedRow[] = [];
    for (let r = 1; r < grid.length; r++) {
      const cells = grid[r];
      if (!cells || cells.every((c) => !c || !c.trim())) continue; // skip blank lines
      const get = (k: keyof ImportRow) => (idx[k] >= 0 ? (cells[idx[k]] ?? "").trim() : "");
      const className = get("className") || null;
      const row: ParsedRow = {
        _row: r + 1,
        firstName: get("firstName"),
        lastName: get("lastName"),
        gender: normGender(get("gender")),
        dob: normDob(get("dob")),
        admissionNo: get("admissionNo") || null,
        className,
        guardianName: get("guardianName") || null,
        guardianPhone: get("guardianPhone") || null,
        _valid: !!(get("firstName") && get("lastName")),
        _class: classify(className),
      };
      parsed.push(row);
    }
    setRows(parsed);
  }

  async function onFile(file: File) {
    setParseError("");
    setResult(null);
    setRows(null);
    setFileName(file.name);
    setParsing(true);
    try {
      if (file.name.toLowerCase().endsWith(".csv")) {
        const text = await file.text();
        const grid = text.split(/\r?\n/).filter((l) => l.length).map(splitCsvLine);
        rowsFromGrid(grid);
      } else {
        const ExcelJS = (await import("exceljs")).default;
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(await file.arrayBuffer());
        const ws = wb.worksheets[0];
        const grid: string[][] = [];
        ws.eachRow((row) => {
          const cells: string[] = [];
          // row.values is 1-indexed; normalise to a dense array
          const vals = row.values as unknown[];
          for (let c = 1; c < vals.length; c++) cells.push(cellText(vals[c]));
          grid.push(cells);
        });
        rowsFromGrid(grid);
      }
    } catch {
      setParseError("Couldn't read that file. Please use .xlsx or .csv (try the template).");
    } finally {
      setParsing(false);
    }
  }

  async function downloadTemplate() {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Students");
    ws.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: 18 }));
    ws.getRow(1).font = { bold: true };
    ws.addRow({ firstName: "Chidi", lastName: "Okeke", gender: "M", dob: "2014-05-12", className: "JSS 1 A", admissionNo: "", guardianName: "Mr. Okeke", guardianPhone: "08030000000" });
    const buf = await wb.xlsx.writeBuffer();
    downloadBlob("klaska-students-template.xlsx", new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  }

  // edit a broken row in place; it re-validates as they type (the fix queue)
  function fixRow(rowNo: number, patch: { firstName?: string; lastName?: string }) {
    setRows((rs) =>
      rs?.map((r) => {
        if (r._row !== rowNo) return r;
        const next = { ...r, ...patch };
        next._valid = !!(next.firstName.trim() && next.lastName.trim());
        return next;
      }) ?? null,
    );
  }

  async function doImport() {
    if (!rows) return;
    setImporting(true);
    try {
      const clean: ImportRow[] = rows.filter((r) => r._valid).map(({ _row, _valid, _class, ...rest }) => { void _row; void _valid; void _class; return rest; });
      const res = await importStudents(clean, createMissing);
      setResult(res);
      if (!res.error) {
        const broken = rows.filter((r) => !r._valid);
        setRows(broken.length ? broken : null); // valid rows saved; broken stay to fix
      }
    } finally {
      setImporting(false);
    }
  }

  const validCount = rows?.filter((r) => r._valid).length ?? 0;
  const invalidCount = (rows?.length ?? 0) - validCount;
  const newClasses = Array.from(new Set(rows?.filter((r) => r._class === "new").map((r) => r.className) ?? []));

  return (
    <div className="flex flex-col gap-5">
      {/* result banner */}
      {result && !result.error && (
        <Card className="border-forest-line bg-forest-soft/50">
          <div className="flex items-center gap-2 text-forest">
            <Icon name="check" size={18} />
            <span className="text-[14px] font-semibold">Imported {result.created} students.</span>
          </div>
          <div className="mt-1 text-[12.5px] text-ink-3">
            {result.classesCreated.length > 0 && <>Created {result.classesCreated.length} new class(es): {result.classesCreated.join(", ")}. </>}
            {result.skipped > 0 && <>{result.skipped} row(s) still need fixing below — edit the names and click Import again. </>}
          </div>
          <Link href="/people/students" className="mt-3 inline-block text-[13px] font-medium text-forest hover:underline">
            View students →
          </Link>
        </Card>
      )}

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[14px] font-semibold text-ink">Import students from a spreadsheet</div>
            <div className="mt-1 text-[12.5px] text-ink-4">Upload an .xlsx or .csv. Don&apos;t have one ready? Download the template, fill it in, and upload it back.</div>
          </div>
          <button onClick={downloadTemplate} className="flex flex-none items-center gap-1.5 rounded-[9px] border border-border px-3 py-2 text-[12.5px] font-medium text-ink-2 hover:bg-secondary">
            <Icon name="download" size={15} /> Template
          </button>
        </div>

        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[12px] border-2 border-dashed border-border bg-secondary/40 px-4 py-8 text-center transition hover:border-forest-line hover:bg-secondary">
          <Icon name="download" size={22} style={{ color: "var(--color-ink-4)", transform: "rotate(180deg)" }} />
          <span className="text-[13px] font-medium text-ink-2">{fileName || "Click to choose a file"}</span>
          <span className="text-[11.5px] text-ink-4">.xlsx or .csv</span>
          <input
            type="file"
            accept=".xlsx,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </label>

        {parsing && <p className="mt-3 text-[12.5px] text-ink-4">Reading file…</p>}
        {parseError && <p className="mt-3 rounded-[8px] bg-red-soft px-3 py-2 text-[12.5px] font-medium text-red">{parseError}</p>}
        {result?.error && <p className="mt-3 rounded-[8px] bg-red-soft px-3 py-2 text-[12.5px] font-medium text-red">{result.error}</p>}
      </Card>

      {/* preview */}
      {rows && (
        <Card pad={0} className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-ink">Preview</span>
              <Pill tone="green">{validCount} ready</Pill>
              {invalidCount > 0 && <Pill tone="red">{invalidCount} skipped</Pill>}
              {newClasses.length > 0 && <Pill tone="amber">{newClasses.length} new class(es)</Pill>}
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
                <input type="checkbox" checked={createMissing} onChange={(e) => { setCreateMissing(e.target.checked); setRows((rs) => rs?.map((r) => ({ ...r, _class: r.className && r.className.trim() ? (existingSet.has(normalize(r.className)) ? "existing" : e.target.checked ? "new" : "unassigned") : "unassigned" })) ?? null); }} />
                Create classes that don&apos;t exist
              </label>
              <button onClick={doImport} disabled={importing || validCount === 0} className="h-9 rounded-[9px] bg-forest px-4 text-[13px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-50">
                {importing ? "Importing…" : `Import ${validCount} students`}
              </button>
            </div>
          </div>
          <div className="max-h-[55vh] overflow-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead className="sticky top-0 bg-card">
                <tr className="border-y border-border text-[11px] uppercase tracking-[0.05em] text-ink-4">
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-left font-medium">Name</th>
                  <th className="px-3 py-2 text-left font-medium">Gender</th>
                  <th className="px-3 py-2 text-left font-medium">DOB</th>
                  <th className="px-3 py-2 text-left font-medium">Class</th>
                  <th className="px-3 py-2 text-left font-medium">Guardian</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 200).map((r) => (
                  <tr key={r._row} className={`border-b border-border last:border-0 ${r._valid ? "" : "bg-red-soft/40"}`}>
                    <td className="px-3 py-2 text-ink-4">{r._row}</td>
                    <td className="px-3 py-2 font-medium text-ink">
                      {r._valid ? (
                        <>{r.firstName} {r.lastName}</>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <input value={r.firstName} onChange={(e) => fixRow(r._row, { firstName: e.target.value })} placeholder="First name" className="h-7 w-24 rounded-[6px] border border-red/40 bg-card px-1.5 text-[12px] outline-none focus:border-forest-line" />
                          <input value={r.lastName} onChange={(e) => fixRow(r._row, { lastName: e.target.value })} placeholder="Last name" className="h-7 w-24 rounded-[6px] border border-red/40 bg-card px-1.5 text-[12px] outline-none focus:border-forest-line" />
                          <span className="text-[10.5px] font-medium text-red">fix name</span>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-ink-3">{r.gender ?? "—"}</td>
                    <td className="px-3 py-2 text-ink-3">{r.dob ?? "—"}</td>
                    <td className="px-3 py-2">
                      {r.className ? (
                        <span className="flex items-center gap-1.5">
                          {r.className}
                          {r._class === "new" && <Pill tone="amber">new</Pill>}
                          {r._class === "unassigned" && <Pill tone="neutral">no match</Pill>}
                        </span>
                      ) : (
                        <span className="text-ink-4">Unassigned</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-ink-3">{r.guardianName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 200 && <div className="p-3 text-center text-[12px] text-ink-4">Showing first 200 of {rows.length} rows. All valid rows will be imported.</div>}
          </div>
        </Card>
      )}
    </div>
  );
}
