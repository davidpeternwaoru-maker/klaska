/* Finance domain — fees, collection, and the school's live P&L.
   Computed from the same student data; cost split & expenses are samples. */

import { activeStudents, niceClass, STAFF, payrollFor } from "./people";
const active = () => activeStudents();

export function feesSummary() {
  const a = active();
  const collected = a.reduce((sum, s) => sum + s.paid, 0);
  const expected = a.reduce((sum, s) => sum + s.termFee, 0);
  const defaulters = a.filter((s) => s.termFee - s.paid > 0);

  const classMap: Record<string, { paid: number; due: number }> = {};
  a.forEach((s) => {
    const k = niceClass(s);
    classMap[k] = classMap[k] || { paid: 0, due: 0 };
    classMap[k].paid += s.paid;
    classMap[k].due += s.termFee;
  });
  const byClass = Object.entries(classMap)
    .map(([klass, v]) => ({ klass, rate: Math.round((v.paid / v.due) * 100), paid: v.paid, due: v.due }))
    .sort((x, y) => y.rate - x.rate);

  return { collected, expected, outstanding: expected - collected, defaulters, byClass, students: a };
}

// cost categories as proportions of total operating cost (premium realistic mix)
const COST_SPLIT: [string, number][] = [
  ["Salaries", 0.713],
  ["Diesel & Power", 0.164],
  ["Maintenance", 0.034],
  ["Supplies", 0.0485],
  ["Levies", 0.0405],
];

export type RecentExpense = { id: string; ref: string; date: string; category: string; vendor: string; amount: number; status: "Paid" | "Pending" };
export const RECENT_EXPENSES: RecentExpense[] = [
  { id: "e1", ref: "EX-0421", date: "2026-05-19", category: "Salaries", vendor: "May payroll — Teaching staff", amount: 6_840_000, status: "Paid" },
  { id: "e2", ref: "EX-0420", date: "2026-05-19", category: "Salaries", vendor: "May payroll — Non-teaching", amount: 1_460_000, status: "Paid" },
  { id: "e3", ref: "EX-0419", date: "2026-05-18", category: "Diesel & Power", vendor: "Total Energies — 1,200L", amount: 1_320_000, status: "Paid" },
  { id: "e4", ref: "EX-0418", date: "2026-05-16", category: "Maintenance", vendor: "Generator service — Mantrac", amount: 185_000, status: "Paid" },
  { id: "e5", ref: "EX-0417", date: "2026-05-15", category: "Supplies", vendor: "Eko Stationery — exam booklets", amount: 312_500, status: "Paid" },
  { id: "e6", ref: "EX-0416", date: "2026-05-12", category: "Levies", vendor: "State Education Board levy", amount: 120_000, status: "Pending" },
];

export function financials() {
  const a = active();
  const revenue = a.reduce((sum, s) => sum + s.paid, 0);
  const expected = a.reduce((sum, s) => sum + s.termFee, 0);
  const costs = Math.round(revenue * 0.171);
  const byCategory = COST_SPLIT.map(([label, f]) => ({ label, value: Math.round(costs * f) }));
  const profit = revenue - costs;
  const margin = revenue ? Math.round((profit / revenue) * 100) : 0;
  const cashOnHand = Math.round(revenue * 1.087);

  const factors = [0.46, 0.55, 0.63, 0.74, 0.86, 1];
  const months = ["Dec", "Jan", "Feb", "Mar", "Apr", "May"];
  const monthly = months.map((m, i) => {
    const rev = Math.round(revenue * factors[i]);
    const cost = Math.round(rev * 0.171);
    return { m, rev, cost, profit: rev - cost };
  });

  const levelMap: Record<string, number> = {};
  a.forEach((s) => {
    if (s.level.startsWith("JSS") || s.level.startsWith("SSS")) levelMap[s.level] = (levelMap[s.level] || 0) + s.paid;
  });
  const order = ["JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3"];
  const byLevel = order.filter((l) => levelMap[l]).map((l) => ({ label: l.replace(" ", ""), value: levelMap[l] }));

  return { revenue, expected, costs, profit, margin, cashOnHand, byCategory, monthly, byLevel };
}

export function payrollGroups() {
  const teaching = STAFF.filter((s) => s.role === "Teacher" || s.role === "HOD");
  const nonTeach = STAFF.filter((s) => s.role === "Principal" || s.role === "Bursar" || s.role === "Admin");
  const sum = (arr: typeof STAFF) => arr.reduce((a, s) => a + payrollFor(s).gross, 0);
  const groups = [
    { label: "Teaching", staff: teaching.length, amount: sum(teaching) },
    { label: "Non-teaching", staff: nonTeach.length, amount: sum(nonTeach) },
    { label: "Security", staff: 5, amount: 425_000 },
  ];
  const total = groups.reduce((a, g) => a + g.amount, 0);
  return { groups, total, headcount: STAFF.length + 5 };
}
