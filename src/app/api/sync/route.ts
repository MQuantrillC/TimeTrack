import { NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/lib/db";
import { CODE_PATTERN } from "@/lib/id";
import type { TrackerData } from "@/lib/types";

/**
 * Sync endpoint. A sync code is the only credential — it is a long random
 * secret, so it is treated like a bearer token: never listed, never guessable,
 * and always validated against a strict format before it reaches the database.
 */

export const dynamic = "force-dynamic";

/** Guard against the endpoint being used as free general-purpose storage. */
const MAX_STATE_BYTES = 1_000_000;

const noDatabase = () =>
  NextResponse.json(
    { error: "This deployment has no database configured, so sync is unavailable." },
    { status: 503 },
  );

const badCode = () => NextResponse.json({ error: "Invalid sync code." }, { status: 400 });

function validState(value: unknown): value is TrackerData {
  if (typeof value !== "object" || value === null) return false;
  const data = value as Partial<TrackerData>;
  return Array.isArray(data.projects) && Array.isArray(data.sessions);
}

function tooLarge(state: TrackerData) {
  return JSON.stringify(state).length > MAX_STATE_BYTES;
}

/** Pull: GET /api/sync?code=… */
export async function GET(request: Request) {
  if (!isDatabaseConfigured) return noDatabase();

  const code = new URL(request.url).searchParams.get("code") ?? "";
  if (!CODE_PATTERN.test(code)) return badCode();

  try {
    const sql = await db();
    const rows = await sql`
      select state, version, updated_at from workspaces where code = ${code}
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: "No data found for that sync code." }, { status: 404 });
    }
    const row = rows[0];
    return NextResponse.json({
      state: row.state,
      version: row.version,
      updatedAt: row.updated_at,
    });
  } catch {
    return NextResponse.json({ error: "Could not reach the database." }, { status: 502 });
  }
}

/** Create: PUT /api/sync — claims a new code, or returns the existing row. */
export async function PUT(request: Request) {
  if (!isDatabaseConfigured) return noDatabase();

  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code : "";
  if (!CODE_PATTERN.test(code)) return badCode();
  if (!validState(body?.state)) {
    return NextResponse.json({ error: "Invalid state." }, { status: 400 });
  }
  if (tooLarge(body.state)) {
    return NextResponse.json({ error: "State is too large to sync." }, { status: 413 });
  }

  try {
    const sql = await db();
    const rows = await sql`
      insert into workspaces (code, state)
      values (${code}, ${JSON.stringify(body.state)}::jsonb)
      on conflict (code) do nothing
      returning version, updated_at
    `;
    if (rows.length > 0) {
      return NextResponse.json({ version: rows[0].version, updatedAt: rows[0].updated_at });
    }
    // the code already existed — hand back what is stored rather than overwriting
    const existing = await sql`
      select state, version, updated_at from workspaces where code = ${code}
    `;
    return NextResponse.json({
      state: existing[0].state,
      version: existing[0].version,
      updatedAt: existing[0].updated_at,
      existed: true,
    });
  } catch {
    return NextResponse.json({ error: "Could not reach the database." }, { status: 502 });
  }
}

/**
 * Push: POST /api/sync — optimistic concurrency on `version`.
 * A stale write returns 409 with the current server state so the client can decide.
 */
export async function POST(request: Request) {
  if (!isDatabaseConfigured) return noDatabase();

  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code : "";
  if (!CODE_PATTERN.test(code)) return badCode();
  if (!validState(body?.state)) {
    return NextResponse.json({ error: "Invalid state." }, { status: 400 });
  }
  if (tooLarge(body.state)) {
    return NextResponse.json({ error: "State is too large to sync." }, { status: 413 });
  }

  const baseVersion = Number(body?.baseVersion);
  const force = body?.force === true;

  try {
    const sql = await db();

    const rows = force
      ? await sql`
          update workspaces
             set state = ${JSON.stringify(body.state)}::jsonb,
                 version = version + 1,
                 updated_at = now()
           where code = ${code}
          returning version, updated_at
        `
      : await sql`
          update workspaces
             set state = ${JSON.stringify(body.state)}::jsonb,
                 version = version + 1,
                 updated_at = now()
           where code = ${code} and version = ${baseVersion}
          returning version, updated_at
        `;

    if (rows.length > 0) {
      return NextResponse.json({ version: rows[0].version, updatedAt: rows[0].updated_at });
    }

    const current = await sql`
      select state, version, updated_at from workspaces where code = ${code}
    `;
    if (current.length === 0) {
      return NextResponse.json({ error: "No data found for that sync code." }, { status: 404 });
    }
    return NextResponse.json(
      {
        error: "Another device wrote first.",
        state: current[0].state,
        version: current[0].version,
        updatedAt: current[0].updated_at,
      },
      { status: 409 },
    );
  } catch {
    return NextResponse.json({ error: "Could not reach the database." }, { status: 502 });
  }
}
