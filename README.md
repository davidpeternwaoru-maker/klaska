# Klaska — Web Platform

The web dashboard for **Klaska**, the operating system for modern Nigerian private
schools. This is the real product codebase (not the prototype). The teacher mobile
app is a separate project that will be built later.

> Status: **Overview dashboard built.** Academics, People, Finance, Insights and
> Settings are stubbed in the navigation (marked “Soon”) and will be built one
> section at a time.

---

## Tech stack

| Concern        | Choice                                  |
| -------------- | --------------------------------------- |
| Framework      | Next.js 16 (App Router) + React 19      |
| Language       | TypeScript                              |
| Styling        | Tailwind CSS v4 + Klaska design tokens  |
| Fonts          | Plus Jakarta Sans, Space Grotesk, JetBrains Mono (self-hosted via `next/font`) |
| Offline        | localStorage-backed sync queue (v1 foundation) |

No backend yet — screens use realistic Nigerian sample data under `src/data/`.
A real database is the next milestone.

---

## Running it locally

```bash
cd web
npm install      # first time only
npm run dev      # start the dev server
```

Open **http://localhost:3000**. The page hot-reloads as you edit.

Other scripts:

```bash
npm run build    # production build (also full type-check)
npm run start    # serve the production build
npm run lint     # eslint
```

You need **Node 18.18+** (Node 20+ recommended).

---

## Project structure

```
web/
├─ src/
│  ├─ app/                      # Next.js App Router
│  │  ├─ layout.tsx             # root layout — loads brand fonts, global CSS
│  │  ├─ globals.css            # design tokens (palette + COMPACT scale) + motion
│  │  └─ page.tsx               # "/" → renders <AppShell> + <OverviewPage>
│  │
│  ├─ components/
│  │  ├─ layout/                # the product shell
│  │  │  ├─ AppShell.tsx        # rail + sub-panel + top bar + scrolling content
│  │  │  ├─ Sidebar.tsx         # slim green icon rail + slide-out sub-section panel
│  │  │  ├─ TopBar.tsx          # search, sync indicator, notifications, user
│  │  │  └─ SyncIndicator.tsx   # offline / syncing / synced pill
│  │  ├─ ui/                    # reusable primitives
│  │  │  ├─ Icon.tsx            # line-icon set + Klaska logomark (KLogo)
│  │  │  ├─ primitives.tsx      # Card, Pill, Button, SectionTitle, Divider
│  │  │  ├─ KPI.tsx             # compact stat card
│  │  │  └─ CountUp.tsx         # number count-up animation
│  │  ├─ charts/Charts.tsx      # dependency-free SVG line & bar charts
│  │  └─ overview/OverviewPage.tsx  # the Overview screen composition
│  │
│  ├─ lib/
│  │  ├─ nav.ts                 # grouped navigation config (single source of truth)
│  │  └─ offline/               # offline-first foundation
│  │     ├─ store.ts            # durable queue (localStorage) + flush transport
│  │     └─ OfflineProvider.tsx # React context: status, pendingCount, enqueue()
│  │
│  └─ data/
│     └─ overview.ts            # Nigerian sample data for the Overview screen
└─ ...                          # next config, tsconfig, etc.
```

### How a screen is wired

`app/page.tsx` → `AppShell` (provides the offline context + chrome) → a page
component (e.g. `OverviewPage`) built from `ui/` primitives and `charts/`.
Navigation is data-driven from `lib/nav.ts`, so adding a section is mostly:
add an item there, create its page, drop the “Soon” flag.

---

## Design system (compact)

All brand colors live as Tailwind theme tokens in `globals.css` — use utilities
like `bg-forest`, `text-ink-3`, `border-line`, `font-display`. The scale is
intentionally **denser** than the prototype: 13px base font, smaller cards,
tighter padding, smaller radii — a real SaaS dashboard feel. Adjust the scale in
one place (`globals.css`) and it ripples everywhere.

---

## Offline-first foundation (v1)

The platform is architected to keep working with no internet:

- Every data mutation calls `enqueue(type, payload)` from `useOffline()`.
- The op is persisted to a **durable localStorage queue** immediately.
- When online, it flushes to the server right away; when offline, it waits.
- On reconnect (`online` event) the queue **auto-flushes**.
- The top bar shows a live **Offline → Syncing → Synced** status with a pending count.

To see it work: open the app, then toggle your browser to **offline**
(DevTools → Network → Offline, or turn off Wi-Fi). The pill flips to *Offline*;
back online it shows *Syncing…* then *Synced*.

**Intentionally simple for now:** a FIFO queue with a simulated transport
(`flushOp` in `store.ts`) — no conflict resolution yet. To wire a real backend,
replace the body of `flushOp` with a `fetch` to your sync endpoint; nothing in
the React layer changes. IndexedDB can later replace localStorage the same way.

---

## What's next

1. Wire a real database + API, and replace `flushOp` with real sync.
2. Build the remaining sections (Academics → People → Finance → Insights → Settings),
   one at a time, reusing the shell and primitives.
