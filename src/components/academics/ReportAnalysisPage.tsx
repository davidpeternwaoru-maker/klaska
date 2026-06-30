"use client";

import { useMemo, useState } from "react";
import { Card, SectionTitle, Pill, Button, SegTabs, BarRow } from "@/components/ui/primitives";
import { KPI } from "@/components/ui/KPI";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { fullAnalysis, sectionLeaders, devClassReports, earlyYearsLeader, type Scored, type DevClassReport } from "@/data/academics";
import { STUDENTS, niceClass, type Student } from "@/data/people";
import { SCHOOL } from "@/data/overview";
import { useSchoolConfig } from "@/lib/config/schoolConfig";
import { usePromotions } from "@/lib/promotions/promotionsStore";
import { exportReportExcel, exportReportPDF } from "@/lib/export/exporters";
import { ReportCardView } from "./ReportCardView";

const school = () => ({ name: SCHOOL.name, term: SCHOOL.term, session: SCHOOL.session });

export function ReportAnalysisPage() {
  const cfg = useSchoolConfig();
  const promo = usePromotions();
  const a = useMemo(() => fullAnalysis(), [cfg, promo]);
  const leaders = useMemo(() => sectionLeaders(), [cfg, promo]);
  const early = useMemo(() => earlyYearsLeader(), [cfg, promo]);
  const devClasses = useMemo(() => devClassReports(), [cfg, promo]);
  const [tab, setTab] = useState("class");
  const [klass, setKlass] = useState(a.classReports[0]?.klass ?? "");
  const [deptId, setDeptId] = useState(a.deptReports[0]?.id ?? "");
  const [busy, setBusy] = useState<string | null>(null);

  // report card picker
  const [q, setQ] = useState("");
  const [card, setCard] = useState<Student | null>(null);
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return STUDENTS.filter((s) => s.name.toLowerCase().includes(t) || s.admissionNo.toLowerCase().includes(t)).slice(0, 8);
  }, [q]);

  // combined class list — early-years (developmental) classes first, then academic
  const classOptions = [
    ...devClasses.map((c) => ({ value: c.klass, label: `${c.klass} · early years` })),
    ...a.classReports.map((c) => ({ value: c.klass, label: c.klass })),
  ];
  const cr = a.classReports.find((c) => c.klass === klass);
  const devSel = devClasses.find((c) => c.klass === klass);
  const dr = a.deptReports.find((d) => d.id === deptId) ?? a.deptReports[0];

  async function run(kind: "xlsx" | "pdf") {
    setBusy(kind);
    try {
      if (kind === "xlsx") await exportReportExcel(a, school());
      else await exportReportPDF(a, school());
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1320px]">
      <SectionTitle
        eyebrow="Academics"
        title="Report Cards & Results"
        sub="View any student's report card, and analyse results class-by-class, by department and across the school."
        right={
          <>
            <Button kind="ghost" size="sm" icon="download" onClick={() => run("xlsx")}>
              {busy === "xlsx" ? "Building…" : "Excel"}
            </Button>
            <Button kind="ghost" size="sm" icon="reports" onClick={() => run("pdf")}>
              {busy === "pdf" ? "Building…" : "PDF"}
            </Button>
          </>
        }
      />

      {/* ---------- Report card viewer ---------- */}
      <Card className="mb-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-forest-soft text-forest">
            <Icon name="reports" size={18} />
          </span>
          <div>
            <div className="text-[14px] font-semibold text-ink">Student report cards</div>
            <div className="text-[12.5px] text-ink-4">Search any student to view, print or download their full report card — scores, grades, position and remarks.</div>
          </div>
        </div>
        <div className="relative mt-4 max-w-[480px]">
          <Icon name="search" size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-ink-4)" }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search student name or admission no…"
            className="h-10 w-full rounded-[10px] border border-transparent bg-secondary pl-9 pr-3 text-[13.5px] outline-none placeholder:text-ink-4 focus:border-forest-line focus:bg-card"
          />
        </div>
        {matches.length > 0 && (
          <div className="mt-2 max-w-[480px] overflow-hidden rounded-[12px] border border-border">
            {matches.map((s) => (
              <button key={s.id} onClick={() => setCard(s)} className="flex w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left transition last:border-0 hover:bg-secondary">
                <Avatar name={s.name} hue={s.hue} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink">{s.name}</span>
                  <span className="block text-[11.5px] text-ink-4">
                    {niceClass(s)} · {s.admissionNo}
                  </span>
                </span>
                <span className="text-[12px] font-medium text-forest">View card →</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* ---------- KPIs ---------- */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPI label="School average" value={`${a.schoolAvg}%`} delta="+3%" deltaTone="green" sub="" icon="reports" />
        <KPI label="Pass rate" value={`${a.passRate}%`} delta="≥ 50%" deltaTone="green" sub="" icon="check" />
        <KPI label="Best student" value={a.bestSchool ? `${a.bestSchool.average}%` : "—"} delta={a.bestSchool?.s.name ?? ""} sub="" icon="trend" />
        <KPI label="Classes" value={String(a.classReports.length + devClasses.length)} delta="analysed" sub="" icon="students" />
      </div>

      <div className="mt-6">
        <SegTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "class", label: "By class" },
            { value: "dept", label: "By department (SSS)" },
            { value: "section", label: "Section leaders" },
            { value: "subject", label: "Best per subject" },
            { value: "improved", label: "Most improved" },
          ]}
        />
      </div>

      <div className="mt-4 k-rise">
        {/* ---------- BY CLASS ---------- */}
        {tab === "class" && (
          <>
            <div className="mb-4">
              <Selector value={klass} onChange={setKlass} options={classOptions} />
            </div>
            {devSel ? (
              <DevClassView report={devSel} onView={setCard} />
            ) : cr ? (
              <>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <Card>
                <div className="text-[12px] font-medium text-ink-3">{cr.klass}</div>
                <div className="mt-1 font-display text-[28px] font-bold tracking-[-0.02em] text-ink">{cr.classAvg}%</div>
                <div className="text-[12px] text-ink-4">class average · {cr.ranked.length} students</div>
                <div className="mt-4 flex items-center gap-2.5 rounded-[12px] bg-forest-soft p-3">
                  <Avatar name={cr.best.s.name} hue={cr.best.s.hue} size={34} />
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-forest">Best in class</div>
                    <div className="truncate text-[13px] font-semibold text-ink">{cr.best.s.name}</div>
                  </div>
                  <Pill tone="green" style={{ marginLeft: "auto" }}>{cr.best.average}%</Pill>
                </div>
                <div className="mt-4 text-[12px] font-medium text-ink-3">Weakest subjects</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {cr.weakest.map((w) => (
                    <Pill key={w.subject} tone="red">{w.subject} · {w.avg}%</Pill>
                  ))}
                </div>
              </Card>
              <Card>
                <div className="mb-5 text-[14px] font-semibold text-ink">Class average per subject</div>
                <div className="flex flex-col gap-3.5">
                  {cr.subjectAvgs.map((x) => (
                    <BarRow key={x.subject} label={x.subject} value={x.avg} max={100} tone={x.avg >= 60 ? "forest" : x.avg >= 50 ? "amber" : "red"} />
                  ))}
                </div>
              </Card>
              <Card pad={0} className="overflow-hidden">
                <div className="p-4 text-[14px] font-semibold text-ink">Class ranking</div>
                <div className="max-h-[44vh] overflow-y-auto">
                  <table className="w-full border-collapse text-[13px]">
                    <tbody>
                      {cr.ranked.map((p, i) => (
                        <tr key={p.s.id} className="border-t border-border first:border-0 transition-colors hover:bg-secondary/60">
                          <td className="w-8 px-4 py-2.5 font-semibold text-ink-4">{i + 1}</td>
                          <td className="px-4 py-2.5">
                            <button onClick={() => setCard(p.s)} className="font-medium text-ink hover:text-forest hover:underline">
                              {p.s.name}
                            </button>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Pill tone={p.average >= 65 ? "green" : p.average >= 50 ? "amber" : "red"}>{p.average}%</Pill>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* best per subject in this class */}
            <Card pad={0} className="mt-5 overflow-hidden">
              <div className="p-5 text-[14px] font-semibold text-ink">Best student in each subject — {cr.klass}</div>
              <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 xl:grid-cols-3">
                {cr.bestPerSubject.map((b) => (
                  <div key={b.subject} className="flex items-center gap-2.5 bg-card px-4 py-3">
                    <Avatar name={b.name} hue={b.hue} size={28} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">{b.name}</span>
                      <span className="block text-[11.5px] text-ink-4">{b.subject}</span>
                    </span>
                    <Pill tone="green">{b.total}</Pill>
                  </div>
                ))}
              </div>
            </Card>

            {/* SSS department breakdown for this class */}
            {cr.departments.length > 0 && (
              <Card className="mt-5">
                <div className="mb-4 text-[14px] font-semibold text-ink">Departments in {cr.klass}</div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {cr.departments.map((d) => (
                    <div key={d.id} className="rounded-[14px] border border-border p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-semibold text-ink">{d.name}</span>
                        <Pill tone="neutral">{d.avg}% avg</Pill>
                      </div>
                      {d.best && (
                        <div className="mt-3 flex items-center gap-2.5">
                          <Avatar name={d.best.s.name} hue={d.best.s.hue} size={30} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[10.5px] font-medium uppercase text-forest">Best in dept</span>
                            <span className="block truncate text-[12.5px] font-semibold text-ink">{d.best.s.name}</span>
                          </span>
                          <Pill tone="green">{d.best.average}%</Pill>
                        </div>
                      )}
                      <div className="mt-2 text-[11.5px] text-ink-4">{d.n} students</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
              </>
            ) : null}
          </>
        )}

        {/* ---------- BY DEPARTMENT (across SSS) ---------- */}
        {tab === "dept" && dr && (
          <>
            <div className="mb-4">
              <Selector value={deptId} onChange={setDeptId} options={a.deptReports.map((d) => ({ value: d.id, label: d.name }))} />
            </div>
            {dr.n ? (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Card>
                  <div className="text-[12px] font-medium text-ink-3">{dr.name} · all SSS</div>
                  <div className="mt-1 font-display text-[28px] font-bold tracking-[-0.02em] text-ink">{dr.avg}%</div>
                  <div className="text-[12px] text-ink-4">{dr.n} students</div>
                  {dr.best && (
                    <div className="mt-4 flex items-center gap-2.5 rounded-[12px] bg-forest-soft p-3">
                      <Avatar name={dr.best.s.name} hue={dr.best.s.hue} size={34} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] font-medium uppercase text-forest">Best in department</span>
                        <span className="block truncate text-[13px] font-semibold text-ink">{dr.best.s.name}</span>
                      </span>
                      <Pill tone="green">{dr.best.average}%</Pill>
                    </div>
                  )}
                </Card>
                <Card>
                  <div className="mb-5 text-[14px] font-semibold text-ink">Department average per subject</div>
                  <div className="flex flex-col gap-3.5">
                    {dr.subjectAvgs.map((x) => (
                      <BarRow key={x.subject} label={x.subject} value={x.avg} max={100} tone={x.avg >= 60 ? "forest" : "amber"} />
                    ))}
                  </div>
                </Card>
                <Card pad={0} className="overflow-hidden">
                  <div className="p-4 text-[14px] font-semibold text-ink">Department ranking</div>
                  <div className="max-h-[44vh] overflow-y-auto">
                    <table className="w-full border-collapse text-[13px]">
                      <tbody>
                        {dr.ranked.map((p, i) => (
                          <tr key={p.s.id} className="border-t border-border first:border-0">
                            <td className="w-8 px-4 py-2.5 font-semibold text-ink-4">{i + 1}</td>
                            <td className="px-4 py-2.5">
                              <button onClick={() => setCard(p.s)} className="font-medium text-ink hover:text-forest hover:underline">
                                {p.s.name}
                              </button>
                            </td>
                            <td className="px-4 py-2.5 text-ink-4">{p.klass}</td>
                            <td className="px-4 py-2.5 text-right">
                              <Pill tone={p.average >= 65 ? "green" : "amber"}>{p.average}%</Pill>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            ) : (
              <Card pad={32} className="text-center text-ink-4">No students in {dr.name} yet.</Card>
            )}
          </>
        )}

        {/* ---------- SECTION LEADERS ---------- */}
        {tab === "section" && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <EarlyLeaderCard leader={early} onView={setCard} />
              <LeaderCard title="Best in Primary" leader={leaders.primary} onView={setCard} />
              <LeaderCard title="Best in Junior Sec" leader={leaders.junior} onView={setCard} />
              <LeaderCard title="Best in Senior Sec" leader={leaders.senior} onView={setCard} />
            </div>
            <LeaderCard title="Overall best in school" leader={leaders.overall} highlight onView={setCard} />
          </div>
        )}

        {/* ---------- BEST PER SUBJECT (school) ---------- */}
        {tab === "subject" && (
          <Card pad={0} className="overflow-hidden">
            <div className="p-5 text-[14px] font-semibold text-ink">Best student in each subject — whole school</div>
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-y border-border text-[11px] uppercase tracking-[0.05em] text-ink-4">
                  <th className="px-5 py-2.5 text-left font-medium">Subject</th>
                  <th className="px-5 py-2.5 text-left font-medium">Best student</th>
                  <th className="px-5 py-2.5 text-left font-medium">Class</th>
                  <th className="px-5 py-2.5 text-right font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {a.bestPerSubject.map((b) => (
                  <tr key={b.subject} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-medium text-ink">{b.subject}</td>
                    <td className="px-5 py-3 text-ink-2">{b.name}</td>
                    <td className="px-5 py-3 text-ink-3">{b.klass}</td>
                    <td className="px-5 py-3 text-right font-semibold text-ink">{b.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* ---------- MOST IMPROVED ---------- */}
        {tab === "improved" && (
          <Card pad={0} className="overflow-hidden">
            <div className="p-5 text-[14px] font-semibold text-ink">Most improved vs last term</div>
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-y border-border text-[11px] uppercase tracking-[0.05em] text-ink-4">
                  <th className="px-5 py-2.5 text-left font-medium">#</th>
                  <th className="px-5 py-2.5 text-left font-medium">Student</th>
                  <th className="px-5 py-2.5 text-left font-medium">Class</th>
                  <th className="px-5 py-2.5 text-right font-medium">Previous → Now</th>
                  <th className="px-5 py-2.5 text-right font-medium">Gain</th>
                </tr>
              </thead>
              <tbody>
                {a.mostImproved.map((p, i) => (
                  <tr key={p.s.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-semibold text-ink-4">{i + 1}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={p.s.name} hue={p.s.hue} size={28} />
                        <span className="font-medium text-ink">{p.s.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-ink-3">{p.klass}</td>
                    <td className="px-5 py-3 text-right text-ink-3">{p.prev} → {p.average}</td>
                    <td className="px-5 py-3 text-right">
                      <Pill tone="green">+{p.delta} pts</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {card && <ReportCardView student={card} onClose={() => setCard(null)} />}
    </div>
  );
}

function LeaderCard({ title, leader, highlight, onView }: { title: string; leader: Scored | null; highlight?: boolean; onView?: (s: Student) => void }) {
  return (
    <Card hover className={highlight ? "ring-2 ring-forest/30" : ""}>
      <div className="text-[12px] font-medium uppercase tracking-wide text-ink-4">{title}</div>
      {leader ? (
        <>
          <div className="mt-3 flex items-center gap-3">
            <Avatar name={leader.s.name} hue={leader.s.hue} size={44} ring={highlight} />
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold text-ink">{leader.s.name}</div>
              <div className="text-[12px] text-ink-4">{leader.klass}</div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Pill tone="green">{leader.average}% average</Pill>
            {onView && (
              <button onClick={() => onView(leader.s)} className="text-[12px] font-medium text-forest hover:underline">
                View card →
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="mt-3 text-[13px] text-ink-4">No data.</div>
      )}
    </Card>
  );
}

function EarlyLeaderCard({ leader, onView }: { leader: { s: Student; klass: string; metPct: number } | null; onView: (s: Student) => void }) {
  return (
    <Card hover>
      <div className="text-[12px] font-medium uppercase tracking-wide text-ink-4">Best in Early Years</div>
      {leader ? (
        <>
          <div className="mt-3 flex items-center gap-3">
            <Avatar name={leader.s.name} hue={leader.s.hue} size={44} />
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold text-ink">{leader.s.name}</div>
              <div className="text-[12px] text-ink-4">{leader.klass}</div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Pill tone="green">{leader.metPct}% milestones</Pill>
            <button onClick={() => onView(leader.s)} className="text-[12px] font-medium text-forest hover:underline">
              View card →
            </button>
          </div>
        </>
      ) : (
        <div className="mt-3 text-[13px] text-ink-4">No data.</div>
      )}
    </Card>
  );
}

function DevClassView({ report, onView }: { report: DevClassReport; onView: (s: Student) => void }) {
  const needSupport = report.children.filter((c) => c.weak.length > 0);
  return (
    <>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card>
          <div className="text-[12px] font-medium text-ink-3">{report.klass} · early years</div>
          <div className="mt-1 font-display text-[28px] font-bold tracking-[-0.02em] text-ink">{report.classMetPct}%</div>
          <div className="text-[12px] text-ink-4">on milestone · {report.children.length} children</div>
          <div className="mt-4 flex items-center gap-2.5 rounded-[12px] bg-forest-soft p-3">
            <Avatar name={report.best.s.name} hue={report.best.s.hue} size={34} />
            <div className="min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-wide text-forest">Best child</div>
              <button onClick={() => onView(report.best.s)} className="truncate text-[13px] font-semibold text-ink hover:text-forest hover:underline">
                {report.best.s.name}
              </button>
            </div>
            <Pill tone="green" style={{ marginLeft: "auto" }}>{report.best.metPct}% met</Pill>
          </div>
          <div className="mt-4 rounded-[12px] bg-secondary p-3 text-[12px] text-ink-3">
            Lower-class pupils are assessed on developmental milestones rather than exam scores. The “best child” is the one meeting the most milestones at an excellent level.
          </div>
        </Card>
        <Card>
          <div className="mb-5 text-[14px] font-semibold text-ink">Milestone progress per skill</div>
          <div className="flex flex-col gap-3.5">
            {report.skillAvgs.map((x) => (
              <BarRow key={x.label} label={x.label} value={x.pct} max={100} tone={x.pct >= 70 ? "forest" : x.pct >= 50 ? "amber" : "red"} />
            ))}
          </div>
        </Card>
        <Card pad={0} className="overflow-hidden">
          <div className="p-4 text-[14px] font-semibold text-ink">Class ranking by milestones</div>
          <div className="max-h-[44vh] overflow-y-auto">
            <table className="w-full border-collapse text-[13px]">
              <tbody>
                {report.children.map((c, i) => (
                  <tr key={c.s.id} className="border-t border-border first:border-0 transition-colors hover:bg-secondary/60">
                    <td className="w-8 px-4 py-2.5 font-semibold text-ink-4">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => onView(c.s)} className="font-medium text-ink hover:text-forest hover:underline">
                        {c.s.name}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Pill tone={c.metPct >= 80 ? "green" : c.metPct >= 60 ? "amber" : "red"}>{c.metPct}% met</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {needSupport.length > 0 && (
        <Card pad={0} className="mt-5 overflow-hidden">
          <div className="p-5 text-[14px] font-semibold text-ink">Children to support — {report.klass}</div>
          <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 xl:grid-cols-3">
            {needSupport.map((c) => (
              <button key={c.s.id} onClick={() => onView(c.s)} className="flex items-start gap-2.5 bg-card px-4 py-3 text-left transition hover:bg-secondary">
                <Avatar name={c.s.name} hue={c.s.hue} size={28} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink">{c.s.name}</span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {c.weak.map((w) => (
                      <span key={w} className="rounded bg-red-soft px-1.5 py-0.5 text-[10.5px] font-medium text-red">{w}</span>
                    ))}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

function Selector({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-[10px] bg-secondary px-3 py-1.5">
      <Icon name="filter" size={15} style={{ color: "var(--color-ink-4)" }} />
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent text-[13px] font-medium text-ink outline-none">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
