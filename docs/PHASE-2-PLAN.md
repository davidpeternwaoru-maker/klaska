# Klaska — Phase 2 plan: Fees, Attendance & Results

> Status: **planning only.** Nothing here is built yet. We confirm the Phase 1
> foundation (School / Staff / Class / Student + auth) works against Neon first,
> then add these one feature at a time, reusing the exact same patterns.

This document is the map. It shows the new database tables we'll add, how they
connect to what already exists, who is allowed to do what, and the order to
build in.

---

## 0. The backbone we need first: Session & Term

Almost everything in a school repeats **every term**: you pay fees each term, you
take attendance each day *of a term*, and results belong to a term. So before
fees/attendance/results, we add a small backbone the others hang off:

```prisma
model Session {            // an academic year, e.g. "2025/2026"
  id        String   @id @default(cuid())
  schoolId  String
  name      String         // "2025/2026"
  isCurrent Boolean  @default(false)
  startDate DateTime?
  endDate   DateTime?
  terms     Term[]
}

model Term {               // First / Second / Third, inside a session
  id         String   @id @default(cuid())
  schoolId   String
  sessionId  String
  name       String        // "First Term"
  isCurrent  Boolean  @default(false)
  startDate  DateTime?
  endDate    DateTime?
}
```

Why it matters: a "current term" pointer means every page (fees, attendance,
results) automatically shows *this term* without the user re-selecting it.

---

## 1. Fees & Payments

**Real-world flow:** the school defines a fee structure (tuition, books, levies),
issues each student a bill for the term, then records payments (often partial)
until the bill is cleared.

```prisma
model FeeItem {            // the fee structure: one chargeable line
  id        String  @id @default(cuid())
  schoolId  String
  name      String         // "Tuition", "PTA levy", "Exam fee"
  amount    Int            // in kobo or naira — we'll standardise (see note)
  termId    String?        // optional: term-specific
  classId   String?        // optional: different fees per class/level
  mandatory Boolean @default(true)
}

model Invoice {            // a single student's bill for a term
  id        String   @id @default(cuid())
  schoolId  String
  studentId String
  termId    String
  status    String   @default("ISSUED") // ISSUED | PART_PAID | PAID | DRAFT
  lines     InvoiceLine[]
  payments  Payment[]
}

model InvoiceLine {        // the items that make up a bill
  id          String @id @default(cuid())
  invoiceId   String
  description String         // copied from FeeItem at issue time
  amount      Int
}

model Payment {            // money actually received
  id          String   @id @default(cuid())
  schoolId    String
  studentId   String
  invoiceId   String?
  amount      Int
  method      String         // CASH | TRANSFER | POS | CARD
  reference   String?        // teller no. / transfer ref
  paidAt      DateTime @default(now())
  recordedBy  String          // staffId of whoever logged it
}
```

- **Balance** isn't stored — it's computed: `sum(lines) − sum(payments)`. One
  source of truth, never out of sync.
- **Why copy the description into `InvoiceLine`?** So changing a `FeeItem`'s
  price next term never silently rewrites last term's bills.
- This powers the prototype's **Fees** and **Financial** pages with real data.

> **Money note:** we'll store amounts as **integers** (kobo) to avoid floating-
> point rounding errors, and format to ₦ in the UI. I'll explain this when we build it.

---

## 2. Attendance

**Real-world flow:** each class is marked present/absent daily.

```prisma
model Attendance {
  id         String   @id @default(cuid())
  schoolId   String
  studentId  String
  classId    String
  termId     String
  date       DateTime              // the school day
  status     String                // PRESENT | ABSENT | LATE | EXCUSED
  recordedBy String                // staffId
  @@unique([studentId, date])      // one record per student per day
}
```

- Marking a class = upsert one row per student for that date (so re-marking
  edits, never duplicates).
- Rolls up into the prototype's **Attendance** cards (rate %, per-class bars).
- A teacher marks only **their** class; the server action enforces it.

---

## 3. Results & Report Cards

**Real-world flow (Nigerian model):** per subject, per term — two continuous-
assessment scores + an exam, summed to a total, mapped to a grade. Aggregated
into a report card with position in class.

```prisma
model Subject {            // subjects the school offers
  id       String @id @default(cuid())
  schoolId String
  name     String          // "Mathematics"
  code     String?         // "MTH"
}

model Result {             // one student's score in one subject for one term
  id         String  @id @default(cuid())
  schoolId   String
  studentId  String
  subjectId  String
  termId     String
  ca1        Int?           // /20
  ca2        Int?           // /20
  exam       Int?           // /60
  total      Int?           // computed = ca1+ca2+exam
  grade      String?        // computed from total (A1, B2, …)
  remark     String?
  recordedBy String          // staffId
  @@unique([studentId, subjectId, termId])  // one score per subject/term
}
```

- `total` and `grade` are computed in the **server action** on save (same place
  we validate), so the stored row is always consistent.
- **Position in class** is computed at report time (rank students by average) —
  not stored, because it changes as scores are entered.
- This is what makes the prototype's **Report Cards & Results** and the printable
  **report card** real — driven by saved data instead of mock numbers.
- (Optional later: a `GradingBand` table so each school customises its own
  grade boundaries, like the prototype's settings.)

---

## How it all connects

```
School
 ├─ Session ── Term ──┬─ Invoice ── InvoiceLine
 │                    │         └─ Payment
 │                    ├─ Attendance
 │                    └─ Result ── Subject
 ├─ Staff ─────────────(records payments / attendance / results)
 ├─ Class ── Student ──(has invoices, attendance, results)
 └─ FeeItem
```

Every new table carries a `schoolId` (so data stays walled per school) and links
to a `termId` (so it's scoped to the right term) — exactly like Phase 1.

---

## Who can do what (roles)

| Action | Owner | Bursar | Teacher |
|---|---|---|---|
| Define fee structure, issue invoices, record payments | ✅ | ✅ | — |
| Mark attendance | ✅ | — | ✅ (their class) |
| Enter results | ✅ | — | ✅ (their class/subjects) |
| View reports & analytics | ✅ | ✅ | ✅ (their class) |

Enforced in the **server actions** (`requireUser()` + a role check), never just
hidden in the UI.

---

## Suggested build order (simplest → richest)

1. **Session / Term backbone** — small, unblocks everything; adds a "current term" switcher.
2. **Attendance** — the simplest daily loop; quick win, immediately useful.
3. **Fees & Payments** — high business value; invoices + payment logging.
4. **Subjects → Results → Report cards** — the most involved, and the biggest
   payoff (it lights up the report-card analysis you already designed).

Each one is the same recipe you've now seen once:
**schema → migration → server actions (scoped by school + role) → a `/dashboard`
page → a client table/form.** Once the foundation is confirmed, each feature is a
predictable repeat of that loop.
