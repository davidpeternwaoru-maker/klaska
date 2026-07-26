import "server-only";

// Finance — single source of truth for money: invoices, payments, expenses, and
// the computed view-models for the Fees Collection and Financial OS screens.
// Balance is always total − payments (computed, never stored). Only Owner and
// Bursar can touch money (Permission Matrix: fees / financial).

import { prisma } from "@/lib/db";
import { canManage, canView } from "@/lib/auth/permissions";
import { detectTerm, TERM_LABEL, type TermKey } from "@/lib/terms";
import { type Ctx, ServiceError } from "@/server/context";
import { logAudit } from "@/server/services/audit";
import type { FeeRow, ClassStat, FeeKpis } from "@/components/finance/FeesCollection";
import type { MonthPoint, CostSlice, LevelRevenue, ExpenseRow, PayRow, Hero, PayrollInfo } from "@/components/finance/FinancialOS";

const ngn = (n: number) => "₦" + n.toLocaleString("en-NG");
const classLabel = (c: { name: string; arm: string | null }) => (c.arm ? `${c.name} ${c.arm}` : c.name);
const EXPENSE_CATEGORIES = ["SALARIES", "RENT", "UTILITIES", "SUPPLIES", "TRANSPORT", "MAINTENANCE", "OTHER"];

export type FeesView = {
  meta: { school: string; session: string; termLabel: string };
  rows: FeeRow[];
  classStats: ClassStat[];
  kpis: FeeKpis;
  classRange: string;
  termEndsWeeks: number | null;
  feeMode: string;
  canManage: boolean;
};

export type FinancialView = {
  meta: { school: string; session: string; termLabel: string };
  hero: Hero;
  months: MonthPoint[];
  slices: CostSlice[];
  monthName: string;
  levels: LevelRevenue[];
  payroll: PayrollInfo;
  expenses: ExpenseRow[];
  payments: PayRow[];
  canEdit: boolean;
};

export const financeService = {
  // ── writes ────────────────────────────────────────────────────────────────
  /** Generate this term's invoices for students whose class has a fee structure
   *  and who don't already have a bill for the current term. Returns count. */
  async generateInvoices(ctx: Ctx): Promise<number> {
    if (!canManage(ctx.role, "fees")) throw new ServiceError("Only the owner or bursar can generate invoices.");
    const school = await prisma.school.findUnique({ where: { id: ctx.schoolId }, select: { session: true, term: true } });
    if (!school?.session || !school.term) throw new ServiceError("Set your session & term in Settings first.", "INVALID");

    const [students, feeItems, classFees, existing] = await Promise.all([
      prisma.student.findMany({ where: { schoolId: ctx.schoolId, classId: { not: null } }, select: { id: true, classId: true } }),
      prisma.feeItem.findMany({ where: { schoolId: ctx.schoolId }, orderBy: { order: "asc" } }),
      prisma.classFee.findMany({ where: { schoolId: ctx.schoolId } }),
      prisma.invoice.findMany({ where: { schoolId: ctx.schoolId, session: school.session, term: school.term }, select: { studentId: true } }),
    ]);

    const feeName = new Map(feeItems.map((f) => [f.id, f.name]));
    const linesByClass = new Map<string, { description: string; amount: number }[]>();
    for (const cf of classFees) {
      if (cf.amount <= 0) continue;
      const arr = linesByClass.get(cf.classId) ?? [];
      arr.push({ description: feeName.get(cf.feeItemId) ?? "Fee", amount: cf.amount });
      linesByClass.set(cf.classId, arr);
    }
    const already = new Set(existing.map((e) => e.studentId));

    let created = 0;
    for (const s of students) {
      if (already.has(s.id)) continue;
      const lines = linesByClass.get(s.classId!) ?? [];
      if (lines.length === 0) continue;
      const total = lines.reduce((t, l) => t + l.amount, 0);
      await prisma.invoice.create({ data: { schoolId: ctx.schoolId, studentId: s.id, session: school.session, term: school.term, total, lines: { create: lines } } });
      created++;
    }
    if (created === 0) throw new ServiceError("No new invoices to create — everyone is billed (or classes have no fees set).", "INVALID");
    return created;
  },

  async recordPayment(ctx: Ctx, input: { invoiceId: string; amount: number; method: string; reference?: string | null }): Promise<void> {
    if (!canManage(ctx.role, "fees")) throw new ServiceError("Only the owner or bursar can record payments.");
    const amount = Math.round(input.amount || 0);
    if (!input.invoiceId) throw new ServiceError("Missing invoice.", "INVALID");
    if (amount <= 0) throw new ServiceError("Enter an amount greater than zero.", "INVALID");
    if (!["CASH", "TRANSFER", "POS"].includes(input.method)) throw new ServiceError("Pick a payment method.", "INVALID");
    const invoice = await prisma.invoice.findFirst({ where: { id: input.invoiceId, schoolId: ctx.schoolId } });
    if (!invoice) throw new ServiceError("Invoice not found.", "NOT_FOUND");
    const payment = await prisma.payment.create({
      data: { schoolId: ctx.schoolId, studentId: invoice.studentId, invoiceId: input.invoiceId, amount, method: input.method, reference: input.reference?.trim() || null, recordedBy: ctx.name },
    });
    await logAudit({ action: "FEE_PAYMENT", schoolId: ctx.schoolId, actorId: ctx.staffId, actorEmail: ctx.email, target: payment.id, meta: { amount, method: input.method, invoiceId: input.invoiceId } });
  },

  async deletePayment(ctx: Ctx, id: string): Promise<void> {
    if (!canManage(ctx.role, "fees")) throw new ServiceError("Only the owner or bursar can delete payments.");
    if (id) await prisma.payment.deleteMany({ where: { id, schoolId: ctx.schoolId } });
  },

  /** Staff payroll (gross monthly salaries) — Owner/Bursar only. */
  async payroll(ctx: Ctx): Promise<{ school: string; session: string; termLabel: string; rows: { name: string; role: string; title: string | null; gross: number }[] }> {
    if (!canView(ctx.role, "financial")) throw new ServiceError("Only the owner or bursar can view payroll.");
    const fallback = detectTerm();
    const [school, staff] = await Promise.all([
      prisma.school.findUnique({ where: { id: ctx.schoolId }, select: { name: true, session: true, term: true } }),
      prisma.staff.findMany({ where: { schoolId: ctx.schoolId }, orderBy: { name: "asc" }, select: { name: true, role: true, title: true, salaryMonthly: true } }),
    ]);
    await logAudit({ action: "DATA_EXPORT", schoolId: ctx.schoolId, actorId: ctx.staffId, actorEmail: ctx.email, target: "payroll", meta: { rows: staff.length } });
    return {
      school: school?.name ?? "Your school",
      session: school?.session ?? fallback.session,
      termLabel: TERM_LABEL[(school?.term as TermKey) || fallback.term],
      rows: staff.map((s) => ({ name: s.name, role: s.role, title: s.title, gross: s.salaryMonthly ?? 0 })),
    };
  },

  async addExpense(ctx: Ctx, input: { category: string; description?: string | null; amount: number; spentAt?: string | null }): Promise<void> {
    if (!canManage(ctx.role, "financial")) throw new ServiceError("Only the owner or bursar can record expenses.");
    const category = input.category || "OTHER";
    const amount = Math.round(input.amount || 0);
    if (!EXPENSE_CATEGORIES.includes(category)) throw new ServiceError("Pick a category.", "INVALID");
    if (amount <= 0) throw new ServiceError("Enter an amount greater than zero.", "INVALID");
    await prisma.expense.create({
      data: { schoolId: ctx.schoolId, category, description: input.description?.trim() || null, amount, spentAt: input.spentAt ? new Date(input.spentAt) : new Date(), recordedBy: ctx.name },
    });
  },

  async deleteExpense(ctx: Ctx, id: string): Promise<void> {
    if (!canManage(ctx.role, "financial")) throw new ServiceError("Only the owner or bursar can delete expenses.");
    if (id) await prisma.expense.deleteMany({ where: { id, schoolId: ctx.schoolId } });
  },

  // ── reads (view-models) ─────────────────────────────────────────────────────
  async feesView(ctx: Ctx): Promise<FeesView> {
    const school = await prisma.school.findUnique({ where: { id: ctx.schoolId }, select: { name: true, session: true, term: true, termEnd: true, feeCollection: true } });
    const fallback = detectTerm();
    const termKey = (school?.term as TermKey) || fallback.term;

    const [classes, invoices] = await Promise.all([
      prisma.class.findMany({ where: { schoolId: ctx.schoolId }, orderBy: [{ name: "asc" }, { arm: "asc" }] }),
      school?.session && school.term
        ? prisma.invoice.findMany({
            where: { schoolId: ctx.schoolId, session: school.session, term: school.term },
            include: { student: { include: { class: true } }, payments: { orderBy: { paidAt: "desc" } } },
            orderBy: { createdAt: "asc" },
          })
        : Promise.resolve([]),
    ]);

    const rows: FeeRow[] = invoices.map((inv) => ({
      id: inv.id,
      studentId: inv.studentId,
      student: `${inv.student.firstName} ${inv.student.lastName}`,
      admissionNo: inv.student.admissionNo,
      className: inv.student.class ? classLabel(inv.student.class) : null,
      total: inv.total,
      paid: inv.payments.reduce((t, p) => t + p.amount, 0),
      payments: inv.payments.map((p) => ({ id: p.id, amount: p.amount, method: p.method, reference: p.reference, when: p.paidAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) })),
    }));

    const invoiced = rows.reduce((t, r) => t + r.total, 0);
    const collected = rows.reduce((t, r) => t + Math.min(r.paid, r.total), 0);
    const fullyPaidRows = invoices.filter((inv) => inv.payments.reduce((t, p) => t + p.amount, 0) >= inv.total);
    const payTimes = fullyPaidRows
      .map((inv) => {
        const last = inv.payments.reduce((m, p) => (p.paidAt > m ? p.paidAt : m), inv.createdAt);
        return Math.max(0, Math.round((last.getTime() - inv.createdAt.getTime()) / 86_400_000));
      })
      .filter((d) => d >= 0);
    const kpis: FeeKpis = {
      collected,
      invoiced,
      pctCollected: invoiced ? Math.round((collected / invoiced) * 100) : 0,
      outstanding: Math.max(0, invoiced - collected),
      owingCount: rows.filter((r) => r.paid < r.total).length,
      fullyPaid: fullyPaidRows.length,
      fullyPaidPct: rows.length ? Math.round((fullyPaidRows.length / rows.length) * 100) : 0,
      avgDays: payTimes.length ? Math.round(payTimes.reduce((t, d) => t + d, 0) / payTimes.length) : null,
    };

    const byClass = new Map<string, { expected: number; collected: number }>();
    for (const r of rows) {
      const key = r.className ?? "Unassigned";
      const e = byClass.get(key) ?? { expected: 0, collected: 0 };
      e.expected += r.total;
      e.collected += Math.min(r.paid, r.total);
      byClass.set(key, e);
    }
    const orderedLabels = classes.map(classLabel).filter((l) => byClass.has(l));
    if (byClass.has("Unassigned")) orderedLabels.push("Unassigned");
    const classStats: ClassStat[] = orderedLabels.map((label) => {
      const v = byClass.get(label)!;
      return { label, expected: v.expected, collected: v.collected, pct: v.expected ? Math.round((v.collected / v.expected) * 100) : 0 };
    });

    const classRange =
      classes.length === 0 ? "your classes" : classes.length === 1 ? classLabel(classes[0]) : `${classes[0].name} – ${classes[classes.length - 1].name}`;
    const termEndsWeeks = school?.termEnd ? Math.max(0, Math.round((school.termEnd.getTime() - Date.now()) / (7 * 86_400_000))) : null;

    return {
      meta: { school: school?.name || "Your school", session: school?.session || fallback.session, termLabel: TERM_LABEL[termKey] },
      rows,
      classStats,
      kpis,
      classRange,
      termEndsWeeks,
      feeMode: school?.feeCollection ?? "MANUAL",
      canManage: canManage(ctx.role, "fees"),
    };
  },

  async financialView(ctx: Ctx): Promise<FinancialView> {
    const school = await prisma.school.findUnique({ where: { id: ctx.schoolId }, select: { name: true, session: true, term: true, termStart: true, termEnd: true } });
    const fallback = detectTerm();
    const termKey = (school?.term as TermKey) || fallback.term;
    const termStart = school?.termStart ?? fallback.termStart;

    const [payments, expenses, staff] = await Promise.all([
      prisma.payment.findMany({ where: { schoolId: ctx.schoolId }, include: { student: { include: { class: true } } }, orderBy: { paidAt: "desc" }, take: 500 }),
      prisma.expense.findMany({ where: { schoolId: ctx.schoolId }, orderBy: { spentAt: "desc" }, take: 500 }),
      prisma.staff.findMany({ where: { schoolId: ctx.schoolId }, select: { role: true } }),
    ]);

    const now = new Date();
    const inTerm = (d: Date) => d >= termStart;
    const revenueTerm = payments.filter((p) => inTerm(p.paidAt)).reduce((t, p) => t + p.amount, 0);
    const costsTerm = expenses.filter((e) => inTerm(e.spentAt)).reduce((t, e) => t + e.amount, 0);
    const net = revenueTerm - costsTerm;
    const collectedAll = payments.reduce((t, p) => t + p.amount, 0);
    const expensesAll = expenses.reduce((t, e) => t + e.amount, 0);
    const ago = (d: Date) => {
      const mins = Math.max(0, Math.round((now.getTime() - d.getTime()) / 60000));
      if (mins < 60) return `${mins} min ago`;
      const hrs = Math.round(mins / 60);
      if (hrs < 24) return `${hrs} hr ago`;
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    };
    const lastPay = payments[0];
    const lastExp = expenses[0];
    const hero: Hero = {
      revenueTerm,
      costsTerm,
      net,
      margin: revenueTerm ? Math.round((net / revenueTerm) * 100) : 0,
      cash: collectedAll - expensesAll,
      lastPayment: lastPay ? `${ago(lastPay.paidAt)} · ${ngn(lastPay.amount)} from ${lastPay.student.firstName} ${lastPay.student.lastName}` : null,
      lastExpense: lastExp ? `${ago(lastExp.spentAt)} · ${lastExp.description || lastExp.category.toLowerCase()}` : null,
    };

    const months: MonthPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      months.push({
        label: d.toLocaleDateString("en-GB", { month: "short" }),
        revenue: payments.filter((p) => p.paidAt >= d && p.paidAt < next).reduce((t, p) => t + p.amount, 0),
        cost: expenses.filter((e) => e.spentAt >= d && e.spentAt < next).reduce((t, e) => t + e.amount, 0),
      });
    }

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sliceMap = new Map<string, number>();
    for (const e of expenses.filter((e) => e.spentAt >= monthStart)) sliceMap.set(e.category, (sliceMap.get(e.category) ?? 0) + e.amount);
    const slices: CostSlice[] = [...sliceMap.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
    const monthName = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

    const levelMap = new Map<string, number>();
    for (const p of payments.filter((p) => inTerm(p.paidAt))) {
      const lvl = p.student.class?.name ?? "Unassigned";
      levelMap.set(lvl, (levelMap.get(lvl) ?? 0) + p.amount);
    }
    const levels: LevelRevenue[] = [...levelMap.entries()].map(([label, amount]) => ({ label, amount }));

    const teaching = staff.filter((s) => s.role === "TEACHER" || s.role === "HOD").length;
    const payroll: PayrollInfo = {
      teaching,
      nonTeaching: staff.length - teaching,
      totalStaff: staff.length,
      salariesThisMonth: expenses.filter((e) => e.spentAt >= monthStart && e.category === "SALARIES").reduce((t, e) => t + e.amount, 0),
      monthLabel: now.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
    };

    const expenseRows: ExpenseRow[] = expenses.map((e, i) => ({
      id: e.id,
      date: e.spentAt.toISOString().slice(0, 10),
      ref: `EX-${String(expenses.length - i).padStart(4, "0")}`,
      category: e.category,
      description: e.description ?? "",
      amount: e.amount,
    }));
    const payRows: PayRow[] = payments.map((p) => ({
      when: p.paidAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      student: `${p.student.firstName} ${p.student.lastName}`,
      amount: p.amount,
      method: p.method,
      reference: p.reference ?? "",
    }));

    return {
      meta: { school: school?.name || "Your school", session: school?.session || fallback.session, termLabel: TERM_LABEL[termKey] },
      hero,
      months,
      slices,
      monthName,
      levels,
      payroll,
      expenses: expenseRows,
      payments: payRows,
      canEdit: canManage(ctx.role, "financial"),
    };
  },
};
