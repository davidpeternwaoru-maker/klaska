"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, SectionTitle, Pill, Button } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { STUDENTS, LEVELS, niceClass, effStatus, effLevel, type Status, type FeeStatus } from "@/data/people";
import { usePromotions } from "@/lib/promotions/promotionsStore";

const STATUS_TONE: Record<Status, "green" | "blue" | "amber"> = { active: "green", graduated: "blue", left: "amber" };
const STATUS_LABEL: Record<Status, string> = { active: "Active", graduated: "Graduated", left: "Left" };
const FEE_TONE: Record<FeeStatus, "green" | "amber" | "red"> = { paid: "green", partial: "amber", unpaid: "red" };

const LIMIT = 50;

export function StudentsPage() {
  const promo = usePromotions();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | Status>("active");
  const [level, setLevel] = useState<string>("all");

  const all = useMemo(() => STUDENTS.map((s) => ({ s, st: effStatus(s), lvl: effLevel(s) })), [promo]);
  const counts = useMemo(
    () => ({
      active: all.filter((x) => x.st === "active").length,
      graduated: all.filter((x) => x.st === "graduated").length,
      left: all.filter((x) => x.st === "left").length,
      allTime: all.length,
    }),
    [all],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return all
      .filter(({ s, st, lvl }) => {
        if (status !== "all" && st !== status) return false;
        if (level !== "all" && lvl !== level) return false;
        if (term && !s.name.toLowerCase().includes(term) && !s.admissionNo.toLowerCase().includes(term)) return false;
        return true;
      })
      .map((x) => x.s);
  }, [q, status, level, all]);

  const shown = filtered.slice(0, LIMIT);

  return (
    <div className="mx-auto max-w-[1320px]">
      <SectionTitle
        eyebrow="People"
        title="Students"
        sub="Every learner's full record — bio, guardians, academics, attendance, fees and history."
        right={
          <Button kind="primary" size="sm" icon="plus">
            Add student
          </Button>
        }
      />

      {/* counts */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CountCard label="Active population" value={counts.active} sub="currently enrolled" tone="forest" icon="students" />
        <CountCard label="All-time records" value={counts.allTime} sub="never deleted" tone="neutral" icon="reports" />
        <CountCard label="Alumni" value={counts.graduated + counts.left} sub={`${counts.graduated} graduated · ${counts.left} left`} tone="blue" icon="badge" />
        <CountCard label="Left early" value={counts.left} sub="withdrawn — archived" tone="amber" icon="trend" />
      </div>

      {/* toolbar + table */}
      <Card pad={0} className="mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border p-3.5">
          <div className="relative min-w-[220px] flex-1">
            <Icon name="search" size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-ink-4)" }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or admission no…"
              className="h-9 w-full rounded-[10px] border border-transparent bg-secondary pl-9 pr-3 text-[13px] outline-none transition placeholder:text-ink-4 focus:border-forest-line focus:bg-card focus:shadow-[var(--ring-focus)]"
            />
          </div>

          <Segmented
            value={status}
            onChange={(v) => setStatus(v as "all" | Status)}
            options={[
              { value: "active", label: "Active" },
              { value: "graduated", label: "Graduated" },
              { value: "left", label: "Left" },
              { value: "all", label: "All" },
            ]}
          />

          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="h-9 rounded-[10px] border border-transparent bg-secondary px-3 text-[13px] font-medium text-ink-2 outline-none focus:border-forest-line"
          >
            <option value="all">All classes</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        {/* table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.05em] text-ink-4">
                <th className="px-4 py-2.5 text-left font-medium">Student</th>
                <th className="px-4 py-2.5 text-left font-medium">Class</th>
                <th className="px-4 py-2.5 text-left font-medium">Admission no.</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="px-4 py-2.5 text-left font-medium">Fees</th>
                <th className="px-4 py-2.5 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.id} className="group border-t border-border transition-colors hover:bg-secondary/60">
                  <td className="px-4 py-3">
                    <Link href={`/people/students/${s.id}`} className="flex items-center gap-3">
                      <Avatar name={s.name} hue={s.hue} size={34} />
                      <span>
                        <span className="block font-medium leading-tight text-ink">{s.name}</span>
                        <span className="block text-[11.5px] text-ink-4">{s.gender === "F" ? "Female" : "Male"}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium text-ink-2">{niceClass(s)}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-ink-3">{s.admissionNo}</td>
                  <td className="px-4 py-3">
                    <Pill tone={STATUS_TONE[effStatus(s)]}>{STATUS_LABEL[effStatus(s)]}</Pill>
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={FEE_TONE[s.feeStatus]}>{s.feeStatus}</Pill>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/people/students/${s.id}`} className="inline-flex items-center text-ink-4 opacity-0 transition group-hover:opacity-100">
                      <Icon name="arrowR" size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[12px] text-ink-4">
          <span>
            Showing {shown.length} of {filtered.length}
            {filtered.length > LIMIT ? " (refine your search to see more)" : ""}
          </span>
          {status !== "active" && <span className="font-medium text-blue">Archive view — records are preserved, never deleted.</span>}
        </div>
      </Card>
    </div>
  );
}

function CountCard({
  label,
  value,
  sub,
  tone,
  icon,
}: {
  label: string;
  value: number;
  sub: string;
  tone: "forest" | "neutral" | "blue" | "amber";
  icon: string;
}) {
  const color =
    tone === "forest" ? "var(--color-forest)" : tone === "blue" ? "var(--color-blue)" : tone === "amber" ? "var(--color-amber-2)" : "var(--color-ink-3)";
  return (
    <Card pad={16} hover className="flex items-center gap-3.5">
      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[12px] bg-secondary" style={{ color }}>
        <Icon name={icon} size={19} />
      </span>
      <span className="min-w-0">
        <span className="block text-[12px] font-medium text-ink-3">{label}</span>
        <span className="font-display text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink">{value.toLocaleString("en-NG")}</span>
        <span className="block truncate text-[11.5px] text-ink-4">{sub}</span>
      </span>
    </Card>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="inline-flex gap-0.5 rounded-[10px] bg-secondary p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`h-7 rounded-[7px] px-3 text-[12.5px] font-medium transition ${
              active ? "bg-card text-ink shadow-[0_1px_2px_rgba(20,20,18,0.06)]" : "text-ink-3 hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
