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
 * One row per sync code holding the whole tracker state.
 *
 * The state is a small, self-consistent document that is always read and
 * written as a unit, so a single JSONB column is a better fit than normalised
 * tables: no cross-table transactions, no tombstones for deletes, and the
 * version column gives straightforward optimistic concurrency.
 */
async function ensureSchema(sql: NonNullable<typeof client>) {
  await sql`
    create table if not exists workspaces (
      code text primary key,
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
