# Getting Klaska pilot-ready — what to build next, and why

> The question that matters now: not "what feature is cool," but **"what does a
> real school need before it can sign up, load its real data, trust it, and get
> value in the first week?"** Everything below is ordered by that test.

---

## Where we are

✅ A school can sign up (becomes Owner) · staff log in with roles · Owner/Bursar/
Teacher · CRUD for School, Staff, Class, Student — all multi-tenant (scoped per
school). This is a real foundation. But it is a **developer's foundation**, not
yet a **school's product**. Here's the gap.

## The gap between "works" and "a school can test it"

1. **Empty + tedious.** A new school logs in to nothing, and must hand-type
   hundreds of students. No real school will do this. **→ bulk import + onboarding.**
2. **Not reachable.** Schools can't sign up to `localhost`. **→ deploy to a URL.**
3. **Not yet trustworthy with real data.** Password resets, careful tenant
   isolation, no accidental cross-school leakage. **→ harden auth & scoping.**
4. **No "aha" yet.** Records alone don't sell. One feature must deliver visible
   value fast. **→ a flagship feature (attendance or report cards).**

---

## The immediate next build: **Onboarding & Bulk Student Import**

If I could build only one more thing before putting Klaska in front of a real
school, it's this. Reasoning:

- A school's data already lives in a **spreadsheet**. Let them upload it and have
  400 students in 30 seconds. This is the single biggest difference between a
  *demo* and a *usable product*. Every later feature (attendance, fees, results)
  is valuable **with** real students loaded and worthless without them.
- It's low-risk: it extends the Students feature we already built, same patterns.
- **No new dependencies** — we read uploaded `.xlsx` with **ExcelJS, which is
  already installed** (so the flaky network can't block it). We can also accept
  plain CSV with a tiny hand-written parser.

**What it includes**
- An **"Import students"** screen: download a template → upload filled `.xlsx`/CSV
  → preview a table → fix errors inline → confirm → bulk insert (auto-creating any
  missing classes, generating admission numbers).
- A **setup checklist** on the dashboard for a brand-new school:
  `1. Add your classes → 2. Add staff → 3. Import students`, with progress ticks.
- Friendly **empty states** everywhere ("No students yet — import a list or add one").

This turns the first ten minutes from confusing-and-empty into
guided-and-populated.

---

## Riding alongside (non-negotiable before real data): auth & tenancy hardening

Not glamorous, but required the moment real schools' data is involved — and doable
**without email infrastructure** (so the network doesn't block us):

- **Owner-managed password reset** — Owner/Bursar can reset a staff member's
  password from the Staff page (no email service needed for the pilot).
- **Tenant-isolation audit** — confirm every single query is filtered by
  `schoolId` (one missed filter = School A sees School B). Add a tiny helper so
  it's impossible to forget.
- **Sensible limits** — basic rate-limit on login, email-format/password rules,
  duplicate-guarding. (Full email verification can wait for post-pilot.)

---

## Then: the flagship feature (pick one to ship first)

| Option | Value to a school | Effort | When |
|---|---|---|---|
| **Attendance** | Daily engagement; teachers use it every morning; instant "rate" insight | Low | **Ship first** |
| **Results → Report cards** | The crown jewel in Nigeria; schools care intensely; lights up your analysis screens | High | Ship second |
| **Fees & payments** | Strong for owners/bursars; revenue visibility | Medium | Ship third |

**Recommendation:** ship **Attendance** first — it's the fastest path to a daily
habit (a teacher opening Klaska every morning is the best possible pilot signal),
and it's the simplest of the three. Then **Results/report cards** for the wow.

---

## Deployment (the gate to external signups)

To let *other* schools sign up, we host it:
- **Vercel** (deploys this Next.js app from GitHub in minutes) + the **Neon**
  database you already created (Neon is built for this).
- One-time: push the repo to GitHub, import to Vercel, set the same env vars.
- Result: a real `https://…` URL each pilot school can sign up on.

I'd deploy **right after** onboarding/import works, so the very first thing a
pilot school experiences is the good version.

---

## The order, end to end

0. **Make the foundation live** on Neon (we're one `npm install` away). ← current
1. **Onboarding & bulk student import** (+ empty states, setup checklist).
2. **Auth/tenancy hardening** (password reset, scoping audit) — alongside #1.
3. **Deploy** to Vercel → live signup URL.
4. **Attendance** (first flagship; daily value).
5. **Results → report cards** (the wow; reuses your analysis UI).
6. **Fees & payments**.
7. Invite 2–3 friendly pilot schools; iterate on their feedback.

## What "pilot-ready" means (our finish line for this stage)

A friendly school can: open a real URL → sign up → import their students from a
spreadsheet → add their staff and classes → have teachers log in and mark
attendance → and the Owner sees it all, safely isolated from every other school.
Hit that, and we have a genuine pilot.
