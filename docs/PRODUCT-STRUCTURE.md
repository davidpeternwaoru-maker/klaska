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

## Scale spine & monetisation (PM addendum) — IMPLEMENTED
- **Guardian decoupling:** `Guardian` object deduped by normalised phone
  (digits-only, last 10) / email; single-add, edit and bulk import all link
  many students to ONE guardian — the backbone for SMS/payment links.
- **Multi-campus:** School → Campus → Class hierarchy. `multiCampus` flag
  (Enterprise-only) keeps it invisible for small schools; Owner manages
  campuses + assigns classes in Settings → Plan & campuses.
- **Tiering:** `School.tier` BASIC | ENTERPRISE with feature flags in
  `src/lib/tier.ts`. AI Engine gated to Enterprise (upgrade card for Basic);
  virtual accounts / cross-term flags reserved. Owner switches plan in Settings.
- **Onboarding funnel flipped:** Profile → Structure → Classes → **Students
  (import, the early win) → Staff** → Subjects → Grading → Fees → Review,
  with "Skip for now" on Subjects/Grading/Fees so nobody stalls.
- **Draft imports:** valid rows always import; broken rows stay in an editable
  in-app fix queue (inline name fixes → re-import).
