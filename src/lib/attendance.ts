// Plain shared module (no "use server"), so both the server action and the
// client UI can import these constants and types.

export const ATT_STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;
export type AttendanceStatus = (typeof ATT_STATUSES)[number];

export const ATT_META: Record<AttendanceStatus, { label: string; short: string; tone: "green" | "red" | "amber" | "neutral" }> = {
  PRESENT: { label: "Present", short: "P", tone: "green" },
  ABSENT: { label: "Absent", short: "A", tone: "red" },
  LATE: { label: "Late", short: "L", tone: "amber" },
  EXCUSED: { label: "Excused", short: "E", tone: "neutral" },
};

export type SaveAttendanceResult = { ok?: boolean; error?: string; saved?: number };
