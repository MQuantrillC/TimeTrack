# TimeTrack

Personal project time tracking. Create projects, start a timer, switch between them, and see
exactly where the hours went.

> Time tracking that feels calm, precise and human.

No accounts, no billing, no backend — everything lives in the browser's local storage.

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

## Routes

| Route       | Purpose                            |
| ----------- | ---------------------------------- |
| `/`         | Timer dashboard and project list   |
| `/projects` | Create, rename, delete projects    |
| `/history`  | Full log of tracked sessions       |

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · `localStorage` for persistence.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Demo projects and history are seeded on the
first visit so the app isn't empty; clearing site data resets them.

## Brand

The visual identity — palette, logo, typography and UI language — is documented in
[BRAND.md](BRAND.md). Tokens live in [`src/app/globals.css`](src/app/globals.css).

## Project layout

```
src/
  lib/
    types.ts      Project and TimeSession models
    store.ts      state, persistence and every timer action
    time.ts       duration and timestamp formatting
    demo.ts       first-run seed data
    useNow.ts     one-second tick, only while running
  components/     Logo, Nav, ProjectCombobox, NewProjectDialog, icons
  app/            /, /projects, /history
```
