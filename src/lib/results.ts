// Plain shared module (no "use server") for grading. CA1 + CA2 + Exam → total,
// total → WAEC-style grade. Used by the save action and the entry grid.

export const CA1_MAX = 20;
export const CA2_MAX = 20;
export const EXAM_MAX = 60;

export function gradeFor(total: number): string {
  if (total >= 75) return "A1";
  if (total >= 70) return "B2";
  if (total >= 65) return "B3";
  if (total >= 60) return "C4";
  if (total >= 55) return "C5";
  if (total >= 50) return "C6";
  if (total >= 45) return "D7";
  if (total >= 40) return "E8";
  return "F9";
}

export function gradeTone(grade: string | null): "green" | "amber" | "red" | "neutral" {
  if (!grade) return "neutral";
  if (["A1", "B2", "B3"].includes(grade)) return "green";
  if (["C4", "C5", "C6"].includes(grade)) return "amber";
  return "red";
}

export type SaveResultsResult = { ok?: boolean; error?: string; saved?: number };
