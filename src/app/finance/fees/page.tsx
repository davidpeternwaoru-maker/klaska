import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { canView, canManage } from "@/lib/auth/permissions";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { FinanceCenter, type InvoiceRow } from "@/components/finance/FinanceCenter";
import { TERM_LABEL, type TermKey } from "@/lib/terms";

const ngn = (n: number) => "₦" + n.toLocaleString("en-NG");

export default async function Page() {
  const user = await requireUser();
  if (!canView(user.role, "fees")) redirect("/"); // teachers never see money

  const school = await prisma.school.findUnique({ where: { id: user.schoolId }, select: { session: true, term: true } });
  const termLabel = school?.term ? `${TERM_LABEL[school.term as TermKey]} · ${school?.session ?? ""}` : "current term";

  const [classes, feeItems, classFees, invoices] = await Promise.all([
    prisma.class.findMany({ where: { schoolId: user.schoolId }, orderBy: [{ name: "asc" }, { arm: "asc" }] }),
    prisma.feeItem.findMany({ where: { schoolId: user.schoolId }, orderBy: { order: "asc" } }),
    prisma.classFee.findMany({ where: { schoolId: user.schoolId } }),
    school?.session && school.term
      ? prisma.invoice.findMany({
          where: { schoolId: user.schoolId, session: school.session, term: school.term },
          include: { student: { include: { class: true } }, payments: { orderBy: { paidAt: "desc" } } },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const rows: InvoiceRow[] = invoices.map((inv) => ({
    id: inv.id,
    student: `${inv.student.firstName} ${inv.student.lastName}`,
    className: inv.student.class ? (inv.student.class.arm ? `${inv.student.class.name} ${inv.student.class.arm}` : inv.student.class.name) : null,
    total: inv.total,
    paid: inv.payments.reduce((t, p) => t + p.amount, 0),
    payments: inv.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      method: p.method,
      reference: p.reference,
      when: p.paidAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      by: p.recordedBy,
    })),
  }));

  // fee structure grid data
  const amounts: Record<string, Record<string, number>> = {};
  for (const cf of classFees) (amounts[cf.feeItemId] = amounts[cf.feeItemId] || {})[cf.classId] = cf.amount;
  const classLabel = (c: (typeof classes)[number]) => (c.arm ? `${c.name} ${c.arm}` : c.name);
  const rowTotal = (classId: string) => feeItems.reduce((s, it) => s + (amounts[it.id]?.[classId] ?? 0), 0);

  return (
    <div className="mx-auto max-w-[1320px]">
      <SectionTitle
        eyebrow="Finance"
        title="Fees & Payments"
        sub={`Bills, payments and balances for ${termLabel}.`}
        right={
          canManage(user.role, "fees") ? (
            <Link href="/settings" className="inline-flex items-center gap-1.5 rounded-[10px] border border-border px-3.5 py-2 text-[13px] font-medium text-ink-2 transition hover:bg-secondary">
              <Icon name="edit" size={15} /> Edit fee structure
            </Link>
          ) : undefined
        }
      />

      <FinanceCenter rows={rows} canManageMoney={canManage(user.role, "fees")} termLabel={termLabel} />

      {/* fee structure reference */}
      {feeItems.length > 0 && classes.length > 0 && (
        <Card pad={0} className="mt-6 overflow-hidden">
          <div className="p-4 text-[14px] font-semibold text-ink">Fee structure (per class, per term)</div>
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border bg-secondary text-[11px] uppercase tracking-wide text-ink-4">
                  <th className="sticky left-0 z-10 bg-secondary px-4 py-2.5 text-left font-medium">Class</th>
                  {feeItems.map((it) => (
                    <th key={it.id} className="px-3 py-2.5 text-right font-medium">{it.name}</th>
                  ))}
                  <th className="px-4 py-2.5 text-right font-medium">Term total</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                    <td className="sticky left-0 z-10 bg-card px-4 py-2.5 font-medium text-ink">{classLabel(c)}</td>
                    {feeItems.map((it) => {
                      const v = amounts[it.id]?.[c.id] ?? 0;
                      return <td key={it.id} className="px-3 py-2.5 text-right text-ink-3">{v ? ngn(v) : "—"}</td>;
                    })}
                    <td className="px-4 py-2.5 text-right font-semibold text-ink">{ngn(rowTotal(c.id))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
