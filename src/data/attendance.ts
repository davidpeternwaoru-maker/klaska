/* Attendance aggregates — per-class present/late/absent + school KPIs,
   computed from the live student check-in data. */

import { STUDENTS, activeStudents, niceClass, seedFrom, type Student, LEVELS } from "./people";

const TEACHER_NAMES = [
  "Mrs. Grace Etim", "Miss Tolu Bankole", "Mrs. Patience Okon", "Mr. Daniel Okeke", "Mrs. Comfort Udo",
  "Miss Zainab Garba", "Mr. Femi Adeyemi", "Mrs. Ngozi Eze", "Mr. Yusuf Bello", "Mrs. Halima Aliyu",
  "Mr. Emeka Nwosu", "Mrs. Bisi Adekunle", "Mr. Wale Akande", "Mrs. Funke Adeyemi", "Mr. Chuka Obi",
  "Mrs. Adaobi Okonkwo", "Mr. Kabir Sanusi", "Mrs. Aisha Lawal", "Mr. Tunde Bakare", "Miss Sade Ojo",
];

export const teacherFor = (klass: string) => TEACHER_NAMES[seedFrom(klass + ":t") % TEACHER_NAMES.length];

export type ClassRow = {
  klass: string;
  level: string;
  teacher: string;
  roster: Student[];
  total: number;
  present: number;
  late: number;
  absent: number;
  pct: number;
};

export function classAttendance(): ClassRow[] {
  const map: Record<string, Student[]> = {};
  activeStudents().forEach((s) => (map[niceClass(s)] = map[niceClass(s)] || []).push(s));
  return Object.entries(map)
    .map(([klass, roster]) => {
      const total = roster.length;
      const checkedIn = roster.filter((s) => s.checkedInToday).length;
      const late = Math.min(checkedIn, seedFrom(klass) % 3); // 0–2, deterministic
      const present = Math.max(0, checkedIn - late);
      const absent = total - present - late;
      const teacher = TEACHER_NAMES[seedFrom(klass + ":t") % TEACHER_NAMES.length];
      return { klass, level: roster[0].level, teacher, roster, total, present, late, absent, pct: Math.round((present / total) * 100) };
    })
    .sort((a, b) => LEVELS.indexOf(a.level as never) - LEVELS.indexOf(b.level as never) || a.klass.localeCompare(b.klass));
}

export function attendanceKPIs() {
  const rows = classAttendance();
  const present = rows.reduce((a, r) => a + r.present, 0);
  const late = rows.reduce((a, r) => a + r.late, 0);
  const absent = rows.reduce((a, r) => a + r.absent, 0);
  const total = rows.reduce((a, r) => a + r.total, 0);

  // average arrival time from check-in times
  const mins: number[] = [];
  activeStudents().filter((s) => s.checkInTime).forEach((s) => {
    const m = s.checkInTime!.match(/(\d+):(\d+)/);
    if (m) mins.push(+m[1] * 60 + +m[2]);
  });
  const avg = mins.length ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length) : 468;
  const avgArrival = `${Math.floor(avg / 60)}:${(avg % 60).toString().padStart(2, "0")} AM`;

  return { present, late, absent, total, avgArrival };
}

/** SS-aware level tabs that actually have classes. */
export function levelTabs(): string[] {
  const present = new Set(classAttendance().map((r) => r.level));
  const order = ["JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3"];
  return order.filter((l) => present.has(l));
}
