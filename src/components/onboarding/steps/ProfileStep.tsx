"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/primitives";
import { saveProfile } from "@/lib/actions/onboarding";
import type { WizardSchool } from "../types";
import { StepHead, Field, StepFooter, inputCls } from "../ui";

export function ProfileStep({ school, onDone, ctaLabel }: { school: WizardSchool; onDone: () => void; ctaLabel?: string }) {
  const [logo, setLogo] = useState<string | null>(school.logoUrl);
  const [form, setForm] = useState({
    name: school.name,
    shortName: school.shortName ?? "",
    motto: school.motto ?? "",
    address: school.address ?? "",
    email: school.email ?? "",
    phone: school.phone ?? "",
  });
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const upd = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function onLogo(file: File) {
    if (file.size > 500_000) {
      setError("Please choose an image under 500 KB.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result));
    reader.readAsDataURL(file);
  }

  const save = () =>
    start(async () => {
      setError(null);
      const res = await saveProfile({ ...form, logoUrl: logo });
      if (res.ok) onDone();
      else setError(res.error ?? "Could not save.");
    });

  return (
    <Card>
      <StepHead title="School profile & branding" sub="This appears on report cards, receipts and across the app." />
      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="flex flex-none flex-col items-center gap-2">
          <label className="flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-[16px] border-2 border-dashed border-border bg-secondary text-center transition hover:border-forest-line">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="School logo" className="h-full w-full object-contain" />
            ) : (
              <span className="px-2 text-[11px] text-ink-4">Upload logo</span>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onLogo(f); }} />
          </label>
          {logo && (
            <button onClick={() => setLogo(null)} className="text-[11px] text-ink-4 hover:text-red">
              Remove
            </button>
          )}
        </div>

        <div className="grid flex-1 grid-cols-2 gap-3">
          <Field label="School name *">
            <input className={inputCls} value={form.name} onChange={(e) => upd("name", e.target.value)} />
          </Field>
          <Field label="Short name">
            <input className={inputCls} value={form.shortName} onChange={(e) => upd("shortName", e.target.value)} placeholder="e.g. GIS" />
          </Field>
          <div className="col-span-2">
            <Field label="Motto">
              <input className={inputCls} value={form.motto} onChange={(e) => upd("motto", e.target.value)} placeholder="e.g. Knowledge & Character" />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Address">
              <input className={inputCls} value={form.address} onChange={(e) => upd("address", e.target.value)} placeholder="Street, city, state" />
            </Field>
          </div>
          <Field label="Email">
            <input className={inputCls} value={form.email} onChange={(e) => upd("email", e.target.value)} placeholder="admin@school.edu.ng" />
          </Field>
          <Field label="Phone">
            <input className={inputCls} value={form.phone} onChange={(e) => upd("phone", e.target.value)} />
          </Field>
        </div>
      </div>
      {error && <p className="mt-3 text-[12.5px] font-medium text-red">{error}</p>}
      <StepFooter pending={pending} onSave={save} cta={ctaLabel} />
    </Card>
  );
}
