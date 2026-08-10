# TimeTrack

Personal project time tracking. Create projects, start a timer, switch between them, and see
exactly where the hours went.

> Time tracking that feels calm, precise and human.

No accounts and no billing. The app is offline-first — every change is written to the browser
immediately — with optional cloud sync so the same data follows you between devices.

## Features

- **Timer** — START, PAUSE and NEW SESSION on the selected project
- **Accurate by construction** — elapsed time is derived from stored timestamps, never from an
  incrementing counter, so tab switches, sleep and refreshes cannot cause drift
- **One project at a time** — switching projects pauses and saves the current one, and never
  auto-starts the next
- **Sessions** — each stretch of work is stored individually; project totals are their sum
- **History** — a chronological log of every stretch of work, with exact timestamps and durations
- **Searchable project picker** — type to filter by project name or client
- **Project management** — create, rename, delete, and see totals at a glance
- **Cloud sync** — optional, identified by a sync code rather than an account

## Routes

| Route       | Purpose                            |
| ----------- | ---------------------------------- |
| `/`         | Timer dashboard and project list   |
| `/projects` | Create, rename, delete projects    |
| `/history`  | Full log of tracked sessions       |
| `/api/sync` | Pull, create and push the state document |

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · `localStorage`, with Neon Postgres
behind an optional sync layer.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app starts empty — create your first
project to begin.

## Cloud sync

Sync is optional. Without a database the app runs exactly as before, keeping everything in the
browser, and the sync panel says so.

**Setup on Vercel:** Storage → Create Database → Neon. The integration injects `DATABASE_URL`
into the deployment, and the `workspaces` table is created on the first request. Nothing else to
configure. For local development, copy `.env.example` to `.env.local` and paste a connection
string.

**How it works.** Press the cloud icon in the header and choose *Turn on sync*: the app generates
a 16-character code and uploads the current state. Enter that code on another device and it pulls
the same data down. The code is the only credential — treat it like a password, since anyone
holding it can read and change the data.

State is stored as a single JSONB document per code with a `version` column for optimistic
concurrency. The whole document is always read and written as a unit, which avoids
cross-table transactions and delete tombstones; the trade-off is that the database cannot query
individual sessions.

Changes push automatically (debounced), and the app pulls on load and whenever the tab regains
focus. If two devices write at once the one being actively used wins, so the change you just
made is never silently dropped; the other device picks up the result on its next pull.

## Brand

The visual identity — palette, logo, typography and UI language — is documented in
[BRAND.md](BRAND.md). Tokens live in [`src/app/globals.css`](src/app/globals.css).

## Project layout

```
src/
  lib/
    types.ts      Project and TimeSession models
    store.ts      state, persistence and every timer action
    sync.ts       cloud sync engine: codes, push, pull, conflicts
    db.ts         Neon client and schema
    time.ts       duration and timestamp formatting
    id.ts         ids and sync codes
    useNow.ts     one-second tick, only while running
  components/     Logo, Nav, ProjectCombobox, SyncDialog, icons
  app/            /, /projects, /history, api/sync
```
