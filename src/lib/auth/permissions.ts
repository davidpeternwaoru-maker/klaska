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
  | "promotions";

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

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Owner / Proprietor",
  HOS: "Principal (HOS)",
  BURSAR: "Bursar / Accountant",
  HOD: "Head of Department",
  TEACHER: "Teacher",
  ADMIN: "Admin Officer",
};
