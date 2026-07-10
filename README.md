# Klaska — School Operating System 🇳🇬

A **multi-tenant SaaS** for Nigerian private schools: enrolment, attendance, results & report cards, fees & payments, financial analytics and role-based access — one core, many views.

**Live demo:** https://klaska-mu.vercel.app

| Try it as… | Email | Password |
|---|---|---|
| School owner (full access) | `owner@klaskademo.com` | `demo1234` |
| Teacher (own class only) | `teacher@klaskademo.com` | `demo1234` |
| Bursar (finance view) | `bursar@klaskademo.com` | `demo1234` |

> Log in as the **owner**, then in another tab as the **teacher** — and watch the entire app reshape itself around the role: the money disappears, the teacher sees only their own class, their own students, their own analysis. Or sign up your own school and run the onboarding wizard.

---

## What's built

- **Onboarding wizard** — a new school configures itself in minutes: profile & logo, sections it runs (Crèche→SSS 3), classes with free-named arms (incl. SSS departments), subjects, an editable Nigerian grading scale (WAEC A1–F9), per-class fee structure, staff with roles. Students import from **.xlsx/.csv** with a draft "fix queue" for broken rows.
- **Guardian deduplication** — one parent with 5 children (and 5 typos of their name) resolves to **one Guardian object**, matched on normalised phone/email. The backbone for per-parent SMS & payment links.
- **Role-based access (6 roles)** — Owner, Principal, Bursar, HOD, Teacher, Admin Officer. A central permission matrix drives navigation, page guards, *and* server-action enforcement. Each role gets its own Overview dashboard.
- **Academics** — daily attendance (term-tagged), CA1/CA2/Exam score entry with live grading, **printable terminal report cards** (position in class, class averages, the school's own grading key), class-by-class analysis with Excel broadsheets.
- **Finance** — per-class fee structures, one-click term invoicing, payment recording with balances & defaulters, expense tracking, live revenue/cost/profit dashboards, tax summary, formatted Excel statements.
- **AI Outcomes Engine** *(Enterprise tier)* — readiness scores from real marks + attendance, at-risk flags, per-class breakdowns and concrete intervention suggestions.
- **Tiering & feature flags** — Basic vs Enterprise plans gate modules (AI, multi-campus School→Campus hierarchy) without forking the core.
- **Nigerian academic calendar** — sessions & three terms auto-detected, editable, stamped on every score/attendance/invoice.

## Stack

**React 19 · Next.js 16 (App Router, Server Components + Server Actions) · TypeScript · Tailwind CSS v4 · Prisma 6 · PostgreSQL (Neon) · Vercel**

Auth is hand-rolled and readable: bcrypt password hashing, JWT sessions in httpOnly cookies (`jose`), edge middleware guarding routes, per-request role checks. Excel exports via ExcelJS.

## Architecture notes

```
src/
├─ app/                  # routes (Server Components fetch; pages are thin)
├─ components/           # design system + feature UIs ("use client" islands)
├─ lib/
│  ├─ auth/              # jwt, sessions, permission MATRIX, class scoping
│  ├─ actions/           # Server Actions: every DB write, school-scoped + role-guarded
│  ├─ tier.ts            # feature flags (Basic/Enterprise)
│  └─ analysis / ai-real / reportcard  # computed intelligence from real records
└─ prisma/schema.prisma  # multi-tenant spine: School → Campus → Class → Student
                         #   + Guardian, Result, Attendance, Invoice→Payment, Expense…
```

**Principles:** one record, many views · every query scoped by `schoolId` (tenant isolation) · role decides the view (enforced server-side, not hidden client-side) · balances/positions computed, never stored.

Product spec lives in [`docs/PRODUCT-STRUCTURE.md`](docs/PRODUCT-STRUCTURE.md); an end-to-end verification script (`scripts/verify-journey.cjs`) exercises 17 checks against a live instance — signup-to-report-card, permission matrix included.

## Status

In active development toward pilot with real schools. Shipped and verified: everything above. On the roadmap: payment-gateway virtual accounts (Paystack/Flutterwave), SMS/WhatsApp delivery for parent notices, payroll, HOD approval workflows, cross-term retention analytics, teacher mobile app (React Native).

## Running locally

```bash
npm install
cp .env.example .env   # add a Postgres URL (Neon) + AUTH_SECRET
npm run db:migrate
npm run dev            # http://localhost:3000
```

---

Built by **David Peter** · Lagos, Nigeria.
