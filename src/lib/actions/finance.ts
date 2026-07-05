"use server";

// Finance core (Flows 3 & 4): invoices + manual payments.
// "Term opens: invoices generated" → each student gets one bill for the term,
// snapshotted from their class's fee structure. The bursar records payments;
// balance = total − payments (computed, never stored — one source of truth).
// Only Owner and Bursar can touch money (Permission Matrix).

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { canManage } from "@/lib/auth/permissions";

export type FinanceState = { ok?: boolean; error?: string; created?: number };

function refreshFinance() {
  revalidatePath("/finance/fees");
  revalidatePath("/");
}

/** Generate this term's invoices for every student whose class has a fee
 *  structure and who doesn't already have a bill for the current term. */
export async function generateInvoices(): Promise<FinanceState> {
  const user = await requireUser();
  if (!canManage(user.role, "fees")) return { error: "Only the owner or bursar can generate invoices." };

  const school = await prisma.school.findUnique({ where: { id: user.schoolId }, select: { session: true, term: true } });
  if (!school?.session || !school.term) return { error: "Set your session & term in Settings first." };

  const [students, feeItems, classFees, existing] = await Promise.all([
    prisma.student.findMany({ where: { schoolId: user.schoolId, classId: { not: null } }, select: { id: true, classId: true } }),
    prisma.feeItem.findMany({ where: { schoolId: user.schoolId }, orderBy: { order: "asc" } }),
    prisma.classFee.findMany({ where: { schoolId: user.schoolId } }),
    prisma.invoice.findMany({ where: { schoolId: user.schoolId, session: school.session, term: school.term }, select: { studentId: true } }),
  ]);

  const feeName = new Map(feeItems.map((f) => [f.id, f.name]));
  // classId -> [{description, amount}]
  const linesByClass = new Map<string, { description: string; amount: number }[]>();
  for (const cf of classFees) {
    if (cf.amount <= 0) continue;
    const arr = linesByClass.get(cf.classId) ?? [];
    arr.push({ description: feeName.get(cf.feeItemId) ?? "Fee", amount: cf.amount });
    linesByClass.set(cf.classId, arr);
  }
  const already = new Set(existing.map((e) => e.studentId));

  let created = 0;
  for (const s of students) {
    if (already.has(s.id)) continue;
    const lines = linesByClass.get(s.classId!) ?? [];
    if (lines.length === 0) continue; // class has no fee structure yet
    const total = lines.reduce((t, l) => t + l.amount, 0);
    await prisma.invoice.create({
      data: {
        schoolId: user.schoolId,
        studentId: s.id,
        session: school.session,
        term: school.term,
        total,
        lines: { create: lines },
      },
    });
    created++;
  }

  refreshFinance();
  return created > 0 ? { ok: true, created } : { error: "No new invoices to create — everyone is billed (or classes have no fees set)." };
}

/** Record a manual payment against an invoice (cash / transfer / POS). */
export async function recordPayment(_prev: FinanceState, formData: FormData): Promise<FinanceState> {
  const user = await requireUser();
  if (!canManage(user.role, "fees")) return { error: "Only the owner or bursar can record payments." };

  const invoiceId = String(formData.get("invoiceId") ?? "");
  const amount = Math.round(Number(formData.get("amount")) || 0);
  const method = String(formData.get("method") ?? "CASH");
  const reference = String(formData.get("reference") ?? "").trim() || null;
  if (!invoiceId) return { error: "Missing invoice." };
  if (amount <= 0) return { error: "Enter an amount greater than zero." };
  if (!["CASH", "TRANSFER", "POS"].includes(method)) return { error: "Pick a payment method." };

  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, schoolId: user.schoolId } });
  if (!invoice) return { error: "Invoice not found." };

  await prisma.payment.create({
    data: { schoolId: user.schoolId, studentId: invoice.studentId, invoiceId, amount, method, reference, recordedBy: user.name },
  });
  refreshFinance();
  return { ok: true };
}

export async function deletePayment(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!canManage(user.role, "fees")) return;
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.payment.deleteMany({ where: { id, schoolId: user.schoolId } });
  refreshFinance();
}
