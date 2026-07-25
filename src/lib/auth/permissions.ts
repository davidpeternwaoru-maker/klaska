// The Permission Matrix (Product Structure §5), in one place.
// "full" = create/edit/manage · "view" = read only · "dept"/"own" = scoped ·
// absent = invisible. Server actions enforce writes; the sidebar and pages use
// canView/canManage so each role sees exactly what it should — nothing more.

import type { Role } from "./jwt";

export type Area =
  | "students"
  | "attendance"
  | "results"
  | "ai"
  | "fees"
  | "financial"
  | "payroll"
  | "appraisals"
  | "insights"
  | "settings"
  | "notifications"
  | "staff"
  | "promotions"
  | "transcripts";

type Level = "full" | "view" | "dept" | "own";

const MATRIX: Record<Area, Partial<Record<Role, Level>>> = {
  students: { OWNER: "full", HOS: "full", BURSAR: "view", HOD: "dept", TEACHER: "own", ADMIN: "full" },
  attendance: { OWNER: "view", HOS: "full", BURSAR: "view", HOD: "dept", TEACHER: "own", ADMIN: "view" },
  results: { OWNER: "view", HOS: "full", HOD: "dept", TEACHER: "own" },
  ai: { OWNER: "full", HOS: "full", HOD: "dept", TEACHER: "own" },
  fees: { OWNER: "full", HOS: "view", BURSAR: "full" },
  financial: { OWNER: "full", BURSAR: "full" },
  payroll: { OWNER: "full", BURSAR: "full", TEACHER: "own" },
  appraisals: { OWNER: "full", HOS: "full", HOD: "dept", TEACHER: "own" },
  insights: { OWNER: "full", HOS: "full", HOD: "dept" },
  settings: { OWNER: "full", HOS: "view", BURSAR: "view" },
  notifications: { OWNER: "full", HOS: "full", BURSAR: "full" },
  staff: { OWNER: "full", HOS: "view", BURSAR: "full" },
  promotions: { OWNER: "full", HOS: "full", ADMIN: "view" },
  // Official transcripts: Owner, Principal/HOS and Admin Officer generate them.
  // Bursar, HOD and Teacher have no access.
  transcripts: { OWNER: "full", HOS: "full", ADMIN: "full" },
};

export function canView(role: Role, area: Area): boolean {
  return !!MATRIX[area][role];
}
export function canManage(role: Role, area: Area): boolean {
  return MATRIX[area][role] === "full";
}
/** Scoped roles: teachers → own classes, HODs → their department. */
export function scopeOf(role: Role, area: Area): Level | null {
  return MATRIX[area][role] ?? null;
}

/* ---- Action-level rules straight from the matrix (§5) ----
   Owner VIEWS attendance & scores (never inputs); teachers input their OWN;
   HOS full; HOD their dept. Admin manages records but never scores/money. */
export const canMarkAttendance = (r: Role) => r === "HOS" || r === "TEACHER" || r === "HOD";
export const canEnterScores = (r: Role) => r === "HOS" || r === "TEACHER" || r === "HOD";
export const canManageStudents = (r: Role) => r === "OWNER" || r === "HOS" || r === "ADMIN";
export const canManageSubjects = (r: Role) => r === "OWNER" || r === "HOS";
export const canManageClasses = (r: Role) => r === "OWNER" || r === "HOS";
// Teaching duties (form-teacher + subject-in-class assignments) are academic
// structure — set by the proprietor or principal, not the bursar.
export const canManageTeaching = (r: Role) => r === "OWNER" || r === "HOS";
export const canEditAcademicSettings = (r: Role) => r === "OWNER" || r === "HOS"; // term, grading (HOS "Limited")
export const canEditFeeStructure = (r: Role) => r === "OWNER" || r === "BURSAR"; // Bursar "Fee setup"

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Owner / Proprietor",
  HOS: "Principal (HOS)",
  BURSAR: "Bursar / Accountant",
  HOD: "Head of Department",
  TEACHER: "Teacher",
  ADMIN: "Admin Officer",
};
