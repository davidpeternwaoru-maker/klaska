// Shared metadata shape passed from server pages into export builders. The
// actual workbook/PDF generation now lives in one place — engine.ts (styling)
// + reports.ts (per-report specs). This file only keeps the type both consume.
export type ExportMeta = { school: string; session: string; termLabel: string };
