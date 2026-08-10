import { neon } from "@neondatabase/serverless";

/**
 * Neon Postgres.
 *
 * Vercel's Postgres integrations do not all inject the same variable name, and
 * the Neon marketplace integration lets you choose a prefix, so rather than
 * insisting on one name we look through the ones in common use and then fall
 * back to any variable whose value is a Postgres URL.
 */

const CANDIDATES = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "NEON_DATABASE_URL",
  "DATABASE_POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
];

const POSTGRES_URL = /^postgres(ql)?:\/\//;

function findConnection(): { name: string; value: string } | null {
  for (const name of CANDIDATES) {
    const value = process.env[name];
    if (value && POSTGRES_URL.test(value)) return { name, value };
  }
  // a custom integration prefix still works
  for (const [name, value] of Object.entries(process.env)) {
    if (value && POSTGRES_URL.test(value)) return { name, value };
  }
  return null;
}

const connection = findConnection();

export const isDatabaseConfigured = connection !== null;

/** Which variable the connection came from — for diagnostics, never the value. */
export const connectionVariable = connection?.name ?? null;

/** Names of every variable that looks like a Postgres URL, for diagnostics. */
export function detectedVariables(): string[] {
  return Object.entries(process.env)
    .filter(([, value]) => value && POSTGRES_URL.test(value))
    .map(([name]) => name);
}

const client = connection ? neon(connection.value) : null;

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
