# Klaska — School Operating System

A web application for Nigerian private schools. This is the **real, database-backed
application**. The earlier mock prototype lives on inside `src/app` and
`src/components` as the design source we migrate from, screen by screen.

---

## The stack

| Layer | Choice | Why |
|------|--------|-----|
| Framework | **Next.js (App Router)** + React + TypeScript | One codebase for UI + server. Server Components fetch data; Server Actions write it. |
| Styling | **Tailwind CSS v4** + a custom design system | Fast, consistent, on-brand (Klaska green). |
| Database | **PostgreSQL** (hosted on **Neon**) | A real relational database. Free serverless tier, same DB for dev and production. |
| ORM | **Prisma** | Type-safe database access + migrations. You describe tables in `prisma/schema.prisma`; Prisma generates a typed client. |
| Auth | **Custom session** (jose + bcryptjs) | Email/password login, role-based (Owner / Bursar / Teacher). Transparent and easy to read. |

---

## Project structure (the parts that matter)

```
klaska/
├─ prisma/
│  └─ schema.prisma         ← your database tables (School, Staff, Class, Student)
├─ src/
│  ├─ middleware.ts         ← front-door auth guard for /dashboard
│  ├─ lib/
│  │  ├─ db.ts              ← the shared Prisma client (talks to Postgres)
│  │  ├─ auth/
│  │  │  ├─ jwt.ts          ← sign/verify the session token (Edge-safe)
│  │  │  ├─ password.ts     ← bcrypt hash/verify
│  │  │  ├─ session.ts      ← cookie helpers: createSession, getCurrentUser, requireUser
│  │  │  └─ actions.ts      ← signup / login / logout server actions
│  │  └─ actions/
│  │     ├─ students.ts     ← create/update/delete students (DB writes)
│  │     ├─ staff.ts        ← create/delete staff
│  │     └─ classes.ts      ← create/delete classes
│  ├─ app/
│  │  ├─ (auth)/            ← /login and /signup (no sidebar)
│  │  └─ dashboard/         ← the real app (requires login)
│  │     ├─ layout.tsx      ← enforces login, draws the sidebar
│  │     ├─ page.tsx        ← overview with live counts
│  │     ├─ students/       ← students page
│  │     ├─ staff/          ← staff page
│  │     └─ classes/        ← classes page
│  └─ components/
│     ├─ auth/              ← login & signup forms
│     ├─ dashboard/         ← Students / Staff / Classes managers (tables + forms)
│     └─ ui/                ← shared design system (Card, Button, Icon, …)
└─ .env                     ← your secrets (NOT committed)
```

**The data flow, end to end:** a page under `src/app/dashboard` is a *Server
Component* — it runs on the server, calls `prisma.*` to read from Postgres, and
passes plain data to a *Client Component* manager (the tables/forms). When you
submit a form it calls a *Server Action* in `src/lib/actions/*`, which writes to
Postgres and calls `revalidatePath()` so the page re-renders with fresh data.

---

## Running it locally

### One-time setup
1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Create the database (Neon).** Sign up at https://neon.tech (free), create a
   project named `klaska`, then open **Connection Details** and copy the
   connection strings.
3. **Configure secrets.** Copy the example file and fill it in:
   ```bash
   cp .env.example .env
   ```
   - `DATABASE_URL` → Neon **pooled** string (host contains `-pooler`)
   - `DIRECT_URL` → Neon **direct** string
   - `AUTH_SECRET` → generate one:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
4. **Create the tables** (Prisma reads `schema.prisma` and builds them in Postgres):
   ```bash
   npm run db:migrate
   ```

### Every day
```bash
npm run dev      # start the app at http://localhost:3000
```
Then open **http://localhost:3000/signup**, create your school, and you're in.

### Useful database commands
```bash
npm run db:studio     # visual table browser in the browser
npm run db:migrate    # apply schema changes (creates a migration)
npm run db:generate   # regenerate the typed Prisma client
```

---

## Saving your progress with Git

```bash
git status                       # see what changed
git add -A                       # stage everything
git commit -m "Describe what you did"
```

Good habit: commit after each working change with a short message. To put it on
GitHub later, create an empty repo there and:
```bash
git remote add origin <your-repo-url>
git push -u origin main
```

> `.env` is gitignored on purpose — your database password never goes into Git.
