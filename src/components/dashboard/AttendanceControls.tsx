"use client";

// Class + date picker. Changing either pushes a new URL, which re-runs the
// Attendance page (a Server Component) to load the right students and marks.

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

export function AttendanceControls({
  classes,
  classId,
  date,
  basePath = "/dashboard/attendance",
}: {
  classes: { value: string; label: string }[];
  classId: string;
  date: string;
  basePath?: string;
}) {
  const router = useRouter();
  const go = (nextClass: string, nextDate: string) =>
    router.push(`${basePath}?classId=${encodeURIComponent(nextClass)}&date=${nextDate}`);

  const ctrl = "h-9 rounded-[9px] border border-border bg-secondary px-2.5 text-[13px] text-ink outline-none focus:border-forest-line focus:bg-card";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="flex items-center gap-1.5 text-[12.5px] text-ink-4">
        <Icon name="filter" size={15} /> Class
      </span>
      <select value={classId} onChange={(e) => go(e.target.value, date)} className={ctrl}>
        {classes.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <span className="flex items-center gap-1.5 text-[12.5px] text-ink-4">
        <Icon name="calendar" size={15} /> Date
      </span>
      <input type="date" value={date} onChange={(e) => go(classId, e.target.value)} className={ctrl} />
    </div>
  );
}
