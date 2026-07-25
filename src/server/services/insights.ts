import "server-only";
import { prisma } from "@/lib/db";

// Canonical level order (Crèche → SSS 3) for sorting attrition-by-class.
const LEVEL_ORDER = [
  "Crèche", "KG 1", "KG 2", "Nursery 1", "Nursery 2",
  "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
  "JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3",
];
const orderIdx = (lvl: string) => {
  const i = LEVEL_ORDER.indexOf(lvl);
  return i < 0 ? 999 : i;
};

const REASON_COLORS: Record<string, string> = {
  Financial: "#dc2626",
  Relocation: "#2563eb",
  Transfer: "#f59e0b",
  "Transfer to another school": "#f59e0b",
  "Family reasons": "#9a9a94",
  Other: "#9a9a94",
};

export type RetentionData = {
  active: number;
  graduated: number;
  left: number;
  allTime: number;
  gradRate: number;
  retention: number;
  attRows: [string, number][];
  peak: [string, number] | null;
  reasonData: { label: string; value: number; color: string }[];
  cohorts: { y: string; entered: number; grad: number; left: number; rate: number; res: number }[];
};

/** Retention & graduation analytics, computed live from real student status. */
export async function getRetentionData(schoolId: string): Promise<RetentionData> {
  const students = await prisma.student.findMany({
    where: { schoolId },
    select: { status: true, statusReason: true, admissionNo: true, class: { select: { name: true } } },
  });

  const active = students.filter((s) => s.status === "ACTIVE").length;
  const graduated = students.filter((s) => s.status === "GRADUATED").length;
  const left = students.filter((s) => s.status === "LEFT").length;
  const allTime = students.length;
  const gradRate = graduated + left ? Math.round((graduated / (graduated + left)) * 100) : 0;
  const retention = active + left ? Math.round((active / (active + left)) * 100) : 0;

  const attrition: Record<string, number> = {};
  students.filter((s) => s.status === "LEFT").forEach((s) => {
    const lvl = s.class?.name ?? "Unassigned";
    attrition[lvl] = (attrition[lvl] || 0) + 1;
  });
  const attRows = Object.entries(attrition).sort((a, b) => orderIdx(a[0]) - orderIdx(b[0])) as [string, number][];
  const peak = (Object.entries(attrition).sort((a, b) => b[1] - a[1])[0] ?? null) as [string, number] | null;

  const reasons: Record<string, number> = {};
  students.filter((s) => s.status === "LEFT").forEach((s) => {
    const r = s.statusReason || "Other";
    reasons[r] = (reasons[r] || 0) + 1;
  });
  const reasonData = Object.entries(reasons).map(([label, value]) => ({ label, value, color: REASON_COLORS[label] || "#9a9a94" }));

  const byYear: Record<string, { entered: number; grad: number; left: number }> = {};
  students.forEach((s) => {
    const y = s.admissionNo?.match(/(20\d{2})/)?.[1] ?? "—";
    byYear[y] = byYear[y] || { entered: 0, grad: 0, left: 0 };
    byYear[y].entered++;
    if (s.status === "GRADUATED") byYear[y].grad++;
    if (s.status === "LEFT") byYear[y].left++;
  });
  const cohorts = Object.keys(byYear)
    .filter((y) => y !== "—")
    .sort()
    .map((y) => {
      const c = byYear[y];
      const res = c.grad + c.left;
      return { y, ...c, rate: res ? Math.round((c.grad / res) * 100) : 0, res };
    });

  return { active, graduated, left, allTime, gradRate, retention, attRows, peak, reasonData, cohorts };
}
