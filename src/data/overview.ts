/* Realistic Nigerian sample data for the Overview dashboard.
   This is placeholder content — the next milestone wires up a real database. */

export const SCHOOL = {
  name: "Grace Mount College",
  shortName: "GMC",
  session: "2025/2026",
  term: "Third Term",
  termWeeksDone: 8,
  termWeeksTotal: 13,
  termEnds: "Fri 19 Jun",
  principal: "Mrs. Ifeoma Okeke",
};

export type Money = number; // naira

export const ngn = (n: Money) => "₦" + n.toLocaleString("en-NG");
export const ngnCompact = (n: Money) => {
  if (n >= 1_000_000) return "₦" + (n / 1_000_000).toFixed(2).replace(/\.00$/, "") + "M";
  if (n >= 1_000) return "₦" + (n / 1_000).toFixed(0) + "k";
  return "₦" + n;
};

export const OVERVIEW = {
  activeStudents: 675,
  alumni: 330,
  leavers: 34,
  arms: 26,
  presentToday: 589,
  lateToday: 19,
  feesCollected: 71_400_000,
  feesTarget: 100_000_000,
  outstanding: 28_600_000,
  netProfit: 18_240_000,
  profitMargin: 25.5,
  examReadiness: 78, // % predicted on-track
};

export const COLLECTION_TREND = [
  { label: "Wk 1", value: 6.2 },
  { label: "Wk 2", value: 18.4 },
  { label: "Wk 3", value: 31.0 },
  { label: "Wk 4", value: 42.6 },
  { label: "Wk 5", value: 51.8 },
  { label: "Wk 6", value: 60.3 },
  { label: "Wk 7", value: 66.9 },
  { label: "Wk 8", value: 71.4 },
];

export const ATTENDANCE_TREND = [
  { label: "Mon", value: 91 },
  { label: "Tue", value: 88 },
  { label: "Wed", value: 93 },
  { label: "Thu", value: 87 },
  { label: "Fri", value: 84 },
  { label: "Mon", value: 90 },
  { label: "Tue", value: 92 },
  { label: "Wed", value: 87 },
];

export type ClassAttendance = { klass: string; present: number; total: number };
export const CLASS_ATTENDANCE: ClassAttendance[] = [
  { klass: "JSS 1A", present: 34, total: 36 },
  { klass: "JSS 2A", present: 31, total: 35 },
  { klass: "JSS 3A", present: 29, total: 33 },
  { klass: "SSS 1A", present: 30, total: 32 },
  { klass: "SSS 2B", present: 27, total: 31 },
  { klass: "Primary 4", present: 38, total: 40 },
];

export type Activity = {
  id: string;
  kind: "payment" | "attendance" | "result" | "enrolment" | "expense";
  title: string;
  meta: string;
  time: string;
};

export const ACTIVITY: Activity[] = [
  { id: "a1", kind: "payment", title: "Fee payment — Adaeze Okonkwo", meta: "JSS 2A · ₦195,000 · virtual account", time: "2m ago" },
  { id: "a2", kind: "attendance", title: "Attendance submitted — JSS 1A", meta: "34 / 36 present · Mrs. Adaobi Okonkwo", time: "14m ago" },
  { id: "a3", kind: "result", title: "CA2 scores entered — SSS 2 Physics", meta: "31 students · Mr. Chuka Obi", time: "38m ago" },
  { id: "a4", kind: "payment", title: "Fee payment — Yusuf Bello", meta: "Primary 5 · ₦120,000 · transfer", time: "1h ago" },
  { id: "a5", kind: "enrolment", title: "New enrolment — Zainab Aliyu", meta: "KG 2 · admission #GMC-2026-0188", time: "2h ago" },
  { id: "a6", kind: "expense", title: "Expense logged — Diesel & Power", meta: "₦340,000 · approved by bursar", time: "3h ago" },
];

export const ACTIVITY_ICON: Record<Activity["kind"], string> = {
  payment: "fees",
  attendance: "attendance",
  result: "reports",
  enrolment: "students",
  expense: "wallet",
};
