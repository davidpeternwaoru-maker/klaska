import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, SectionTitle, Pill } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

const ngn = (n: number) => "₦" + n.toLocaleString("en-NG");

export default async function Page() {
  const user = await requireUser();
  const [classes, feeItems, classFees] = await Promise.all([
    prisma.class.findMany({ where: { schoolId: user.schoolId }, orderBy: [{ name: "asc" }, { arm: "asc" }] }),
    prisma.feeItem.findMany({ where: { schoolId: user.schoolId }, orderBy: { order: "asc" } }),
    prisma.classFee.findMany({ where: { schoolId: user.schoolId } }),
  ]);

  // amounts[feeItemId][classId] = amount
  const amounts: Record<string, Record<string, number>> = {};
  for (const cf of classFees) (amounts[cf.feeItemId] = amounts[cf.feeItemId] || {})[cf.classId] = cf.amount;
  const classLabel = (c: (typeof classes)[number]) => (c.arm ? `${c.name} ${c.arm}` : c.name);
  const rowTotal = (classId: string) => feeItems.reduce((s, it) => s + (amounts[it.id]?.[classId] ?? 0), 0);
  const grand = classes.reduce((s, c) => s + rowTotal(c.id), 0);

  return (
    <div className="mx-auto max-w-[1320px]">
      <SectionTitle
        eyebrow="Finance"
        title="Fees"
        sub="Your fee structure — the amount charged per class, per term."
        right={
          <Link href="/dashboard/settings" className="inline-flex items-center gap-1.5 rounded-[10px] border border-border px-3.5 py-2 text-[13px] font-medium text-ink-2 transition hover:bg-secondary">
            <Icon name="edit" size={15} /> Edit fees
          </Link>
        }
      />

      {feeItems.length === 0 || classes.length === 0 ? (
        <Card className="text-center text-[13px] text-ink-4">
          No fee structure yet.{" "}
          <Link href="/dashboard/settings" className="font-medium text-forest hover:underline">Set up your fees</Link> (or in the onboarding wizard).
        </Card>
      ) : (
        <Card pad={0} className="overflow-hidden">
          <div className="overflow-x-auto">
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
                      return (
                        <td key={it.id} className="px-3 py-2.5 text-right text-ink-3">{v ? ngn(v) : "—"}</td>
                      );
                    })}
                    <td className="px-4 py-2.5 text-right font-semibold text-ink">{ngn(rowTotal(c.id))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-[12.5px] text-ink-4">{feeItems.length} fee types across {classes.length} classes</span>
            <span className="text-[13px] text-ink-3">All classes combined: <b className="text-ink">{ngn(grand)}</b></span>
          </div>
        </Card>
      )}
    </div>
  );
}
