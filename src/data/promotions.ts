/* Class-progression data — derives per-class promotion cards from the
   live (promotion-aware) active roster. */

import { activeStudents, effLevel, niceClass, getAcademics, seedFrom, LEVELS, type Student } from "./people";
import { teacherFor } from "./attendance";
import { nextLevel } from "@/lib/promotions/promotionsStore";

function avgOf(students: Student[]): number {
  const vals = students.map((s) => {
    const a = getAcademics(s);
    return a.kind === "academic" ? a.average : 64 + (seedFrom(s.id + ":ca") % 14);
  });
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
}
function atRiskOf(students: Student[]): number {
  return students.filter((s) => {
    const a = getAcademics(s);
    const avg = a.kind === "academic" ? a.average : 70;
    return avg < 50;
  }).length;
}

export type PromoClass = {
  klass: string;
  level: string;
  teacher: string;
  next: string;
  students: Student[];
  count: number;
  avg: number;
  atRisk: number;
  eligible: number;
};

export function promotionData() {
  const act = activeStudents();
  const map: Record<string, Student[]> = {};
  act.forEach((s) => (map[niceClass(s)] = map[niceClass(s)] || []).push(s));

  const classes: PromoClass[] = Object.entries(map)
    .map(([klass, students]) => {
      const level = effLevel(students[0]);
      const atRisk = atRiskOf(students);
      return {
        klass,
        level,
        teacher: teacherFor(klass),
        next: nextLevel(level),
        students,
        count: students.length,
        avg: avgOf(students),
        atRisk,
        eligible: students.length - atRisk,
      };
    })
    .sort((a, b) => LEVELS.indexOf(a.level as never) - LEVELS.indexOf(b.level as never) || a.klass.localeCompare(b.klass));

  const graduating = classes.filter((c) => c.next === "Graduated").reduce((a, c) => a + c.count, 0);
  const toReview = classes.reduce((a, c) => a + c.atRisk, 0);
  const eligible = act.length - graduating - toReview;
  return { classes, graduating, toReview, eligible: Math.max(0, eligible), totalActive: act.length };
}
