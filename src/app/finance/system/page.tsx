import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { canView, canManage } from "@/lib/auth/permissions";
import { SectionTitle } from "@/components/ui/primitives";
import { FinancialSystem, type PaymentRow, type ExpenseRow } from "@/components/finance/FinancialSystem";
import { detectTerm, TERM_LABEL, type TermKey } from "@/lib/terms";

export const metadata = { title: "Financial System · Klaska" };

// Flow 4, live: fees in − expenses out = net, from the school's real records.
export default async function Page() {
  const user = await requireUser();
  if (!canView(user.role, "financial")) redirect("/");

  const school = await prisma.school.findUnique({ where: { id: user.schoolId }, select: { name: true, session: true, term: true } });
  const termFilter = school?.session && school.term ? { session: school.session, term: school.term } : {};

  const [invoiceAgg, payments, expenses] = await Promise.all([
    prisma.invoice.aggregate({ where: { schoolId: user.schoolId, ...termFilter }, _sum: { total: true } }),
    prisma.payment.findMany({ where: { schoolId: user.schoolId }, include: { student: true }, orderBy: { paidAt: "desc" }, take: 200 }),
    prisma.expense.findMany({ where: { schoolId: user.schoolId }, orderBy: { spentAt: "desc" }, take: 200 }),
  ]);

  const invoiced = invoiceAgg._sum.total ?? 0;
  const collected = payments.reduce((t, p) => t + p.amount, 0);
  const expensesTotal = expenses.reduce((t, e) => t + e.amount, 0);
  const summary = { invoiced, collected, outstanding: Math.max(0, invoiced - collected), expensesTotal, net: collected - expensesTotal };

  const payRows: PaymentRow[] = payments.map((p) => ({
    id: p.id,
    when: p.paidAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
    student: `${p.student.firstName} ${p.student.lastName}`,
    amount: p.amount,
    method: p.method,
    reference: p.reference ?? "",
  }));
  const expRows: ExpenseRow[] = expenses.map((e) => ({
    id: e.id,
    when: e.spentAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
    category: e.category,
    description: e.description ?? "",
    amount: e.amount,
  }));

  const fallback = detectTerm();
  const termKey = (school?.term as TermKey) || fallback.term;

  return (
    <div className="mx-auto max-w-[1200px]">
      <SectionTitle
        eyebrow="Finance"
        title="Financial System"
        sub="Revenue in, expenses out, net position — computed live from your records."
      />
      <FinancialSystem
        meta={{ school: school?.name || "Your school", session: school?.session || fallback.session, termLabel: TERM_LABEL[termKey] }}
        summary={summary}
        payments={payRows}
        expenses={expRows}
        canEdit={canManage(user.role, "financial")}
      />
    </div>
  );
}
