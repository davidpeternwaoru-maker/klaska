"use client";

import { useMemo, useState } from "react";
import { Card, SectionTitle, Pill, Button } from "@/components/ui/primitives";
import { KPI } from "@/components/ui/KPI";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { useOffline } from "@/lib/offline/useOffline";
import { STUDENTS, niceClass, type Student } from "@/data/people";
import { classAttendance, attendanceKPIs, levelTabs, type ClassRow } from "@/data/attendance";

const DATE = "22 May 2026";
type Mark = "present" | "late" | "absent";

export function AttendancePage() {
  const rows = useMemo(() => classAttendance(), []);
  const k = useMemo(() => attendanceKPIs(), []);
  const tabs = useMemo(() => levelTabs(), []);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [roster, setRoster] = useState<ClassRow | null>(null);
  const [headcount, setHeadcount] = useState(false);

  const shown = rows.filter((r) => {
    if (tab !== "all" && r.level !== tab) return false;
    if (q && !r.klass.toLowerCase().includes(q.toLowerCase()) && !r.roster.some((s) => s.name.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  const pctOfSchool = (n: number) => (k.total ? Math.round((n / k.total) * 100) : 0);

  return (
    <div className="mx-auto max-w-[1320px]">
      <SectionTitle
        eyebrow="Attendance"
        title="Today's attendance"
        sub={`Live, scanned from teacher NFC tags. ${DATE}.`}
        right={
          <>
            <Button kind="ghost" size="sm" icon="calendar">
              {DATE}
            </Button>
            <Button kind="ghost" size="sm" icon="download">
              Export CSV
            </Button>
            <Button kind="accent" size="sm" icon="shield" onClick={() => setHeadcount(true)}>
              Emergency headcount
            </Button>
          </>
        }
      />

      {/* teacher-app banner */}
      <Card className="mb-5 flex items-center gap-4">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[12px] bg-forest-soft text-forest">
          <Icon name="nfc" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-ink">
            Connected to the teacher app · <span className="text-forest">Scanning live</span>
          </div>
          <div className="text-[12.5px] text-ink-4">0 new scans from the teacher app this session</div>
        </div>
        <span className="k-live-dot h-2.5 w-2.5 flex-none rounded-full bg-green" />
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPI label="Present" value={`${k.present} / ${k.total}`} delta="+12 in last hour" deltaTone="green" sub="" icon="check" />
        <KPI label="Late" value={String(k.late)} delta={`${pctOfSchool(k.late)}% of school`} deltaTone="amber" sub="" icon="clock" />
        <KPI label="Absent" value={String(k.absent)} delta="parents notified" deltaTone="red" sub="" icon="bell" />
        <KPI label="Avg arrival" value={k.avgArrival} delta="3 min earlier" deltaTone="green" sub="" icon="clock" />
      </div>

      {/* tabs + search */}
      <div className="mt-5 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap gap-0.5 rounded-[10px] bg-secondary p-1">
          {[{ v: "all", l: "All levels" }, ...tabs.map((t) => ({ v: t, l: t }))].map((t) => (
            <button
              key={t.v}
              onClick={() => setTab(t.v)}
              className={`h-8 rounded-[7px] px-3 text-[12.5px] font-medium transition ${tab === t.v ? "bg-card text-ink shadow-[0_1px_2px_rgba(20,20,18,0.06)]" : "text-ink-3 hover:text-ink"}`}
            >
              {t.l}
            </button>
          ))}
        </div>
        <div className="relative w-[240px]">
          <Icon name="search" size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--color-ink-4)" }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find student or class…"
            className="h-9 w-full rounded-[10px] border border-transparent bg-secondary pl-9 pr-3 text-[13px] outline-none placeholder:text-ink-4 focus:border-forest-line focus:bg-card"
          />
        </div>
      </div>

      {/* class cards */}
      <div className="k-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((r) => {
          const full = r.pct >= 95;
          return (
            <button key={r.klass} onClick={() => setRoster(r)} className="text-left">
              <Card hover pad={18} className="h-full">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-ink">{r.klass}</div>
                    <div className="truncate text-[12.5px] text-ink-4">{r.teacher}</div>
                  </div>
                  <span
                    className="flex-none rounded-full px-2.5 py-1 text-[12px] font-semibold"
                    style={{ background: full ? "var(--color-forest-soft)" : "var(--color-amber-soft)", color: full ? "var(--color-forest)" : "var(--color-amber-2)" }}
                  >
                    {r.pct}%
                  </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${r.pct}%`, background: full ? "var(--color-forest)" : "var(--color-amber)" }} />
                </div>
                <div className="mt-2.5 flex items-center gap-5 text-[12.5px]">
                  <span>
                    <b className="text-ink">{r.present}</b> <span className="text-ink-4">present</span>
                  </span>
                  <span>
                    <b className="text-ink">{r.late}</b> <span className="text-ink-4">late</span>
                  </span>
                  <span>
                    <b className="text-ink">{r.absent}</b> <span className="text-ink-4">absent</span>
                  </span>
                </div>
              </Card>
            </button>
          );
        })}
      </div>

      {roster && <RosterModal row={roster} onClose={() => setRoster(null)} />}
      {headcount && <HeadcountModal onClose={() => setHeadcount(false)} />}
    </div>
  );
}

function RosterModal({ row, onClose }: { row: ClassRow; onClose: () => void }) {
  const { enqueue } = useOffline();
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const markOf = (s: Student): Mark => marks[s.id] ?? (s.checkedInToday ? "present" : "absent");
  function setMark(s: Student, m: Mark) {
    setMarks((p) => ({ ...p, [s.id]: m }));
    enqueue("attendance.mark", { id: s.id, klass: row.klass, mark: m, date: new Date().toISOString().slice(0, 10) });
  }
  const present = row.roster.filter((s) => markOf(s) === "present").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-[86vh] w-full max-w-[620px] flex-col overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-3)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="font-display text-[16px] font-semibold text-ink">{row.klass} · roster</div>
            <div className="text-[12px] text-ink-4">{row.teacher} · {present}/{row.total} present</div>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-[10px] text-ink-3 transition hover:bg-secondary">
            <Icon name="x" size={17} />
          </button>
        </div>
        <div className="overflow-y-auto">
          {row.roster.map((s) => {
            const m = markOf(s);
            return (
              <div key={s.id} className="flex items-center gap-3 border-b border-border px-5 py-2.5 last:border-0">
                <Avatar name={s.name} hue={s.hue} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink">{s.name}</span>
                  <span className="block text-[11.5px] text-ink-4">{s.checkInTime ? `NFC tap · ${s.checkInTime}` : "Not tapped in"}</span>
                </span>
                <div className="flex gap-1 rounded-[10px] bg-secondary p-1">
                  {(["present", "late", "absent"] as Mark[]).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setMark(s, opt)}
                      className="h-7 rounded-[7px] px-2.5 text-[11.5px] font-medium capitalize transition"
                      style={m === opt ? { background: opt === "present" ? "var(--color-forest)" : opt === "late" ? "var(--color-amber)" : "var(--color-red)", color: "#fff" } : { color: "var(--color-ink-3)" }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HeadcountModal({ onClose }: { onClose: () => void }) {
  const onCampus = useMemo(() => STUDENTS.filter((s) => s.status === "active" && s.checkedInToday), []);
  const totalActive = STUDENTS.filter((s) => s.status === "active").length;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-[86vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-3)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-forest-soft text-forest">
              <Icon name="shield" size={19} />
            </span>
            <div>
              <div className="font-display text-[16px] font-semibold text-ink">Emergency headcount</div>
              <div className="text-[12px] text-ink-4">Everyone checked in on campus today</div>
            </div>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-[10px] text-ink-3 transition hover:bg-secondary">
            <Icon name="x" size={17} />
          </button>
        </div>
        <div className="flex items-center gap-3 border-b border-border bg-secondary/50 px-5 py-3">
          <Pill tone="forest">{onCampus.length} on campus</Pill>
          <Pill tone="amber">{totalActive - onCampus.length} not tapped in</Pill>
          <span className="ml-auto text-[12px] text-ink-4">of {totalActive} active students</span>
        </div>
        <div className="overflow-y-auto">
          {onCampus.map((s) => (
            <div key={s.id} className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0">
              <Avatar name={s.name} hue={s.hue} size={36} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-ink">{s.name}</span>
                <span className="block text-[11.5px] text-ink-4">{niceClass(s)} · in at {s.checkInTime}</span>
              </span>
              <a href={`tel:${s.guardianPhone}`} className="flex items-center gap-1.5 rounded-[10px] border border-border px-3 py-2 text-[12px] font-medium text-ink-2 transition hover:bg-secondary">
                <Icon name="phone" size={14} /> {s.guardianPhone}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
