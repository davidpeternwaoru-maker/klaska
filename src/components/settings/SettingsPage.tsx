"use client";

import { useState } from "react";
import { Card, SectionTitle, Button } from "@/components/ui/primitives";
import { Icon, type IconName } from "@/components/ui/Icon";
import { SCHOOL } from "@/data/overview";
import { STAFF } from "@/data/people";
import { LEVEL_KEYS, useSchoolConfig, updateConfig, type Department } from "@/lib/config/schoolConfig";

type PanelId = "profile" | "levels" | "classes" | "departments" | "feemode" | "roles" | "staff" | "grading" | "notif" | "branding";
const PANELS: { id: PanelId; label: string; icon: IconName; title: string; sub: string }[] = [
  { id: "profile", label: "School profile", icon: "reports", title: "School profile", sub: "Identity shown across the dashboard, notifications and report cards." },
  { id: "levels", label: "School levels", icon: "layers", title: "School levels", sub: "Choose which sections your school runs." },
  { id: "classes", label: "Classes & arms", icon: "students", title: "Classes & arms", sub: "Rename levels, manage arms, and toggle levels on or off." },
  { id: "departments", label: "SS Departments", icon: "book", title: "Senior Secondary departments", sub: "Rename or add departments for SSS 1–3." },
  { id: "feemode", label: "Fee collection", icon: "card", title: "Fee collection mode", sub: "How payments are collected and reflected." },
  { id: "roles", label: "Roles & access", icon: "badge", title: "Roles & access", sub: "Control what each role can see and do." },
  { id: "staff", label: "Staff management", icon: "students", title: "Staff management", sub: "Add staff and assign roles & departments." },
  { id: "grading", label: "Grading setup", icon: "reports", title: "Grading setup", sub: "CA / exam weighting and grade boundaries." },
  { id: "notif", label: "Notifications", icon: "bell", title: "Notifications", sub: "Choose which alerts parents and staff receive." },
  { id: "branding", label: "Branding", icon: "sparkle", title: "Branding", sub: "Colours and logo on report cards & receipts." },
];

export function SettingsPage() {
  const [tab, setTab] = useState<PanelId>("profile");
  const meta = PANELS.find((p) => p.id === tab)!;

  return (
    <div className="mx-auto max-w-[1320px]">
      <SectionTitle eyebrow="Settings" title="School configuration" sub="Everything here is live — toggles flip, forms save, and changes reflect across Klaska." />
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {/* left icon menu */}
        <Card pad={12} className="lg:w-[260px] lg:flex-none">
          <div className="flex flex-row flex-wrap gap-1 lg:flex-col">
            {PANELS.map((p) => (
              <button
                key={p.id}
                onClick={() => setTab(p.id)}
                className={`flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[13.5px] font-medium transition ${
                  tab === p.id ? "bg-forest text-white shadow-[0_4px_14px_-6px_rgba(27,94,32,0.5)]" : "text-ink-2 hover:bg-secondary"
                }`}
              >
                <Icon name={p.icon} size={17} /> {p.label}
              </button>
            ))}
          </div>
        </Card>

        {/* right panel */}
        <Card pad={0} className="min-w-0 flex-1 overflow-hidden">
          <div className="border-b border-border px-6 py-5">
            <div className="font-display text-[18px] font-semibold text-ink">{meta.title}</div>
            <div className="mt-0.5 text-[13px] text-ink-3">{meta.sub}</div>
          </div>
          <div className="px-6 py-6">
            {tab === "profile" && <ProfilePanel />}
            {tab === "levels" && <LevelsPanel />}
            {tab === "classes" && <ClassesPanel />}
            {tab === "departments" && <DepartmentsPanel />}
            {tab === "feemode" && <FeeModePanel />}
            {tab === "roles" && <RolesPanel />}
            {tab === "staff" && <StaffPanel />}
            {tab === "grading" && <GradingPanel />}
            {tab === "notif" && <NotifPanel />}
            {tab === "branding" && <BrandingPanel />}
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border bg-secondary/40 px-6 py-4">
            <Button kind="ghost" size="sm">
              Reset
            </Button>
            <Button kind="primary" size="sm" icon="check">
              Save changes
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function TInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-11 w-full rounded-[10px] border border-border bg-card px-3.5 text-[14px] text-ink outline-none transition placeholder:text-ink-4 focus:border-forest focus:shadow-[var(--ring-focus)]"
    />
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[12.5px] font-medium text-ink-3">{label}</div>
      {children}
    </div>
  );
}
function Toggle({ on }: { on: boolean }) {
  return (
    <span className={`flex h-6 w-10 flex-none items-center rounded-full px-0.5 transition ${on ? "justify-end bg-forest" : "justify-start bg-line-2"}`}>
      <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
    </span>
  );
}

function ProfilePanel() {
  const [p, setP] = useState({ name: SCHOOL.name, motto: "Knowledge. Discipline. Excellence.", contact: "+234 801 234 5678", address: "12 Admiralty Way, Lekki Phase 1, Lagos", email: "admin@greenfield.ng", session: SCHOOL.session, term: SCHOOL.term });
  const f = (k: keyof typeof p, v: string) => setP((s) => ({ ...s, [k]: v }));
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-[14px] bg-forest font-display text-[20px] font-bold text-white">{SCHOOL.shortName}</span>
        <div>
          <Button kind="ghost" size="sm" icon="upload">
            Change logo
          </Button>
          <div className="mt-1.5 text-[12px] text-ink-4">PNG or SVG, square, 1024×1024 recommended.</div>
        </div>
      </div>
      <Field label="School name">
        <TInput value={p.name} onChange={(v) => f("name", v)} />
      </Field>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field label="Motto">
          <TInput value={p.motto} onChange={(v) => f("motto", v)} />
        </Field>
        <Field label="Contact phone">
          <TInput value={p.contact} onChange={(v) => f("contact", v)} />
        </Field>
      </div>
      <Field label="Address">
        <TInput value={p.address} onChange={(v) => f("address", v)} />
      </Field>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Field label="Email">
          <TInput value={p.email} onChange={(v) => f("email", v)} />
        </Field>
        <Field label="Session">
          <TInput value={p.session} onChange={(v) => f("session", v)} />
        </Field>
        <Field label="Current term">
          <select value={p.term} onChange={(e) => f("term", e.target.value)} className="h-11 w-full rounded-[10px] border border-border bg-card px-3 text-[14px] outline-none focus:border-forest">
            <option>1st Term</option>
            <option>2nd Term</option>
            <option>3rd Term</option>
          </select>
        </Field>
      </div>
    </div>
  );
}

function LevelsPanel() {
  const [on, setOn] = useState<Record<string, boolean>>({ early: true, primary: true, secondary: true });
  const items = [
    ["early", "Nursery / Early Years", "Crèche, KG 1–2, Nursery 1–2"],
    ["primary", "Primary", "Primary 1–6"],
    ["secondary", "Secondary", "JSS 1 – SSS 3"],
  ];
  return (
    <div className="flex flex-col gap-3">
      {items.map(([k, t, d]) => (
        <button key={k} onClick={() => setOn((s) => ({ ...s, [k]: !s[k] }))} className={`flex items-center justify-between rounded-[12px] border p-4 text-left transition ${on[k] ? "border-forest-line bg-forest-soft" : "border-border bg-card"}`}>
          <span>
            <span className="block text-[14px] font-semibold text-ink">{t}</span>
            <span className="block text-[12px] text-ink-4">{d}</span>
          </span>
          <Toggle on={on[k]} />
        </button>
      ))}
    </div>
  );
}

function ClassesPanel() {
  const cfg = useSchoolConfig();
  const setLabel = (level: string, v: string) => updateConfig({ classLabels: { ...cfg.classLabels, [level]: v } });
  const toggleLevel = (level: string) => updateConfig({ disabledLevels: cfg.disabledLevels.includes(level) ? cfg.disabledLevels.filter((x) => x !== level) : [...cfg.disabledLevels, level] });
  const armsOf = (level: string) => cfg.arms[level] ?? ["A", "B"];
  const setArms = (level: string, arms: string[]) => updateConfig({ arms: { ...cfg.arms, [level]: arms } });
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[13px] text-ink-3">Rename a level&apos;s display label (e.g. &ldquo;Primary 1&rdquo; → &ldquo;Year 1&rdquo;), manage arms, or turn a level off. Order stays fixed so promotion works.</p>
      {LEVEL_KEYS.map((level) => {
        const enabled = !cfg.disabledLevels.includes(level);
        const arms = armsOf(level);
        return (
          <div key={level} className={`flex flex-wrap items-center gap-2.5 rounded-[12px] border border-border p-3 ${enabled ? "" : "opacity-55"}`}>
            <span className="w-20 flex-none text-[11.5px] font-medium text-ink-4">{level}</span>
            <input value={cfg.classLabels[level] ?? ""} onChange={(e) => setLabel(level, e.target.value)} placeholder={`Display: ${level}`} className="h-9 w-36 rounded-[9px] border border-border bg-card px-2.5 text-[13px] outline-none focus:border-forest" />
            <div className="flex flex-wrap items-center gap-1.5">
              {arms.map((a) => (
                <span key={a} className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[12px] font-medium text-ink-2">
                  {a}
                  <button onClick={() => setArms(level, arms.filter((x) => x !== a))} className="text-ink-4 hover:text-red">
                    <Icon name="x" size={11} />
                  </button>
                </span>
              ))}
              <button onClick={() => setArms(level, [...arms, String.fromCharCode(65 + arms.length)])} className="rounded-full border border-border px-2 py-1 text-[12px] font-medium text-forest hover:bg-forest-soft">
                + arm
              </button>
            </div>
            <button onClick={() => toggleLevel(level)} className="ml-auto">
              <Toggle on={enabled} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function DepartmentsPanel() {
  const cfg = useSchoolConfig();
  const setName = (id: string, name: string) => updateConfig({ departments: cfg.departments.map((d) => (d.id === id ? { ...d, name } : d)) });
  const remove = (id: string) => updateConfig({ departments: cfg.departments.filter((d) => d.id !== id) });
  const add = () => updateConfig({ departments: [...cfg.departments, { id: `dept_${Date.now()}`, name: "New department" } as Department] });
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[13px] text-ink-3">Departments apply only to SSS 1–3. Rename them (e.g. &ldquo;Arts&rdquo; → &ldquo;Humanities&rdquo;) — the names reflect in profiles, report cards and analysis.</p>
      {cfg.departments.map((d) => (
        <div key={d.id} className="flex items-center gap-2.5 rounded-[12px] border border-border p-2.5">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-forest-soft text-forest">
            <Icon name="book" size={17} />
          </span>
          <input value={d.name} onChange={(e) => setName(d.id, e.target.value)} className="h-9 flex-1 rounded-[9px] border border-border bg-card px-2.5 text-[14px] font-medium outline-none focus:border-forest" />
          <button onClick={() => remove(d.id)} className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-border text-red transition hover:bg-secondary">
            <Icon name="trash" size={15} />
          </button>
        </div>
      ))}
      <button onClick={add} className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-[10px] border border-border px-3 py-2 text-[13px] font-medium text-forest transition hover:bg-forest-soft">
        <Icon name="plus" size={15} /> Add department
      </button>
    </div>
  );
}

function FeeModePanel() {
  const [mode, setMode] = useState("automatic");
  const opts = [
    ["automatic", "Automatic (virtual accounts)", "Each student has a dedicated virtual account; payments match and reflect instantly."],
    ["manual", "Manual recording", "Bursar records cash/transfer payments in a few taps — same records & reports."],
  ];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {opts.map(([id, t, body]) => (
        <button key={id} onClick={() => setMode(id)} className={`rounded-[14px] border p-5 text-left transition ${mode === id ? "border-forest bg-forest-soft" : "border-border bg-card hover:bg-secondary"}`}>
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-ink">{t}</span>
            {mode === id && <Icon name="check" size={17} style={{ color: "var(--color-forest)" }} />}
          </div>
          <p className="mt-1.5 text-[12.5px] text-ink-3">{body}</p>
        </button>
      ))}
    </div>
  );
}

const ROLES = ["Owner", "Principal", "Bursar", "Teacher", "HOD"] as const;
const PAGES = ["Overview", "Academics", "Students", "Attendance", "Fees", "Financial System", "Insights", "Settings"];
const DEFAULTS: Record<string, string[]> = {
  Owner: PAGES,
  Principal: ["Overview", "Academics", "Students", "Attendance", "Insights", "Settings"],
  Bursar: ["Overview", "Fees", "Financial System", "Settings"],
  Teacher: ["Overview", "Academics", "Students", "Attendance"],
  HOD: ["Overview", "Academics", "Students", "Attendance", "Insights"],
};
function RolesPanel() {
  const [role, setRole] = useState<string>("Principal");
  const [perms, setPerms] = useState<Record<string, string[]>>(DEFAULTS);
  const toggle = (page: string) =>
    setPerms((p) => {
      const cur = p[role] || [];
      return { ...p, [role]: cur.includes(page) ? cur.filter((x) => x !== page) : [...cur, page] };
    });
  const locked = role === "Owner";
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-[13px] text-ink-3">Editing access for</span>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="h-9 rounded-[10px] border border-border bg-card px-3 text-[13px] font-medium outline-none focus:border-forest">
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PAGES.map((page) => {
          const on = (perms[role] || []).includes(page);
          return (
            <button key={page} disabled={locked} onClick={() => toggle(page)} className={`flex items-center justify-between rounded-[10px] border px-3.5 py-2.5 text-[13px] font-medium transition ${on ? "border-forest-line bg-forest-soft text-forest" : "border-border bg-card text-ink-3"} ${locked ? "opacity-70" : ""}`}>
              {page}
              <Toggle on={on} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StaffPanel() {
  return (
    <div className="flex flex-col gap-2.5">
      {STAFF.map((s) => (
        <div key={s.id} className="flex items-center gap-3 rounded-[12px] border border-border p-3">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-forest-soft font-display text-[12px] font-semibold text-forest">
            {s.name.replace(/^(Mrs|Mr|Ms|Dr)\.?\s+/i, "").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-medium text-ink">{s.name}</span>
            <span className="block text-[12px] text-ink-4">{s.role}{s.department ? ` · ${s.department}` : ""}</span>
          </span>
          <button className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-border text-ink-3 transition hover:bg-secondary">
            <Icon name="edit" size={15} />
          </button>
        </div>
      ))}
      <button className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-[10px] border border-border px-3 py-2 text-[13px] font-medium text-forest transition hover:bg-forest-soft">
        <Icon name="plus" size={15} /> Add staff
      </button>
    </div>
  );
}

function GradingPanel() {
  const [w, setW] = useState({ ca1: 20, ca2: 20, exam: 60 });
  const sum = w.ca1 + w.ca2 + w.exam;
  return (
    <div>
      <div className="grid grid-cols-3 gap-4">
        {(["ca1", "ca2", "exam"] as const).map((k) => (
          <Field key={k} label={k === "exam" ? "Exam (%)" : `${k.toUpperCase()} (%)`}>
            <input type="number" value={w[k]} onChange={(e) => setW((s) => ({ ...s, [k]: +e.target.value || 0 }))} className="h-11 w-full rounded-[10px] border border-border bg-card px-3.5 text-[14px] outline-none focus:border-forest" />
          </Field>
        ))}
      </div>
      <div className={`mt-3 text-[13px] font-medium ${sum === 100 ? "text-forest" : "text-red"}`}>Total: {sum}% {sum === 100 ? "✓" : "(should equal 100%)"}</div>
      <div className="mt-6 text-[12px] font-medium uppercase tracking-[0.06em] text-ink-4">Grade boundaries (WAEC A1–F9)</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {["A1 ≥75", "B2 ≥70", "B3 ≥65", "C4 ≥60", "C6 ≥50", "D7 ≥45", "F9 <45"].map((g) => (
          <span key={g} className="rounded-full bg-secondary px-2.5 py-1 text-[12px] font-medium text-ink-2">{g}</span>
        ))}
      </div>
    </div>
  );
}

function NotifPanel() {
  const [n, setN] = useState<Record<string, boolean>>({ arrival: true, results: true, fees: true, staff: false });
  const items = [
    ["arrival", "Arrival alerts to parents"],
    ["results", "Results published"],
    ["fees", "Fee reminders & receipts"],
    ["staff", "Staff announcements"],
  ];
  return (
    <div className="flex flex-col gap-2.5">
      {items.map(([k, label]) => (
        <button key={k} onClick={() => setN((s) => ({ ...s, [k]: !s[k] }))} className="flex items-center justify-between rounded-[12px] border border-border bg-card px-4 py-3 text-[13.5px] font-medium text-ink transition hover:bg-secondary">
          <span>{label}</span>
          <Toggle on={n[k]} />
        </button>
      ))}
    </div>
  );
}

function BrandingPanel() {
  const colors = ["#1b5e20", "#0f766e", "#1e4fa8", "#7c3aed", "#b91c1c"];
  const [c, setC] = useState(colors[0]);
  return (
    <div>
      <div className="flex gap-2.5">
        {colors.map((col) => (
          <button key={col} onClick={() => setC(col)} className="h-10 w-10 rounded-[12px] transition" style={{ background: col, outline: c === col ? "2px solid var(--color-ink)" : "none", outlineOffset: 2 }} />
        ))}
      </div>
      <div className="mt-6 rounded-[14px] border border-border p-5" style={{ borderTopColor: c, borderTopWidth: 3 }}>
        <div className="text-[15px] font-semibold text-ink">{SCHOOL.name}</div>
        <div className="mt-1 text-[12.5px] text-ink-4">Report card · {SCHOOL.session}</div>
      </div>
    </div>
  );
}
