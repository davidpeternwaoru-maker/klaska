"use server";

// Transcript Server Actions. Every call re-derives the session server-side and
// delegates to transcriptService, which enforces the "transcripts" matrix
// (OWNER/HOS/ADMIN). Hiding the UI is NOT the guard — this is.

import { requireCtx, ServiceError } from "@/server/context";
import { generateTranscript, getTranscriptOptions, type TranscriptData } from "@/server/services/transcripts";

type Section = "SENIOR" | "JUNIOR" | "PRIMARY" | "EARLY";

export async function transcriptOptionsAction(
  studentId: string,
): Promise<{ ok: true; options: Awaited<ReturnType<typeof getTranscriptOptions>> } | { ok: false; error: string }> {
  const ctx = await requireCtx();
  try {
    const options = await getTranscriptOptions(ctx, studentId);
    return { ok: true, options };
  } catch (e) {
    if (e instanceof ServiceError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function generateTranscriptAction(input: {
  studentId: string;
  section: Section;
  fromSession?: string | null;
  toSession?: string | null;
  remarks?: string | null;
}): Promise<{ ok: true; data: TranscriptData } | { ok: false; error: string }> {
  const ctx = await requireCtx();
  try {
    const data = await generateTranscript(ctx, input);
    return { ok: true, data };
  } catch (e) {
    if (e instanceof ServiceError) return { ok: false, error: e.message };
    throw e;
  }
}
