import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { canView, canManage } from "@/lib/auth/permissions";
import { FinancialOS, type MonthPoint, type CostSlice, type LevelRevenue, type ExpenseRow, type PayRow, type Hero, type PayrollInfo } from "@/components/finance/FinancialOS";
import { detectTerm, TERM_LABEL, type TermKey } from "@/lib/terms";

export const metadata = { title: "Financial System · Klaska" };

const ngn = (n: number) => "₦" + n.toLocaleString("en-NG");

// The Financial Operating System — everything computed live from records.
export default async function Page() {
  const user = await requireUser();
  if (!canView(user.role, "financial")) redirect("/");

  const school = await prisma.school.findUnique({
    where: { id: user.schoolId },
    select: { name: true, session: true, term: true, termStart: true, termEnd: true },
  });
  const fallback = detectTerm();
  const termKey = (school?.term as TermKey) || fallback.term;
  const termStart = school?.termStart ?? fallback.termStart;

  const [payments, expenses, staff] = await Promise.all([
    prisma.payment.findMany({ where: { schoolId: user.schoolId }, include: { student: { include: { class: true } } }, orderBy: { paidAt: "desc" }, take: 500 }),
    prisma.expense.findMany({ where: { schoolId: user.schoolId }, orderBy: { spentAt: "desc" }, take: 500 }),
    prisma.staff.findMany({ where: { schoolId: user.schoolId }, select: { role: true } }),
  ]);

  const now = new Date();

  // ---- hero (term window) ----
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

  // ---- last 6 months revenue/cost ----
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

  // ---- cost breakdown, current month ----
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sliceMap = new Map<string, number>();
  for (const e of expenses.filter((e) => e.spentAt >= monthStart)) {
    sliceMap.set(e.category, (sliceMap.get(e.category) ?? 0) + e.amount);
  }
  const slices: CostSlice[] = [...sliceMap.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  const monthName = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  // ---- revenue by class level (this term) ----
  const levelMap = new Map<string, number>();
  for (const p of payments.filter((p) => inTerm(p.paidAt))) {
    const lvl = p.student.class?.name ?? "Unassigned";
    levelMap.set(lvl, (levelMap.get(lvl) ?? 0) + p.amount);
  }
  const levels: LevelRevenue[] = [...levelMap.entries()].map(([label, amount]) => ({ label, amount }));

  // ---- payroll snapshot from records ----
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

  return (
    <FinancialOS
      meta={{ school: school?.name || "Your school", session: school?.session || fallback.session, termLabel: TERM_LABEL[termKey] }}
      hero={hero}
      months={months}
      slices={slices}
      monthName={monthName}
      levels={levels}
      payroll={payroll}
      expenses={expenseRows}
      payments={payRows}
      canEdit={canManage(user.role, "financial")}
    />
  );
}
