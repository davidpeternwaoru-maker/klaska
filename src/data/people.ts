/* People domain — students (full lifecycle), staff & payroll.
   Deterministic sample data (seeded PRNG) so server and client render
   identically (no hydration mismatch). Replaced by a real DB next. */

import { getClassLabel } from "@/lib/config/schoolConfig";
import { getLevelOverride, getStatusOverride } from "@/lib/promotions/promotionsStore";

// ---------- seeded RNG ----------
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function seedFrom(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const FIRST = [
  "Adaeze", "Chinwe", "Ngozi", "Ifeoma", "Amaka", "Chidera", "Obioma", "Uche", "Nneka",
  "Tunde", "Femi", "Segun", "Wale", "Tobi", "Kunle", "Bisi", "Yemi", "Sade",
  "Aisha", "Halima", "Zainab", "Fatima", "Maryam", "Amina", "Hauwa", "Khadijah",
  "Yusuf", "Ibrahim", "Musa", "Aliyu", "Bashir", "Sani", "Aminu", "Kabir", "Umar",
  "Emeka", "Chika", "Obinna", "Ikenna", "Kelechi", "Nnamdi", "Ifeanyi", "Ebuka",
  "Daniel", "David", "Joshua", "Samuel", "Esther", "Grace", "Faith", "Blessing", "Kamsi", "Tari",
];
const LAST = [
  "Okonkwo", "Adeyemi", "Bello", "Eze", "Adekunle", "Nwosu", "Aliyu", "Obi", "Suleiman", "Akande",
  "Okafor", "Balogun", "Adebayo", "Olawale", "Ojo", "Lawal", "Yakubu", "Mohammed", "Sanusi",
  "Garba", "Abubakar", "Nnaji", "Okoro", "Egwu", "Bankole", "Akinola", "Williams", "Edet", "Akpan",
];
const RELATIONS = ["Mother", "Father", "Guardian", "Aunt", "Uncle"];

// Full Nigerian progression
export const LEVELS = [
  "Crèche", "KG 1", "KG 2", "Nursery 1", "Nursery 2",
  "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
  "JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3",
] as const;
export type Level = (typeof LEVELS)[number];
const ARMS = ["A", "B", "C"];

export type Status = "active" | "graduated" | "left";
export type FeeStatus = "paid" | "partial" | "unpaid";

export type Student = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  gender: "F" | "M";
  level: Level;
  arm: string;
  klass: string;
  admissionNo: string;
  dob: string;
  admittedOn: string;
  status: Status;
  exitedOn?: string;
  leftReason?: string;
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
  guardianEmail: string;
  termFee: number;
  paid: number;
  feeStatus: FeeStatus;
  hue: number;
  checkedInToday: boolean;
  checkInTime?: string;
};

const FEE_BY_BAND: Record<string, number> = { early: 95000, primary: 130000, junior: 195000, senior: 255000 };

export function bandOf(level: Level): "early" | "primary" | "junior" | "senior" {
  if (level.startsWith("Crèche") || level.startsWith("KG") || level.startsWith("Nursery")) return "early";
  if (level.startsWith("Primary")) return "primary";
  if (level.startsWith("JSS")) return "junior";
  return "senior";
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// Relative enrolment weights per level (aligned to LEVELS) so the school reads
// like a real one: a sizeable nursery, steady primary, larger secondary.
const LEVEL_WEIGHTS = [22, 24, 24, 24, 25, 25, 25, 30, 30, 31, 31, 64, 64, 66, 64, 65, 65];
const W_TOTAL = LEVEL_WEIGHTS.reduce((a, b) => a + b, 0);
function pickLevel(rng: () => number): Level {
  let x = rng() * W_TOTAL;
  for (let i = 0; i < LEVELS.length; i++) {
    x -= LEVEL_WEIGHTS[i];
    if (x <= 0) return LEVELS[i];
  }
  return LEVELS[LEVELS.length - 1];
}

function makeStudent(i: number): Student {
  const id = `STU-${(1000 + i).toString()}`;
  const rng = mulberry32(seedFrom(id));
  const firstName = pick(rng, FIRST);
  const lastName = pick(rng, LAST);
  const gender: "F" | "M" = rng() > 0.5 ? "F" : "M";

  // status mix: mostly active, some graduated, a few left
  const r = rng();
  const status: Status = r > 0.88 ? "graduated" : r > 0.84 ? "left" : "active";

  const level = status === "graduated" ? "SSS 3" : pickLevel(rng);
  const arm = pick(rng, ARMS);
  const band = bandOf(level);
  const termFee = FEE_BY_BAND[band];
  const paidRatio = status === "active" ? [1, 1, 0.6, 0.3, 0][Math.floor(rng() * 5)] : 1;
  const paid = Math.round(termFee * paidRatio);
  const feeStatus: FeeStatus = paid >= termFee ? "paid" : paid > 0 ? "partial" : "unpaid";

  const admYear = 2018 + Math.floor(rng() * 7);
  const checkedInToday = status === "active" && rng() > 0.12;
  const ci = 7 * 60 + 20 + Math.floor(rng() * 70); // 7:20–8:30
  const checkInTime = checkedInToday
    ? `${Math.floor(ci / 60)}:${(ci % 60).toString().padStart(2, "0")} AM`
    : undefined;

  return {
    id,
    firstName,
    lastName,
    name: `${firstName} ${lastName}`,
    gender,
    level,
    arm,
    klass: `${level} ${arm}`,
    admissionNo: `GMC-${admYear}-${(100 + i).toString().padStart(4, "0")}`,
    dob: `${2008 + Math.floor(rng() * 12)}-0${1 + Math.floor(rng() * 9)}-${(10 + Math.floor(rng() * 18))}`,
    admittedOn: `Sept ${admYear}`,
    status,
    exitedOn: status === "graduated" ? "July 2025" : status === "left" ? `${["Feb", "May", "Nov"][Math.floor(rng() * 3)]} 202${3 + Math.floor(rng() * 2)}` : undefined,
    leftReason: status === "left" ? pick(rng, ["Relocation", "Transfer to another school", "Financial", "Family reasons"]) : undefined,
    guardianName: `${rng() > 0.5 ? "Mrs." : "Mr."} ${pick(rng, FIRST)} ${lastName}`,
    guardianRelation: pick(rng, RELATIONS),
    guardianPhone: `080${Math.floor(10000000 + rng() * 89999999)}`,
    guardianEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@gmail.com`,
    termFee,
    paid,
    feeStatus,
    hue: Math.floor(rng() * 360),
    checkedInToday,
    checkInTime,
  };
}

export const STUDENTS: Student[] = Array.from({ length: 800 }, (_, i) => makeStudent(i));

export const COUNTS = {
  active: STUDENTS.filter((s) => s.status === "active").length,
  graduated: STUDENTS.filter((s) => s.status === "graduated").length,
  left: STUDENTS.filter((s) => s.status === "left").length,
  get alumni() {
    return this.graduated + this.left;
  },
  get allTime() {
    return STUDENTS.length;
  },
};

export const niceClass = (s: { level: Level | string; arm: string; id?: string }) => {
  const lvl = (s.id ? getLevelOverride(s.id) : null) ?? s.level;
  return `${getClassLabel(lvl)} ${s.arm}`;
};

// effective (promotion-aware) views of a student
export const effLevel = (s: Student): Level => ((getLevelOverride(s.id) as Level) ?? s.level);
export const effStatus = (s: Student): Status => ((getStatusOverride(s.id) as Status) ?? s.status);
export const effStudent = (s: Student): Student => {
  const level = effLevel(s);
  const status = effStatus(s);
  return { ...s, level, status, klass: `${level} ${s.arm}` };
};
export const activeStudents = (): Student[] => STUDENTS.filter((s) => effStatus(s) === "active");

export function studentById(id: string): Student | undefined {
  return STUDENTS.find((s) => s.id === id);
}

// ---------- profile detail (deterministic from id) ----------
const SUBJECTS = ["English", "Mathematics", "Basic Science", "Social Studies", "Civic Education", "Computer"];
const SR_SUBJECTS = ["English", "Mathematics", "Physics", "Chemistry", "Biology", "Economics"];
const SKILLS = ["Literacy", "Numeracy", "Social skills", "Motor skills", "Creative play"];
const SKILL_RATINGS = ["Excellent", "Developing", "Needs support"] as const;

export function getAcademics(s: Student) {
  const rng = mulberry32(seedFrom(s.id + ":acad"));
  const band = bandOf(s.level);
  if (band === "early") {
    return {
      kind: "developmental" as const,
      skills: SKILLS.map((label) => ({
        label,
        rating: SKILL_RATINGS[Math.min(2, Math.floor(rng() * 3.2))],
      })),
      comment: "A cheerful learner who is settling in well and growing in confidence each week.",
    };
  }
  const subjects = (band === "senior" ? SR_SUBJECTS : SUBJECTS).map((subject) => {
    const ca1 = 10 + Math.floor(rng() * 11);
    const ca2 = 10 + Math.floor(rng() * 11);
    const exam = 35 + Math.floor(rng() * 26);
    const total = ca1 + ca2 + exam;
    const grade = total >= 75 ? "A1" : total >= 70 ? "B2" : total >= 65 ? "B3" : total >= 60 ? "C4" : total >= 50 ? "C6" : total >= 45 ? "D7" : "F9";
    return { subject, ca1, ca2, exam, total, grade };
  });
  const avg = Math.round(subjects.reduce((a, b) => a + b.total, 0) / subjects.length);
  return { kind: "academic" as const, subjects, average: avg, position: 1 + Math.floor(rng() * 32) };
}

export function getAttendance(s: Student) {
  const rng = mulberry32(seedFrom(s.id + ":att"));
  const present = 70 + Math.floor(rng() * 25);
  const late = Math.floor(rng() * 8);
  const absent = 100 - present - late < 0 ? 0 : 100 - present - late;
  const recent = Array.from({ length: 10 }, () => {
    const r = rng();
    return r > 0.9 ? "absent" : r > 0.82 ? "late" : "present";
  }) as ("present" | "late" | "absent")[];
  return { rate: present, present, late, absent, recent };
}

export function getFeesLedger(s: Student) {
  const rng = mulberry32(seedFrom(s.id + ":fees"));
  const terms = ["1st Term 2024/25", "2nd Term 2024/25", "3rd Term 2024/25", "1st Term 2025/26", "Current term"];
  const methods = ["Virtual account", "Bank transfer", "Card", "USSD"];
  const rows = terms.map((term, i) => {
    const due = s.termFee;
    const paid = i === terms.length - 1 ? s.paid : due;
    return { term, due, paid, method: pick(rng, methods), date: `${["12 Jan", "08 May", "21 Sep", "14 Jan", "—"][i]}` };
  });
  return rows;
}

export function getHistory(s: Student) {
  const events: { date: string; title: string; meta: string; kind: string }[] = [
    { date: s.admittedOn, title: "Enrolled", meta: `Admission ${s.admissionNo}`, kind: "enrolment" },
    { date: "Sept 2023", title: "Promoted", meta: "Advanced to the next class for the new session", kind: "promote" },
    { date: "Jan 2025", title: "Fee payment", meta: "Term fees fully settled", kind: "payment" },
  ];
  if (s.status === "graduated") events.push({ date: s.exitedOn!, title: "Graduated", meta: "Completed SSS 3 — WAEC", kind: "graduate" });
  if (s.status === "left") events.push({ date: s.exitedOn!, title: "Left school", meta: s.leftReason!, kind: "left" });
  return events.reverse();
}

// ---------- staff & payroll ----------
export type Role = "Owner" | "Principal" | "Bursar" | "HOD" | "Teacher" | "Admin";
export type Staff = {
  id: string;
  name: string;
  role: Role;
  department?: string;
  phone: string;
  email: string;
  grossMonthly: number;
  status: "active";
  hue: number;
};

const STAFF_SEED: Array<[string, Role, string | undefined, number]> = [
  ["Mrs. Ifeoma Okeke", "Principal", undefined, 520000],
  ["Mr. Chuka Obi", "Bursar", "Finance", 410000],
  ["Mrs. Funke Adeyemi", "HOD", "Sciences", 360000],
  ["Mr. Tunde Bakare", "HOD", "Languages", 355000],
  ["Mrs. Adaobi Okonkwo", "Teacher", "Primary", 230000],
  ["Mr. Yusuf Bello", "Teacher", "Mathematics", 245000],
  ["Mrs. Ngozi Eze", "Teacher", "English", 240000],
  ["Mr. Emeka Nwosu", "Teacher", "Sciences", 250000],
  ["Mrs. Halima Aliyu", "Teacher", "Social Studies", 235000],
  ["Mr. Wale Akande", "Teacher", "Computer", 248000],
  ["Mrs. Bisi Adekunle", "Admin", "Front office", 190000],
  ["Mr. Kabir Sanusi", "Teacher", "Early Years", 220000],
];

export const STAFF: Staff[] = STAFF_SEED.map(([name, role, department, grossMonthly], i) => {
  const id = `STF-${100 + i}`;
  const rng = mulberry32(seedFrom(id));
  return {
    id,
    name,
    role,
    department,
    phone: `070${Math.floor(10000000 + rng() * 89999999)}`,
    email: `${name.split(" ").slice(-1)[0].toLowerCase()}@gracemount.edu.ng`,
    grossMonthly,
    status: "active",
    hue: Math.floor(rng() * 360),
  };
});

// Simple, clearly-estimated payroll math (rates are illustrative, not tax advice).
export function payrollFor(s: Staff) {
  const pension = Math.round(s.grossMonthly * 0.08);
  const taxable = s.grossMonthly - pension;
  const paye = Math.round(taxable * 0.07); // illustrative effective rate
  const net = s.grossMonthly - pension - paye;
  return { gross: s.grossMonthly, pension, paye, net };
}

export const PAYROLL_SUMMARY = STAFF.reduce(
  (acc, s) => {
    const p = payrollFor(s);
    acc.gross += p.gross;
    acc.pension += p.pension;
    acc.paye += p.paye;
    acc.net += p.net;
    return acc;
  },
  { gross: 0, pension: 0, paye: 0, net: 0, headcount: STAFF.length },
);
