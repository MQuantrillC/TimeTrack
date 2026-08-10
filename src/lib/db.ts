import { neon } from "@neondatabase/serverless";

/**
 * Neon Postgres. The Vercel integration injects DATABASE_URL; POSTGRES_URL is
 * accepted as a fallback so either wiring works.
 */
const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

export const isDatabaseConfigured = Boolean(connectionString);

const client = connectionString ? neon(connectionString) : null;

let schemaReady: Promise<void> | null = null;

/**
 * Three tables:
 *
 * - `users` — one row per account.
 * - `auth_sessions` — login sessions, keyed by the SHA-256 of the cookie token.
 * - `workspace_state` — the tracker state, one document per user.
 *
 * The tracker state is always read and written as a unit, so a single JSONB
 * column is a better fit than normalised tables: no cross-table transactions,
 * no tombstones for deletes, and the version column gives straightforward
 * optimistic concurrency.
 */
async function ensureSchema(sql: NonNullable<typeof client>) {
  await sql`
    create table if not exists users (
      id text primary key,
      first_name text not null,
      last_name text not null,
      email text not null unique,
      password_hash text not null,
      created_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists auth_sessions (
      token_hash text primary key,
      user_id text not null references users(id) on delete cascade,
      expires_at timestamptz not null,
      created_at timestamptz not null default now()
    )
  `;
  await sql`
    create index if not exists auth_sessions_user_id_idx on auth_sessions (user_id)
  `;
  await sql`
    create table if not exists workspace_state (
      user_id text primary key references users(id) on delete cascade,
      state jsonb not null,
      version integer not null default 1,
      updated_at timestamptz not null default now()
    )
  `;
}

export async function db() {
  if (!client) throw new Error("No database configured");
  schemaReady ??= ensureSchema(client).catch((error) => {
    schemaReady = null; // let the next request retry
    throw error;
  });
  await schemaReady;
  return client;
}
