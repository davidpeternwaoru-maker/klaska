"use client";

import { useMemo, useState } from "react";
import { Card, SectionTitle, Pill, Button, SegTabs } from "@/components/ui/primitives";
import { KPI } from "@/components/ui/KPI";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { feesSummary } from "@/data/finance";
import { niceClass, type FeeStatus } from "@/data/people";
import { ngn, ngnCompact } from "@/data/overview";

const FEE_TONE: Record<FeeStatus, "green" | "amber" | "red"> = { paid: "green", partial: "amber", unpaid: "red" };

function exportCSV(students: ReturnType<typeof feesSummary>["students"]) {
  const rows = [["Student", "Class", "Term fee", "Paid", "Balance", "Status"]];
  students.forEach((s) => rows.push([s.name, niceClass(s), String(s.termFee), String(s.paid), String(s.termFee - s.paid), s.feeStatus]));
  const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "klaska-fees.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function FeesPage() {
  const d = useMemo(() => feesSummary(), []);
  const [tab, setTab] = useState("all");
  const pct = Math.round((d.collected / d.expected) * 100);
  const fullyPaid = d.students.filter((s) => s.feeStatus === "paid").length;

  const rows = useMemo(
    () => d.students.map((s) => ({ s, bal: s.termFee - s.paid })).filter((r) => (tab === "all" ? true : tab === "defaulters" ? r.bal > 0 : r.s.feeStatus === tab)).slice(0, 60),
    [d.students, tab],
  );

  return (
    <div className="mx-auto max-w-[1320px]">
      <SectionTitle
        eyebrow="Fees & Payments"
        title="Fees collection"
        sub="Term fee status for every student across Crèche – SSS 3."
        right={
          <>
            <Button kind="ghost" size="sm" icon="download" onClick={() => exportCSV(d.students)}>
              Export to Excel
            </Button>
            <Button kind="ghost" size="sm" icon="bell">
              Send pay link
            </Button>
            <Button kind="primary" size="sm" icon="plus">
              Record payment
            </Button>
          </>
        }
      />

      {/* automatic collection banner */}
      <Card className="mb-5 flex flex-wrap items-center gap-4">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[12px] bg-secondary text-ink-3">
          <Icon name="card" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-ink">Automatic collection — virtual accounts</span>
            <Pill tone="green">
              <span className="mr-0.5 inline-block h-1.5 w-1.5 rounded-full bg-green" /> Instant match
            </Pill>
          </div>
          <div className="text-[12.5px] text-ink-4">Each student has a dedicated virtual account. Payments match and reflect instantly — receipt generated on the spot.</div>
        </div>
        <a href="/settings" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-forest hover:underline">
          Change in Settings <Icon name="arrowR" size={14} />
        </a>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPI label="Collected this term" value={ngnCompact(d.collected)} delta={`${pct}% of total`} deltaTone="green" sub="" icon="card" />
        <KPI label="Outstanding" value={ngnCompact(d.outstanding)} delta={`${d.defaulters.length} students`} deltaTone="amber" sub="" icon="clock" />
        <KPI label="Fully paid" value={String(fullyPaid)} delta={`${Math.round((fullyPaid / d.students.length) * 100)}% of school`} deltaTone="green" sub="" icon="check" />
        <KPI label="Avg time to pay" value="11 days" delta="-2 days vs last term" deltaTone="green" sub="" icon="trend" />
      </div>

      {/* collection rate by class */}
      <Card className="mt-5">
        <div className="mb-5 flex items-center justify-between">
          <span className="font-display text-[15px] font-semibold text-ink">Collection rate by class</span>
          <Pill tone="amber">Term ends in 4 weeks</Pill>
        </div>
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
          {d.byClass.map((c) => (
            <div key={c.klass}>
              <div className="mb-1.5 text-[13px] font-semibold text-ink">{c.klass}</div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${c.rate}%`, background: c.rate >= 80 ? "var(--color-forest)" : "var(--color-amber)" }} />
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-[13px] font-semibold text-ink">{c.rate}%</span>
                <span className="text-[12px] text-ink-4">{ngnCompact(c.paid)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* student fee table */}
      <Card pad={0} className="mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="text-[14px] font-semibold text-ink">Student fee status</div>
          <SegTabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "all", label: "All" },
              { value: "paid", label: "Paid" },
              { value: "partial", label: "Partial" },
              { value: "unpaid", label: "Unpaid" },
              { value: "defaulters", label: `Defaulters (${d.defaulters.length})` },
            ]}
          />
        </div>
        <div className="max-h-[58vh] overflow-y-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead className="sticky top-0 bg-card">
              <tr className="text-[11px] uppercase tracking-[0.05em] text-ink-4">
                <th className="px-4 py-2.5 text-left font-medium">Student</th>
                <th className="px-4 py-2.5 text-left font-medium">Class</th>
                <th className="px-4 py-2.5 text-right font-medium">Paid</th>
                <th className="px-4 py-2.5 text-right font-medium">Balance</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ s, bal }) => (
                <tr key={s.id} className="border-t border-border transition-colors hover:bg-secondary/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={s.name} hue={s.hue} size={28} />
                      <span className="font-medium text-ink">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-3">{niceClass(s)}</td>
                  <td className="px-4 py-3 text-right font-medium text-ink">{ngn(s.paid)}</td>
                  <td className="px-4 py-3 text-right" style={{ color: bal > 0 ? "var(--color-red)" : "var(--color-forest)" }}>
                    {ngn(bal)}
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={FEE_TONE[s.feeStatus]}>{s.feeStatus}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
