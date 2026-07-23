"use client";

import { useState } from "react";
import { Button } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { transcriptOptionsAction, generateTranscriptAction } from "@/lib/actions/transcripts";
import { downloadTranscriptPDF, printTranscriptPDF } from "@/lib/export/transcript-pdf";

type Section = "SENIOR" | "JUNIOR" | "PRIMARY" | "EARLY";
type SectionOpt = { section: Section; label: string };

export function TranscriptDialog({ studentId, studentName }: { studentId: string; studentName: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<SectionOpt[] | null>(null);
  const [sessions, setSessions] = useState<string[]>([]);
  const [section, setSection] = useState<Section | "">("");
  const [range, setRange] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState<null | "download" | "print">(null);
  const [error, setError] = useState<string | null>(null);

  async function openDialog() {
    setOpen(true);
    setError(null);
    if (sections) return;
    setLoading(true);
    const res = await transcriptOptionsAction(studentId);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSections(res.options.sections);
    setSessions(res.options.sessionsAvailable);
    setSection(res.options.sections[0]?.section ?? "");
  }

  async function run(kind: "download" | "print") {
    if (!section) return;
    setBusy(kind);
    setError(null);
    const res = await generateTranscriptAction({
      studentId,
      section: section as Section,
      fromSession: range && from ? from : null,
      toSession: range && to ? to : null,
      remarks: remarks.trim() || null,
    });
    if (!res.ok) {
      setBusy(null);
      setError(res.error);
      return;
    }
    try {
      if (kind === "download") await downloadTranscriptPDF(res.data);
      else await printTranscriptPDF(res.data);
      setOpen(false);
    } catch {
      setError("Could not build the PDF. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Button kind="ghost" size="sm" icon="reports" onClick={openDialog}>
        Generate transcript
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" onClick={() => !busy && setOpen(false)}>
          <div className="w-full max-w-[480px] rounded-[var(--radius-lg)] border border-border bg-card p-6 shadow-[var(--shadow-3)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-heading font-semibold text-ink">Official transcript</div>
                <div className="mt-0.5 text-[12.5px] text-ink-4">{studentName}</div>
              </div>
              <button onClick={() => !busy && setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-card)] text-ink-4 transition hover:bg-secondary hover:text-ink">
                <Icon name="x" size={16} />
              </button>
            </div>

            {loading ? (
              <div className="py-10 text-center text-[13px] text-ink-4">Loading records…</div>
            ) : sections && sections.length === 0 ? (
              <div className="mt-5 rounded-[var(--radius-card)] bg-secondary p-4 text-[13px] text-ink-3">This student has no academic records to build a transcript from yet.</div>
            ) : (
              <>
                {/* section */}
                <label className="mt-5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-4">Section</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {sections?.map((s) => (
                    <button
                      key={s.section}
                      onClick={() => setSection(s.section)}
                      className={`rounded-[var(--radius-card)] border px-3 py-2 text-[13px] font-medium transition ${
                        section === s.section ? "border-forest bg-forest text-white" : "border-border bg-card text-ink-2 hover:bg-secondary"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* coverage */}
                <label className="mt-5 flex items-center gap-2 text-[13px] font-medium text-ink-2">
                  <input type="checkbox" checked={range} onChange={(e) => setRange(e.target.checked)} className="h-4 w-4 accent-[var(--color-forest)]" />
                  Limit to a session range (default: full history)
                </label>
                {range && (
                  <div className="mt-2 flex items-center gap-2">
                    <select value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 flex-1 rounded-[var(--radius-card)] border border-border bg-secondary px-2 text-[13px] outline-none focus:border-forest">
                      <option value="">From (earliest)</option>
                      {sessions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <span className="text-ink-4">→</span>
                    <select value={to} onChange={(e) => setTo(e.target.value)} className="h-9 flex-1 rounded-[var(--radius-card)] border border-border bg-secondary px-2 text-[13px] outline-none focus:border-forest">
                      <option value="">To (latest)</option>
                      {sessions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* remarks */}
                <label className="mt-5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-4">Remarks (optional)</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  placeholder="e.g. Issued for university admission."
                  className="mt-2 w-full rounded-[var(--radius-card)] border border-border bg-secondary p-2.5 text-[13px] outline-none focus:border-forest focus:bg-card"
                />

                {error && <p className="mt-3 text-[12.5px] font-medium text-red">{error}</p>}

                <div className="mt-6 flex items-center justify-end gap-2">
                  <Button kind="ghost" size="sm" onClick={() => !busy && setOpen(false)}>Cancel</Button>
                  <Button kind="soft" size="sm" icon="reports" disabled={!section || !!busy} onClick={() => run("print")}>
                    {busy === "print" ? "Preparing…" : "Print"}
                  </Button>
                  <Button kind="primary" size="sm" icon="download" disabled={!section || !!busy} onClick={() => run("download")}>
                    {busy === "download" ? "Building…" : "Download PDF"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
