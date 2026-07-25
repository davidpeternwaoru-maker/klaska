// Populates the Sunrise demo with realistic, BALANCED finance records so the
// Financial System + statements read like a healthy school (revenue > costs,
// positive cash). Everything is real data the app then computes from — nothing
// is hardcoded in the app. Idempotent: safe to re-run.
//
// 1) Tops fee collection up to ~85% of what's invoiced (adds real payments).
// 2) Spreads all payments across the last 6 months (a real revenue trend).
// 3) Recreates 6 months of expenses sized to ~62% of collected fees, so the
//    P&L shows a sensible operating surplus (salaries the biggest line).

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

function wob(seed) {
  let h = 2166136261;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000;
}
const pick = (arr, seed) => arr[Math.floor(wob(seed) * arr.length)];

async function main() {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) months.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  const day = (m, d) => new Date(m.getFullYear(), m.getMonth(), Math.min(d, 27));
  const bucketMonth = (seed) => months[Math.min(months.length - 1, Math.floor(Math.pow(wob(seed), 0.6) * months.length))];

  // ── 1) top fee collection up to ~85% of invoiced ──
  const invoices = await prisma.invoice.findMany({ where: { schoolId: SCHOOL_ID }, include: { payments: true } });
  const newPays = [];
  for (const inv of invoices) {
    const paid = inv.payments.reduce((t, p) => t + p.amount, 0);
    const target = Math.round(inv.total * (0.78 + wob(inv.id) * 0.2)); // 78–98%
    const gap = target - paid;
    if (gap > 500) {
      const m = bucketMonth(inv.id);
      newPays.push({ schoolId: SCHOOL_ID, studentId: inv.studentId, invoiceId: inv.id, amount: gap, method: pick(["CASH", "TRANSFER", "POS"], inv.id + "m"), recordedBy: "Mr. Chuka Obi", paidAt: day(m, 3 + Math.floor(wob(inv.id + "d") * 22)) });
    }
  }
  if (newPays.length) await prisma.payment.createMany({ data: newPays });

  // ── 2) spread ALL payments across the six months (weighted to recent) ──
  const pays = await prisma.payment.findMany({ where: { schoolId: SCHOOL_ID }, select: { id: true } });
  let i = 0;
  for (const p of pays) {
    const m = bucketMonth(p.id);
    await prisma.payment.update({ where: { id: p.id }, data: { paidAt: day(m, 3 + (i++ % 22)) } });
  }
  const collected = (await prisma.payment.aggregate({ where: { schoolId: SCHOOL_ID }, _sum: { amount: true } }))._sum.amount || 0;

  // ── 3) expenses ≈ 62% of collected, spread over 6 months (salaries biggest) ──
  const budget = Math.round(collected * 0.62);
  const monthly = budget / months.length;
  const mix = [
    { cat: "SALARIES", share: 0.58, descs: ["Monthly payroll — teaching staff", "Monthly payroll — non-teaching & support"], d: 25 },
    { cat: "UTILITIES", share: 0.18, descs: ["Diesel — Total Energies", "Electricity — IKEDC monthly bill"], d: 9 },
    { cat: "MAINTENANCE", share: 0.07, descs: ["Generator service — Mantrac", "Plumbing & repairs — Block C"], d: 16 },
    { cat: "SUPPLIES", share: 0.09, descs: ["Exam booklets — Eko Stationery", "Cleaning & office supplies"], d: 11 },
    { cat: "TRANSPORT", share: 0.05, descs: ["School bus diesel & upkeep"], d: 19 },
    { cat: "OTHER", share: 0.03, descs: ["LASG Education Levy"], d: 14 },
  ];
  const rows = [];
  for (const m of months) {
    const k = `${m.getFullYear()}-${m.getMonth()}`;
    for (const g of mix) {
      const base = monthly * g.share;
      if (g.descs.length === 2) {
        rows.push({ category: g.cat, description: g.descs[0], amount: Math.round(base * 0.68 * (1 + (wob(k + g.cat + "a") - 0.5) * 0.08)), spentAt: day(m, g.d) });
        rows.push({ category: g.cat, description: g.descs[1], amount: Math.round(base * 0.32 * (1 + (wob(k + g.cat + "b") - 0.5) * 0.08)), spentAt: day(m, g.d) });
      } else {
        rows.push({ category: g.cat, description: g.descs[0], amount: Math.round(base * (1 + (wob(k + g.cat) - 0.5) * 0.2)), spentAt: day(m, g.d) });
      }
    }
  }
  await prisma.expense.deleteMany({ where: { schoolId: SCHOOL_ID } });
  await prisma.expense.createMany({ data: rows.map((r) => ({ schoolId: SCHOOL_ID, category: r.category, description: r.description, amount: Math.max(1000, r.amount), spentAt: r.spentAt, recordedBy: "Mr. Chuka Obi" })) });

  const expTotal = rows.reduce((t, r) => t + Math.max(1000, r.amount), 0);
  console.log(`✔ finance rebalanced — collected ₦${collected.toLocaleString()} (+${newPays.length} top-up payments), expenses ₦${expTotal.toLocaleString()} (${rows.length} across ${months.length} months). Net surplus ≈ ₦${(collected - expTotal).toLocaleString()}.`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
