"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

export function ResultsControls({
  classes,
  subjects,
  classId,
  subjectId,
}: {
  classes: { value: string; label: string }[];
  subjects: { value: string; label: string }[];
  classId: string;
  subjectId: string;
}) {
  const router = useRouter();
  const go = (c: string, s: string) => router.push(`/dashboard/results?classId=${encodeURIComponent(c)}&subjectId=${encodeURIComponent(s)}`);
  const ctrl = "h-9 rounded-[9px] border border-border bg-secondary px-2.5 text-[13px] text-ink outline-none focus:border-forest-line focus:bg-card";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="flex items-center gap-1.5 text-[12.5px] text-ink-4">
        <Icon name="filter" size={15} /> Class
      </span>
      <select value={classId} onChange={(e) => go(e.target.value, subjectId)} className={ctrl}>
        {classes.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>
      <span className="flex items-center gap-1.5 text-[12.5px] text-ink-4">
        <Icon name="book" size={15} /> Subject
      </span>
      <select value={subjectId} onChange={(e) => go(classId, e.target.value)} className={ctrl}>
        {subjects.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </div>
  );
}
