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
- **Sessions** — each stretch of work is stored individually; project totals are their sum.
  Pressing START within five minutes of pausing continues the same session; a longer gap
  opens a new one, and NEW SESSION splits deliberately at any time
- **History** — a chronological log of every stretch of work, with exact timestamps and durations
- **Searchable project picker** — type to filter by project name or client
- **Project management** — create, rename, delete, and see totals at a glance
- **Accounts and cloud sync** — sign in and your projects follow you to any device

## Routes

| Route                | Purpose                                  |
| -------------------- | ---------------------------------------- |
| `/`                  | Timer dashboard and project list         |
| `/projects`          | Create, rename, delete projects          |
| `/history`           | Full log of tracked sessions             |
| `/signin`, `/signup` | Account access                           |
| `/api/auth/*`        | Sign up, sign in, session, sign out      |
| `/api/sync`          | Pull and push the signed-in user's state |

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

## Accounts and cloud sync

Accounts are optional. Without a database the app runs entirely in the browser, and the sign-in
screen says so rather than failing.

**Setup on Vercel:** Storage → Create Database → Neon. The integration injects `DATABASE_URL`
into the deployment, and the tables are created on the first request. Nothing else to configure.
For local development, copy `.env.example` to `.env.local` and paste a connection string.

**Signing up.** First name, last name, email and password — nothing else. Whatever projects are
already in the browser become the account's data on sign-up, so nothing is lost by making an
account later. Signing out clears the device; the data stays in the account.

### How it works

Passwords are hashed with **scrypt** (N=16384, r=8, p=1, 64-byte key, per-password random salt)
using Node's built-in crypto — no dependency, and no password ever stored or logged. Sign-in
failures are deliberately indistinguishable between "no such user" and "wrong password".

Sessions are opaque 32-byte random tokens in an `httpOnly`, `sameSite=lax`, `secure` cookie.
Only the SHA-256 of a token is stored, so a leaked database cannot be used to impersonate
anyone. Sessions last 30 days and are revoked on sign-out.

Tracker state is one JSONB document per user with a `version` column for optimistic concurrency.
The whole document is always read and written as a unit, which avoids cross-table transactions
and delete tombstones; the trade-off is that the database cannot query individual sessions.

Changes push automatically (debounced), and the app pulls on load and whenever the tab regains
focus. If two devices write at once the one being actively used wins, so the change you just
made is never silently dropped; the other device picks up the result on its next pull.

### Not included

There is no password reset and no email verification — a forgotten password currently means a
lost account. Sign-in attempts are not rate limited.

## Brand

The visual identity — palette, logo, typography and UI language — is documented in
[BRAND.md](BRAND.md). Tokens live in [`src/app/globals.css`](src/app/globals.css).

## Project layout

```
src/
  lib/
    types.ts      Project and TimeSession models
    store.ts      state, persistence and every timer action
    account.ts    client session and sync engine: push, pull, conflicts
    auth.ts       server passwords, sessions and validation
    db.ts         Neon client and schema
    time.ts       duration and timestamp formatting
    useNow.ts     one-second tick, only while running
  components/     Logo, Nav, AccountMenu, ProjectCombobox, icons
  app/            /, /projects, /history, /signin, /signup, api/
```
