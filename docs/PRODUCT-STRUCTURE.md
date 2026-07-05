# Klaska — Product Structure v1 (working copy)

Source: "Klaska Product Structure v1" (David Peter & Mensah Emmanuel, Lagos, Jul 2026).
This file tracks how the build maps to it. §3's future apps (teacher/parent/student)
are explicitly out of scope for now.

## §1 Principles
One core, many views · Role decides the view · Parents have no login (v1) ·
Offline-first (planned) · Feature-flagged modules.

## §2/§5 Roles & permissions — IMPLEMENTED
Six roles: OWNER, HOS, BURSAR, HOD, TEACHER, ADMIN (enum + matrix in
`src/lib/auth/permissions.ts`). Sidebar filters by role (`navForRole`);
teachers scoped to their assigned classes (`src/lib/auth/scope.ts`);
money pages guarded server-side.

## §4 Six groups — IMPLEMENTED (some pages still demo data)
Overview · Academics · People · Finance · Insights · Settings (+ Notifications).

## §6 Data spine — IMPLEMENTED (v1 shape)
School (session/term calendar) → Class/Arms (free-named) → Student (never
deleted) → events: Result & Attendance (term-tagged), Invoice→Payment, Notice log.

## §7 Flows
1. Onboarding wizard: profile → structure → classes → subjects → grading →
   fees (per class) → staff → review. ✅
2. Daily loop: attendance marking ✅ · absence alerts → Notice log ✅ ·
   payment recording ✅ (auto-match = virtual mode, later).
3. Termly loop: invoice generation ✅ · score entry ✅ · report cards from real
   data (next) · promotions (next).
4. Money loop: fees in ✅ · expenses/payroll + financial statements (next).

## §8 Build order status
1 Foundation ✅ · 2 Finance core ✅ (invoices, manual payments, defaulters) ·
3 Academic core ✅ attendance/scores, report cards NEXT · 4 Intelligence (next) ·
5 Tiered modules (later).
