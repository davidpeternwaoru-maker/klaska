// Populates the Sunrise demo with realistic FINANCE records so the Financial
// System page comes alive (it computes everything live — this only supplies the
// underlying expense + payment data it reads). Idempotent: clears prior demo
// expenses and re-creates a clean 6-month history including the current month.

const { PrismaClient } = require("@prisma/client");
const { readFileSync } = require("fs");
const { join } = require("path");

function parseEnv() {
  const out = {};
  for (const line of readFileSync(join(__dirname, "..", ".env"), "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "").replace(/\r$/, "");
  }
  return out;
}
const env = parseEnv();
process.env.DATABASE_URL = env.DATABASE_URL;
process.env.DIRECT_URL = env.DIRECT_URL;
const prisma = new PrismaClient();
const SCHOOL_ID = "demo-sunrise";

// deterministic 0..1 wobble so months aren't identical
function wob(seed) {
  let h = 2166136261;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000;
}
const vary = (base, seed, pct = 0.15) => Math.round(base * (1 + (wob(seed) - 0.5) * 2 * pct));

async function main() {
  const staff = await prisma.staff.findMany({ where: { schoolId: SCHOOL_ID }, select: { role: true, salaryMonthly: true } });
  const teachRoles = new Set(["TEACHER", "HOD"]);
  const teachPay = staff.filter((s) => teachRoles.has(s.role)).reduce((t, s) => t + (s.salaryMonthly || 240000), 0) || 6840000;
  const nonTeachPay = staff.filter((s) => !teachRoles.has(s.role)).reduce((t, s) => t + (s.salaryMonthly || 200000), 0) || 1885000;

  const now = new Date();
  // last 6 calendar months, oldest → newest, current month included
  const months = [];
  for (let i = 5; i >= 0; i--) months.push(new Date(now.getFullYear(), now.getMonth() - i, 1));

  const day = (m, d) => new Date(m.getFullYear(), m.getMonth(), Math.min(d, 27));
  const rows = [];
  for (const m of months) {
    const k = `${m.getFullYear()}-${m.getMonth()}`;
    const isCurrent = m.getMonth() === now.getMonth() && m.getFullYear() === now.getFullYear();
    // Salaries (the bulk) — teaching + non-teaching
    rows.push({ category: "SALARIES", description: "Monthly payroll — teaching staff", amount: vary(teachPay, k + "t", 0.03), spentAt: day(m, 25) });
    rows.push({ category: "SALARIES", description: "Monthly payroll — non-teaching & support", amount: vary(nonTeachPay, k + "n", 0.03), spentAt: day(m, 25) });
    // Diesel & power (Utilities)
    rows.push({ category: "UTILITIES", description: "Diesel — Total Energies (bulk supply)", amount: vary(1180000, k + "d"), spentAt: day(m, 8) });
    rows.push({ category: "UTILITIES", description: "Electricity — IKEDC monthly bill", amount: vary(640000, k + "e"), spentAt: day(m, 13) });
    // Maintenance
    rows.push({ category: "MAINTENANCE", description: wob(k + "m") > 0.5 ? "Generator service — Mantrac" : "Plumbing & repairs — Block C", amount: vary(210000, k + "m", 0.4), spentAt: day(m, 16) });
    // Supplies
    rows.push({ category: "SUPPLIES", description: wob(k + "s") > 0.5 ? "Exam booklets — Eko Stationery" : "Cleaning & office supplies", amount: vary(320000, k + "s", 0.4), spentAt: day(m, 10) });
    // Transport (some months)
    if (wob(k + "tr") > 0.4) rows.push({ category: "TRANSPORT", description: "School bus diesel & upkeep", amount: vary(180000, k + "tr", 0.3), spentAt: day(m, 19) });
    // Levies (quarterly-ish)
    if (m.getMonth() % 3 === 1) rows.push({ category: "OTHER", description: "LASG Education Levy", amount: 480000, spentAt: day(m, 14) });
  }

  await prisma.expense.deleteMany({ where: { schoolId: SCHOOL_ID } });
  await prisma.expense.createMany({ data: rows.map((r) => ({ schoolId: SCHOOL_ID, category: r.category, description: r.description, amount: r.amount, spentAt: r.spentAt, recordedBy: "Mr. Chuka Obi" })) });

  // Spread existing payments across the 6 months so the revenue trend isn't flat.
  const pays = await prisma.payment.findMany({ where: { schoolId: SCHOOL_ID }, select: { id: true } });
  let i = 0;
  for (const pay of pays) {
    // weight later months more (revenue grows toward the current term)
    const bucket = Math.min(months.length - 1, Math.floor(Math.pow(wob(pay.id), 0.6) * months.length));
    const m = months[bucket];
    await prisma.payment.update({ where: { id: pay.id }, data: { paidAt: day(m, 3 + (i % 22)) } });
    i++;
  }

  const totalExp = rows.reduce((t, r) => t + r.amount, 0);
  console.log(`✔ finance seeded — ${rows.length} expenses across ${months.length} months (₦${totalExp.toLocaleString()}), ${pays.length} payments spread over the period.`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
