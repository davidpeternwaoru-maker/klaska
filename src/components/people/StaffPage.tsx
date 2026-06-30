"use client";

import { useState } from "react";
import { Card, SectionTitle, Pill, Button } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { STAFF, PAYROLL_SUMMARY, payrollFor, type Role } from "@/data/people";
import { ngn, ngnCompact } from "@/data/overview";

const ROLE_TONE: Record<Role, "forest" | "blue" | "amber" | "neutral"> = {
  Owner: "forest",
  Principal: "forest",
  Bursar: "blue",
  HOD: "amber",
  Teacher: "neutral",
  Admin: "neutral",
};

export function StaffPage() {
  const [tab, setTab] = useState<"directory" | "payroll">("directory");

  return (
    <div className="mx-auto max-w-[1320px]">
      <SectionTitle
        eyebrow="People"
        title="Staff & Payroll"
        sub="Your team, their roles, and a monthly payroll summary."
        right={
          <Button kind="primary" size="sm" icon="plus">
            Add staff
          </Button>
        }
      />

      <div className="mb-5 inline-flex gap-0.5 rounded-[10px] bg-secondary p-1">
        {(["directory", "payroll"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`h-8 rounded-[7px] px-4 text-[13px] font-medium capitalize transition ${
              tab === t ? "bg-card text-ink shadow-[0_1px_2px_rgba(20,20,18,0.06)]" : "text-ink-3 hover:text-ink"
            }`}
          >
            {t === "directory" ? "Directory" : "Payroll"}
          </button>
        ))}
      </div>

      {tab === "directory" ? <Directory /> : <Payroll />}
    </div>
  );
}

function Directory() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {STAFF.map((s) => (
        <Card key={s.id} hover className="flex items-center gap-3.5">
          <Avatar name={s.name} hue={s.hue} size={44} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-semibold text-ink">{s.name}</div>
            <div className="mt-1 flex items-center gap-2">
              <Pill tone={ROLE_TONE[s.role]}>{s.role}</Pill>
              {s.department && <span className="truncate text-[12px] text-ink-4">{s.department}</span>}
            </div>
            <div className="mt-1.5 text-[12px] text-ink-4">{s.phone}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Payroll() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <PayCard label="Monthly gross" value={ngnCompact(PAYROLL_SUMMARY.gross)} icon="wallet" />
        <PayCard label="PAYE (est.)" value={ngnCompact(PAYROLL_SUMMARY.paye)} icon="receipt" />
        <PayCard label="Pension (8%)" value={ngnCompact(PAYROLL_SUMMARY.pension)} icon="coins" />
        <PayCard label="Net pay" value={ngnCompact(PAYROLL_SUMMARY.net)} icon="finance" tone="forest" />
      </div>

      <Card pad={0} className="mt-5 overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <span className="text-[14px] font-semibold text-ink">Payroll run · {PAYROLL_SUMMARY.headcount} staff</span>
          <span className="text-[12px] text-ink-4">Rates are illustrative estimates — confirm with your accountant.</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-y border-border text-[11px] uppercase tracking-[0.05em] text-ink-4">
                <th className="px-4 py-2.5 text-left font-medium">Staff</th>
                <th className="px-4 py-2.5 text-left font-medium">Role</th>
                <th className="px-4 py-2.5 text-right font-medium">Gross</th>
                <th className="px-4 py-2.5 text-right font-medium">Pension</th>
                <th className="px-4 py-2.5 text-right font-medium">PAYE</th>
                <th className="px-4 py-2.5 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody>
              {STAFF.map((s) => {
                const p = payrollFor(s);
                return (
                  <tr key={s.id} className="border-b border-border last:border-0 transition-colors hover:bg-secondary/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={s.name} hue={s.hue} size={30} />
                        <span className="font-medium text-ink">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Pill tone={ROLE_TONE[s.role]}>{s.role}</Pill>
                    </td>
                    <td className="px-4 py-3 text-right text-ink-3">{ngn(p.gross)}</td>
                    <td className="px-4 py-3 text-right text-ink-3">{ngn(p.pension)}</td>
                    <td className="px-4 py-3 text-right text-ink-3">{ngn(p.paye)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">{ngn(p.net)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function PayCard({ label, value, icon, tone }: { label: string; value: string; icon: string; tone?: "forest" }) {
  return (
    <Card hover className="flex items-center gap-3.5">
      <span
        className="flex h-11 w-11 flex-none items-center justify-center rounded-[12px] bg-secondary"
        style={{ color: tone === "forest" ? "var(--color-forest)" : "var(--color-ink-3)" }}
      >
        <Icon name={icon} size={19} />
      </span>
      <span className="min-w-0">
        <span className="block text-[12px] font-medium text-ink-3">{label}</span>
        <span className="font-display text-[20px] font-bold tracking-[-0.02em]" style={{ color: tone === "forest" ? "var(--color-forest)" : "var(--color-ink)" }}>
          {value}
        </span>
      </span>
    </Card>
  );
}
