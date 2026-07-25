"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { attendanceReportAction } from "@/lib/actions/report-data";
import { exportExcel, exportPdf } from "@/lib/export/engine";
import { attendanceReport } from "@/lib/export/reports";

export function AttendanceExportButton() {
  const [busy, setBusy] = useState<null | "xlsx" | "pdf">(null);
  async function run(fmt: "xlsx" | "pdf") {
    setBusy(fmt);
    try {
      const r = await attendanceReportAction();
      if (r.ok) {
        const spec = attendanceReport(r.data);
        if (fmt === "xlsx") await exportExcel(spec);
        else await exportPdf(spec);
      }
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="flex gap-2">
      <button onClick={() => run("pdf")} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-[var(--radius-card)] border border-border px-3.5 py-2 text-[13px] font-medium text-ink-2 transition hover:bg-secondary disabled:opacity-50">
        <Icon name="reports" size={15} /> {busy === "pdf" ? "…" : "PDF"}
      </button>
      <button onClick={() => run("xlsx")} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-[var(--radius-card)] border border-border px-3.5 py-2 text-[13px] font-medium text-ink-2 transition hover:bg-secondary disabled:opacity-50">
        <Icon name="download" size={15} /> {busy === "xlsx" ? "…" : "Export report"}
      </button>
    </div>
  );
}
