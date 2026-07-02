"use server";

// Notifications + fee-collection preferences. Notices are stored as the
// school's message log; delivery channels (SMS/WhatsApp/email) connect later.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { denyUnless, CAN_MANAGE_STAFF } from "@/lib/auth/guard";

export type ActionState = { ok?: boolean; error?: string };

const AUDIENCES = ["ALL_STAFF", "TEACHERS", "BURSARS", "PARENTS"] as const;

export async function sendNotice(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const denied = denyUnless(user, ...CAN_MANAGE_STAFF); // owners & bursars can message
  if (denied) return denied;

  const audience = String(formData.get("audience") ?? "");
  const title = String(formData.get("title") ?? "").trim() || null;
  const body = String(formData.get("body") ?? "").trim();
  if (!(AUDIENCES as readonly string[]).includes(audience)) return { error: "Pick who to message." };
  if (!body) return { error: "Write a message first." };

  await prisma.notice.create({ data: { schoolId: user.schoolId, audience, title, body, sentBy: user.name } });
  revalidatePath("/settings/notifications");
  return { ok: true };
}

export async function deleteNotice(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (denyUnless(user, ...CAN_MANAGE_STAFF)) return;
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.notice.deleteMany({ where: { id, schoolId: user.schoolId } });
  revalidatePath("/settings/notifications");
}

/** Fee-collection mode + automatic fee reminders. */
export async function saveFeePrefs(data: { feeCollection: string; autoFeeReminders: boolean }): Promise<ActionState> {
  const user = await requireUser();
  const denied = denyUnless(user, "OWNER");
  if (denied) return denied;
  const mode = data.feeCollection === "VIRTUAL" ? "VIRTUAL" : "MANUAL";
  await prisma.school.update({
    where: { id: user.schoolId },
    data: { feeCollection: mode, autoFeeReminders: !!data.autoFeeReminders },
  });
  revalidatePath("/settings");
  revalidatePath("/settings/notifications");
  revalidatePath("/finance/fees");
  return { ok: true };
}
