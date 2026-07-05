import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { canView, canManage } from "@/lib/auth/permissions";
import { FeesCollection, type FeeRow, type ClassStat, type FeeKpis } from "@/components/finance/FeesCollection";
import { detectTerm, TERM_LABEL, type TermKey } from "@/lib/terms";

export const metadata = { title: "Fees collection · Klaska" };

export default async function Page() {
  const user = await requireUser();
  if (!canView(user.role, "fees")) redirect("/"); // teachers never see money

  const school = await prisma.school.findUnique({
    where: { id: user.schoolId },
    select: { name: true, session: true, term: true, termEnd: true, feeCollection: true },
  });
  const fallback = detectTerm();
  const termKey = (school?.term as TermKey) || fallback.term;

  const [classes, invoices] = await Promise.all([
    prisma.class.findMany({ where: { schoolId: user.schoolId }, orderBy: [{ name: "asc" }, { arm: "asc" }] }),
    school?.session && school.term
      ? prisma.invoice.findMany({
          where: { schoolId: user.schoolId, session: school.session, term: school.term },
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
    className: inv.student.class ? (inv.student.class.arm ? `${inv.student.class.name} ${inv.student.class.arm}` : inv.student.class.name) : null,
    total: inv.total,
    paid: inv.payments.reduce((t, p) => t + p.amount, 0),
    payments: inv.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      method: p.method,
      reference: p.reference,
      when: p.paidAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
    })),
  }));

  // KPIs
  const invoiced = rows.reduce((t, r) => t + r.total, 0);
  const collected = rows.reduce((t, r) => t + Math.min(r.paid, r.total), 0);
  const fullyPaidRows = invoices.filter((inv) => inv.payments.reduce((t, p) => t + p.amount, 0) >= inv.total);
  // avg days from invoice creation to the payment that completed it
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

  // collection rate per class (in class order)
  const byClass = new Map<string, { expected: number; collected: number }>();
  for (const r of rows) {
    const key = r.className ?? "Unassigned";
    const e = byClass.get(key) ?? { expected: 0, collected: 0 };
    e.expected += r.total;
    e.collected += Math.min(r.paid, r.total);
    byClass.set(key, e);
  }
  const classLabel = (c: (typeof classes)[number]) => (c.arm ? `${c.name} ${c.arm}` : c.name);
  const orderedLabels = classes.map(classLabel).filter((l) => byClass.has(l));
  if (byClass.has("Unassigned")) orderedLabels.push("Unassigned");
  const classStats: ClassStat[] = orderedLabels.map((label) => {
    const v = byClass.get(label)!;
    return { label, expected: v.expected, collected: v.collected, pct: v.expected ? Math.round((v.collected / v.expected) * 100) : 0 };
  });

  // "across JSS 1 – SSS 3" style range from their real classes
  const classRange =
    classes.length === 0
      ? "your classes"
      : classes.length === 1
        ? classLabel(classes[0])
        : `${classes[0].name} – ${classes[classes.length - 1].name}`;

  const termEndsWeeks = school?.termEnd
    ? Math.max(0, Math.round((school.termEnd.getTime() - Date.now()) / (7 * 86_400_000)))
    : null;

  return (
    <FeesCollection
      meta={{ school: school?.name || "Your school", session: school?.session || fallback.session, termLabel: TERM_LABEL[termKey] }}
      rows={rows}
      classStats={classStats}
      kpis={kpis}
      classRange={classRange}
      termEndsWeeks={termEndsWeeks}
      feeMode={school?.feeCollection ?? "MANUAL"}
      canManage={canManage(user.role, "fees")}
    />
  );
}
