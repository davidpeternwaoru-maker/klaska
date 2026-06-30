"use client";

import { Card, SectionTitle, Pill, Button } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

const FEATURES = [
  { icon: "coins", title: "Parents pay in installments", body: "Flexible monthly plans for families — no large up-front burden." },
  { icon: "fees", title: "School is paid in full, upfront", body: "Klaska's licensed partners disburse the full term fee immediately." },
  { icon: "shield", title: "Underwritten on your own data", body: "Working-capital and payroll advances based on your real collection history." },
];

export function FinancingPage() {
  return (
    <div className="mx-auto max-w-[1320px]">
      <SectionTitle eyebrow="Finance" title="Embedded Financing" sub="The money engine — get paid in full, even when parents pay in bits." />

      {/* hero */}
      <Card className="overflow-hidden" style={{ background: "linear-gradient(135deg,#0f3812,#1b5e20)" }}>
        <div className="flex flex-wrap items-center justify-between gap-6 p-2 text-white">
          <div className="max-w-[560px]">
            <Pill tone="amber" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
              Coming soon
            </Pill>
            <h2 className="mt-3 font-display text-[26px] font-bold leading-tight tracking-[-0.02em]">
              Let parents pay school fees in flexible installments — while your school still receives fees in full, upfront.
            </h2>
            <p className="mt-2 text-[14px] text-white/75">
              Powered by licensed financing partners. Coming soon to Klaska.
            </p>
            <div className="mt-5">
              <Button kind="accent" size="md" icon="check">
                Join the waitlist
              </Button>
            </div>
          </div>
          <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-white/10 ring-1 ring-white/15">
            <Icon name="coins" size={56} style={{ color: "#fff" }} />
          </div>
        </div>
      </Card>

      <div className="mt-3 text-[12px] font-medium uppercase tracking-[0.08em] text-ink-4">Preview — not yet live</div>
      <div className="mt-3 grid grid-cols-1 gap-5 opacity-90 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <Card key={f.title} hover>
            <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-forest-soft text-forest">
              <Icon name={f.icon} size={20} />
            </span>
            <div className="mt-4 text-[15px] font-semibold text-ink">{f.title}</div>
            <p className="mt-1.5 text-[13px] text-ink-3">{f.body}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-5 flex items-center gap-3" style={{ background: "var(--color-amber-soft)", borderColor: "#f4ddb0" }}>
        <Icon name="alert" size={20} style={{ color: "var(--color-amber-2)" }} />
        <span className="text-[13px] font-medium text-amber-2">
          Live fund disbursement connects to a licensed financing partner. Everything else — plans, schedules, status tracking — will be fully functional at launch.
        </span>
      </Card>
    </div>
  );
}
