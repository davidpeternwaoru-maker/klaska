"use client";

// Plan & campuses (Owner): switch Basic ↔ Enterprise (feature flags), and —
// on Enterprise — enable the School → Campus hierarchy and assign classes.
// Small schools never see campus complexity: it's hidden until toggled on.

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Card, Pill } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { setTier, toggleMultiCampus, createCampus, deleteCampus, assignClassCampus, type OrgState } from "@/lib/actions/org";
import { TIER_FEATURES, type Tier } from "@/lib/tier";

export type CampusRow = { id: string; name: string; classCount: number };
export type ClassCampusRow = { id: string; label: string; campusId: string | null };

const input = "h-9 rounded-[9px] border border-border bg-secondary px-2.5 text-[13px] text-ink outline-none focus:border-forest-line focus:bg-card";

export function PlanSettings({
  tier,
  multiCampus,
  campuses,
  classes,
}: {
  tier: string;
  multiCampus: boolean;
  campuses: CampusRow[];
  classes: ClassCampusRow[];
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [addState, addAction, addPending] = useActionState<OrgState, FormData>(createCampus, {});
  const addRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (addState.ok) addRef.current?.reset();
  }, [addState.ok, addState]);

  const choose = (t: Tier) =>
    start(async () => {
      setMsg(null);
      const res = await setTier(t);
      setMsg(res.ok ? `Plan switched to ${t === "ENTERPRISE" ? "Enterprise" : "Basic"}.` : res.error ?? null);
    });

  const toggleCampuses = (on: boolean) =>
    start(async () => {
      setMsg(null);
      const res = await toggleMultiCampus(on);
      if (res.error) setMsg(res.error);
    });

  const assign = (classId: string, campusId: string) =>
    start(async () => {
      await assignClassCampus(classId, campusId || null);
    });

  return (
    <div className="flex flex-col gap-4">
      {msg && <div className="rounded-[10px] bg-amber-soft px-3.5 py-2 text-[12.5px] font-medium text-amber-2">{msg}</div>}

      {/* plan cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(["BASIC", "ENTERPRISE"] as Tier[]).map((t) => {
          const active = (tier === "ENTERPRISE" ? "ENTERPRISE" : "BASIC") === t;
          return (
            <Card key={t} className={active ? "ring-2 ring-forest/40" : ""}>
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-semibold text-ink">{t === "BASIC" ? "Basic" : "Enterprise"}</span>
                {active ? <Pill tone="green">Current plan</Pill> : (
                  <button onClick={() => choose(t)} disabled={pending} className="h-8 rounded-[8px] bg-forest px-3 text-[12.5px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-60">
                    Switch
                  </button>
                )}
              </div>
              <ul className="mt-3 flex flex-col gap-1.5">
                {TIER_FEATURES[t].map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-[12.5px] text-ink-2">
                    <Icon name="check" size={13} style={{ marginTop: 2, color: "var(--color-forest)" }} /> {f}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      {/* multi-campus (enterprise) */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[14px] font-semibold text-ink">Multi-campus structure</div>
            <div className="mt-0.5 text-[12.5px] text-ink-4">
              For large institutions — e.g. a Primary campus and a Secondary campus with distinct budgets under one owner.
            </div>
          </div>
          <label className="flex items-center gap-2 text-[13px] font-medium text-ink-2">
            <input type="checkbox" checked={multiCampus} onChange={(e) => toggleCampuses(e.target.checked)} />
            Enabled
          </label>
        </div>

        {multiCampus && (
          <>
            <div className="mt-4 flex flex-col divide-y divide-border rounded-[12px] border border-border">
              {campuses.length === 0 && <div className="px-3 py-3 text-[12.5px] text-ink-4">No campuses yet — add your first below.</div>}
              {campuses.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-forest-soft text-forest">
                    <Icon name="home" size={15} />
                  </span>
                  <span className="flex-1 text-[13px] font-medium text-ink">{c.name}</span>
                  <Pill tone="neutral">{c.classCount} classes</Pill>
                  <form action={deleteCampus}>
                    <input type="hidden" name="id" value={c.id} />
                    <button title="Delete" className="rounded-[7px] p-1.5 text-ink-3 hover:bg-red-soft hover:text-red">
                      <Icon name="trash" size={15} />
                    </button>
                  </form>
                </div>
              ))}
              <form ref={addRef} action={addAction} className="flex items-center gap-2 bg-secondary/40 px-3 py-2.5">
                <input name="name" required placeholder="Campus name (e.g. Secondary Campus)" className={`${input} flex-1`} />
                <button disabled={addPending} className="h-9 rounded-[9px] bg-forest px-3.5 text-[12.5px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-60">
                  {addPending ? "Adding…" : "Add campus"}
                </button>
                {addState.error && <span className="text-[12px] font-medium text-red">{addState.error}</span>}
              </form>
            </div>

            {campuses.length > 0 && classes.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-4">Assign classes to campuses</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {classes.map((k) => (
                    <div key={k.id} className="flex items-center gap-2 rounded-[10px] border border-border px-3 py-2">
                      <span className="flex-1 truncate text-[12.5px] font-medium text-ink">{k.label}</span>
                      <select value={k.campusId ?? ""} onChange={(e) => assign(k.id, e.target.value)} className={input}>
                        <option value="">No campus</option>
                        {campuses.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
