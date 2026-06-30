"use client";

import { useMemo, useState } from "react";
import { Card, SectionTitle, Pill, Button, SegTabs } from "@/components/ui/primitives";
import { KPI } from "@/components/ui/KPI";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { KLogo } from "@/components/ui/Icon";
import { SCHOOL } from "@/data/overview";
import { STAFF, type Staff } from "@/data/people";
import {
  COMPETENCIES,
  RATERS,
  SCALE,
  STATUS_META,
  APPRAISAL_CYCLE,
  buildAppraisal,
  appraisalSummary,
  type Appraisal,
  type RaterId,
} from "@/data/appraisals";
import {
  useAppraisals,
  getAppraisalOverride,
  saveRating,
  signOffAppraisal,
  reopenAppraisal,
} from "@/lib/appraisals/appraisalStore";
import { exportAppraisalsExcel, exportAppraisalsPDF } from "@/lib/export/exporters";

export function AppraisalsPage() {
  const state = useAppraisals(); // re-render on store changes
  const summary = useMemo(() => appraisalSummary(getAppraisalOverride), [state]);
  const [tab, setTab] = useState("roster");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const open = openId ? STAFF.find((s) => s.id === openId) ?? null : null;

  async function runExport(kind: "xlsx" | "pdf") {
    setBusy(kind);
    try {
      const meta = { name: SCHOOL.name, term: SCHOOL.term, session: SCHOOL.session };
      if (kind === "xlsx") await exportAppraisalsExcel(summary.all, meta, APPRAISAL_CYCLE);
      else await exportAppraisalsPDF(summary.all, meta, APPRAISAL_CYCLE);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1320px]">
      <SectionTitle
        eyebrow="People"
        title="Staff Appraisals"
        sub="360° performance appraisals — self, peers, head teacher and the principal's formal sign-off."
        right={
          <>
            <Pill tone="forest">{APPRAISAL_CYCLE}</Pill>
            <Button kind="ghost" size="sm" icon="download" onClick={() => runExport("xlsx")}>
              {busy === "xlsx" ? "Building…" : "Excel"}
            </Button>
            <Button kind="ghost" size="sm" icon="reports" onClick={() => runExport("pdf")}>
              {busy === "pdf" ? "Building…" : "PDF"}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPI label="Signed off" value={`${summary.signed}/${summary.total}`} delta="by principal" deltaTone="green" sub="" icon="check" />
        <KPI label="Awaiting principal" value={String(summary.awaiting)} delta="ready to sign" deltaTone="amber" sub="" icon="clock" />
        <KPI label="In progress" value={String(summary.inProgress)} delta="self / peer stage" deltaTone="amber" sub="" icon="edit" />
        <KPI label="Average rating" value={`${summary.avg.toFixed(2)}`} delta="of 5.0" sub="" icon="target" />
      </div>

      <div className="mt-6">
        <SegTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "roster", label: "Staff roster" },
            { value: "framework", label: "How it works" },
          ]}
        />
      </div>

      <div className="mt-4 k-rise">
        {tab === "roster" && <Roster onOpen={setOpenId} />}
        {tab === "framework" && <Framework />}
      </div>

      {open && <AppraisalSheet staff={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}

/* ---------------- roster ---------------- */
function Roster({ onOpen }: { onOpen: (id: string) => void }) {
  useAppraisals();
  const rows = STAFF.map((s) => buildAppraisal(s, getAppraisalOverride(s.id)));
  return (
    <Card pad={0} className="overflow-hidden">
      <div className="flex items-center justify-between p-5">
        <div className="text-[14px] font-semibold text-ink">All staff · {rows.length}</div>
        <div className="text-[12px] text-ink-4">Click a member to open their appraisal sheet</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-y border-border text-[11px] uppercase tracking-[0.05em] text-ink-4">
              <th className="px-5 py-2.5 text-left font-medium">Staff</th>
              <th className="px-5 py-2.5 text-left font-medium">Role</th>
              <th className="px-5 py-2.5 text-left font-medium">Progress</th>
              <th className="px-5 py-2.5 text-left font-medium">Overall</th>
              <th className="px-5 py-2.5 text-left font-medium">Status</th>
              <th className="px-5 py-2.5 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const st = STATUS_META[a.status];
              return (
                <tr key={a.staff.id} className="border-b border-border last:border-0 transition-colors hover:bg-secondary/60">
                  <td className="px-5 py-3">
                    <button onClick={() => onOpen(a.staff.id)} className="flex items-center gap-2.5 text-left">
                      <Avatar name={a.staff.name} hue={a.staff.hue} size={32} />
                      <span className="font-medium text-ink hover:text-forest">{a.staff.name}</span>
                    </button>
                  </td>
                  <td className="px-5 py-3 text-ink-3">
                    {a.staff.role}
                    {a.staff.department ? ` · ${a.staff.department}` : ""}
                  </td>
                  <td className="px-5 py-3">
                    <Stages a={a} />
                  </td>
                  <td className="px-5 py-3">
                    {a.overall != null && a.band ? (
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-ink">{a.overall.toFixed(2)}</span>
                        <Pill tone={a.band.tone}>{a.band.label}</Pill>
                      </span>
                    ) : (
                      <span className="text-ink-4">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Pill tone={st.tone}>{st.label}</Pill>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button kind="ghost" size="sm" icon="chevR" onClick={() => onOpen(a.staff.id)}>
                      Open
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Stages({ a }: { a: Appraisal }) {
  return (
    <span className="flex items-center gap-1.5">
      {RATERS.map((rt) => {
        const done = !!a.entries[rt.id];
        return (
          <span
            key={rt.id}
            title={`${rt.label}: ${done ? "done" : "pending"}`}
            className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold"
            style={{
              background: done ? "var(--color-forest-soft)" : "var(--color-secondary)",
              color: done ? "var(--color-forest)" : "var(--color-ink-4)",
            }}
          >
            {done ? "✓" : rt.label[0].toUpperCase()}
          </span>
        );
      })}
    </span>
  );
}

/* ---------------- framework explainer ---------------- */
function Framework() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <div className="text-[14px] font-semibold text-ink">What each teacher is appraised on</div>
        <div className="mt-1 text-[12.5px] text-ink-4">Eight weighted competencies — weights determine each area&apos;s share of the final score.</div>
        <div className="mt-4 flex flex-col divide-y divide-border">
          {COMPETENCIES.map((c) => (
            <div key={c.id} className="flex items-center gap-3 py-2.5">
              <span className="flex h-9 w-12 flex-none items-center justify-center rounded-[8px] bg-forest-soft text-[12px] font-bold text-forest">
                {Math.round(c.weight * 100)}%
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-ink">{c.label}</span>
                <span className="block text-[11.5px] text-ink-4">{c.hint}</span>
              </span>
            </div>
          ))}
        </div>
      </Card>
      <div className="flex flex-col gap-5">
        <Card>
          <div className="text-[14px] font-semibold text-ink">Who appraises (360°)</div>
          <div className="mt-3 flex flex-col gap-3">
            {RATERS.map((rt) => (
              <div key={rt.id} className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-secondary text-ink-3">
                  <Icon name={rt.icon as never} size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-ink">{rt.label}</span>
                  <span className="block text-[11px] text-ink-4">{rt.note}</span>
                </span>
                <Pill tone="neutral">{Math.round(rt.weight * 100)}%</Pill>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div className="text-[14px] font-semibold text-ink">Rating scale</div>
          <div className="mt-3 flex flex-col gap-1.5">
            {SCALE.map((s) => (
              <div key={s.v} className="flex items-center gap-2.5 text-[12.5px]">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-secondary text-[11px] font-bold text-ink">{s.v}</span>
                <span className="text-ink-2">{s.label}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- appraisal sheet (formal, printable) ---------------- */
const ADDRESS = "12 Admiralty Way, Lekki Phase 1, Lagos · admin@greenfield.ng";

function AppraisalSheet({ staff, onClose }: { staff: Staff; onClose: () => void }) {
  useAppraisals();
  const a = buildAppraisal(staff, getAppraisalOverride(staff.id));

  // rate-entry panel state
  const [rater, setRater] = useState<RaterId>("head");
  const existing = a.entries[rater];
  const [draft, setDraft] = useState<Record<string, number>>(() => seedDraft(a, "head"));
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [principalName, setPrincipalName] = useState("Mrs. Ifeoma Okeke");

  function pickRater(r: RaterId) {
    setRater(r);
    setDraft(seedDraft(a, r));
    setComment(a.entries[r]?.comment ?? "");
  }

  const draftAvg = useMemo(() => {
    const vals = COMPETENCIES.map((c) => draft[c.id]).filter((v): v is number => v != null);
    return vals.length ? vals.reduce((p, q) => p + q, 0) / vals.length : 0;
  }, [draft]);

  const locked = a.status === "signed_off";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[880px]" onClick={(e) => e.stopPropagation()}>
        <div className="k-noprint mb-2 flex items-center justify-end gap-2">
          <Button kind="ghost" size="sm" icon="reports" onClick={() => window.print()}>
            Print / PDF
          </Button>
          <Button kind="dark" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* ---- formal sheet ---- */}
        <div className="k-print rounded-[10px] border border-ink-2 bg-white p-5" style={{ color: "#1a1a18" }}>
          <div className="flex items-center gap-3 border-b-2 border-forest pb-3">
            <span className="flex h-14 w-14 flex-none items-center justify-center rounded-[12px] bg-forest-soft">
              <KLogo size={40} />
            </span>
            <div className="flex-1 text-center">
              <div className="font-display text-[20px] font-bold uppercase tracking-wide text-forest">{SCHOOL.name}</div>
              <div className="text-[10.5px] text-ink-3">{ADDRESS}</div>
              <div className="mt-1 inline-block rounded bg-ink px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">Staff Performance Appraisal</div>
            </div>
            <div className="w-14 flex-none text-right text-[10px] text-ink-4">{APPRAISAL_CYCLE.replace(" · ", "\n")}</div>
          </div>

          {/* staff info */}
          <div className="mt-3 flex items-center gap-3">
            <Avatar name={staff.name} hue={staff.hue} size={42} />
            <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1 text-[11.5px] sm:grid-cols-4">
              <Ri k="Name" v={staff.name} />
              <Ri k="Role" v={staff.role} />
              <Ri k="Department" v={staff.department ?? "—"} />
              <Ri k="Staff ID" v={staff.id} />
            </div>
            {a.overall != null && a.band && (
              <div className="flex flex-none flex-col items-center rounded-[10px] border border-line-2 px-3 py-2">
                <span className="font-display text-[22px] font-bold text-forest">{a.overall.toFixed(2)}</span>
                <span className="text-[9px] font-semibold uppercase text-ink-4">{a.band.label}</span>
              </div>
            )}
          </div>

          {/* competency table */}
          <table className="mt-3 w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="bg-forest-soft">
                <th className="border border-line-2 px-1.5 py-1 text-left font-bold">Competency</th>
                <th className="border border-line-2 px-1.5 py-1 text-center font-bold">Wt</th>
                {RATERS.map((rt) => (
                  <th key={rt.id} className="border border-line-2 px-1.5 py-1 text-center font-bold">
                    {rt.label.split(" ")[0].split("-")[0].split("/")[0]}
                  </th>
                ))}
                <th className="border border-line-2 px-1.5 py-1 text-center font-bold">Weighted</th>
              </tr>
            </thead>
            <tbody>
              {a.perComp.map((c) => (
                <tr key={c.id}>
                  <td className="border border-line-2 px-1.5 py-1 font-semibold">{c.label}</td>
                  <td className="border border-line-2 px-1.5 py-1 text-center text-ink-4">{Math.round(c.weight * 100)}%</td>
                  {RATERS.map((rt) => (
                    <td key={rt.id} className="border border-line-2 px-1.5 py-1 text-center">
                      {c.scores[rt.id] ?? "—"}
                    </td>
                  ))}
                  <td className="border border-line-2 px-1.5 py-1 text-center font-bold">{c.weighted != null ? c.weighted.toFixed(1) : "—"}</td>
                </tr>
              ))}
              <tr className="bg-secondary font-bold">
                <td className="border border-line-2 px-1.5 py-1" colSpan={2 + RATERS.length}>
                  Overall weighted score
                </td>
                <td className="border border-line-2 px-1.5 py-1 text-center text-forest">{a.overall != null ? a.overall.toFixed(2) : "—"}</td>
              </tr>
            </tbody>
          </table>

          {/* rater comments */}
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {RATERS.map((rt) => {
              const e = a.entries[rt.id];
              return (
                <div key={rt.id} className="rounded border border-line-2 p-2 text-[10.5px]">
                  <div className="mb-0.5 flex items-center justify-between">
                    <span className="font-bold uppercase text-ink-4">{rt.label}</span>
                    {e && <span className="text-ink-4">{e.by}</span>}
                  </div>
                  <p className="text-ink-2">{e ? `“${e.comment}”` : "Pending."}</p>
                </div>
              );
            })}
          </div>

          {/* sign-off block */}
          <div className="mt-3 rounded border-2 border-forest-line bg-forest-soft/40 p-3">
            {a.signed ? (
              <div className="flex items-center justify-between gap-3 text-[11.5px]">
                <div className="flex items-center gap-2">
                  <Icon name="check" size={18} style={{ color: "var(--color-forest)" }} />
                  <div>
                    <div className="font-bold text-forest">Approved & signed off</div>
                    <div className="text-ink-3">
                      {a.signed.by} · {a.signed.date}
                    </div>
                  </div>
                </div>
                <div className="font-display text-[18px] italic text-ink" style={{ fontFamily: "cursive" }}>
                  {a.signed.by.split(" ").slice(0, 2).join(" ")}
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-ink-3">
                <b className="text-ink">Awaiting principal&apos;s formal sign-off.</b> Once every rater has submitted, the principal reviews and confirms below.
              </div>
            )}
          </div>

          <div className="mt-2 text-[9px] text-ink-3">
            <b>Scale:</b> 1 Needs improvement · 2 Developing · 3 Meets expectations · 4 Exceeds · 5 Outstanding. Weighted score blends self (10%), peers (20%), head (40%) and principal (30%).
          </div>
        </div>

        {/* ---- interactive panel (not printed) ---- */}
        <div className="k-noprint mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between">
              <div className="text-[14px] font-semibold text-ink">Record an appraisal</div>
              {locked && <Pill tone="green">Locked — signed off</Pill>}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {RATERS.map((rt) => (
                <button
                  key={rt.id}
                  onClick={() => pickRater(rt.id)}
                  className={`rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium transition ${
                    rater === rt.id ? "bg-forest text-white" : "bg-secondary text-ink-2 hover:bg-border"
                  }`}
                >
                  {rt.label}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-2.5">
              {COMPETENCIES.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-2" title={c.hint}>
                    {c.label}
                  </span>
                  <span className="flex flex-none gap-1">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        key={v}
                        disabled={locked}
                        onClick={() => setDraft((d) => ({ ...d, [c.id]: v }))}
                        className="flex h-7 w-7 items-center justify-center rounded-[7px] text-[12px] font-semibold transition disabled:opacity-40"
                        style={{
                          background: draft[c.id] === v ? "var(--color-forest)" : "var(--color-secondary)",
                          color: draft[c.id] === v ? "#fff" : "var(--color-ink-3)",
                        }}
                      >
                        {v}
                      </button>
                    ))}
                  </span>
                </div>
              ))}
            </div>

            <textarea
              value={comment}
              disabled={locked}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder={`${RATERS.find((r) => r.id === rater)?.label} comment…`}
              className="mt-3 w-full rounded-[8px] border border-border p-2 text-[12px] outline-none focus:border-forest disabled:opacity-50"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[12px] text-ink-4">
                Draft average <b className="text-ink">{draftAvg.toFixed(2)}</b>
              </span>
              <Button
                kind="primary"
                size="sm"
                icon="check"
                onClick={() => {
                  if (locked) return;
                  saveRating(staff.id, rater, draft, comment.trim() || `${RATERS.find((r) => r.id === rater)?.label} submitted.`, raterByline(staff, rater));
                }}
              >
                Save {RATERS.find((r) => r.id === rater)?.label}
              </Button>
            </div>
          </Card>

          <Card>
            <div className="text-[14px] font-semibold text-ink">Principal&apos;s sign-off</div>
            <div className="mt-1 text-[12.5px] text-ink-4">The principal formally confirms the appraisal. This locks the record.</div>

            {a.signed ? (
              <div className="mt-4 rounded-[12px] bg-forest-soft p-4">
                <div className="flex items-center gap-2 text-forest">
                  <Icon name="check" size={18} />
                  <span className="text-[13px] font-semibold">Signed off</span>
                </div>
                <div className="mt-1 text-[12.5px] text-ink-2">
                  {a.signed.by} · {a.signed.date}
                </div>
                <Button kind="ghost" size="sm" icon="refresh" style={{ marginTop: 12 }} onClick={() => reopenAppraisal(staff.id)}>
                  Reopen appraisal
                </Button>
              </div>
            ) : (
              <>
                <div className="mt-4 flex flex-col gap-1">
                  {RATERS.map((rt) => (
                    <div key={rt.id} className="flex items-center gap-2 text-[12.5px]">
                      <Icon name={a.entries[rt.id] ? "check" : "clock"} size={14} style={{ color: a.entries[rt.id] ? "var(--color-green)" : "var(--color-ink-4)" }} />
                      <span className={a.entries[rt.id] ? "text-ink-2" : "text-ink-4"}>{rt.label}</span>
                    </div>
                  ))}
                </div>
                <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wide text-ink-4">Principal name</label>
                <input
                  value={principalName}
                  onChange={(e) => setPrincipalName(e.target.value)}
                  className="mt-1 h-9 w-full rounded-[8px] border border-border px-3 text-[13px] outline-none focus:border-forest"
                />
                <Button
                  kind="primary"
                  size="md"
                  icon="check"
                  style={{ marginTop: 12, width: "100%", justifyContent: "center" }}
                  onClick={() => principalName.trim() && signOffAppraisal(staff.id, `${principalName.trim()} (Principal)`)}
                >
                  Sign &amp; confirm appraisal
                </Button>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function seedDraft(a: Appraisal, r: RaterId): Record<string, number> {
  const existing = a.entries[r];
  const d: Record<string, number> = {};
  COMPETENCIES.forEach((c) => (d[c.id] = existing?.ratings[c.id] ?? 3));
  return d;
}

function raterByline(s: Staff, r: RaterId): string {
  if (r === "self") return s.name;
  if (r === "peer") return "Peer panel · 3 colleagues";
  if (r === "head") return "Head Teacher";
  return "Mrs. Ifeoma Okeke (Principal)";
}

function Ri({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] uppercase text-ink-4">{k}</span>
      <span className="font-semibold text-ink">{v}</span>
    </div>
  );
}
