import { NextResponse, type NextRequest } from "next/server";
import { userFromRequest } from "@/lib/auth";
import { db, isDatabaseConfigured } from "@/lib/db";
import type { TrackerData } from "@/lib/types";

/**
 * The signed-in user's tracker state. The session cookie is the only
 * credential; every query is scoped to the user it resolves to.
 */

export const dynamic = "force-dynamic";

/** Guard against the endpoint being used as general-purpose storage. */
const MAX_STATE_BYTES = 1_000_000;

const noDatabase = () =>
  NextResponse.json(
    { error: "This deployment has no database configured, so sync is unavailable." },
    { status: 503 },
  );

const unauthorized = () => NextResponse.json({ error: "Sign in to sync." }, { status: 401 });

function validState(value: unknown): value is TrackerData {
  if (typeof value !== "object" || value === null) return false;
  const data = value as Partial<TrackerData>;
  return Array.isArray(data.projects) && Array.isArray(data.sessions);
}

/** Pull the stored state. 404 means the account has never synced. */
export async function GET(request: NextRequest) {
  if (!isDatabaseConfigured) return noDatabase();

  try {
    const user = await userFromRequest(request);
    if (!user) return unauthorized();

    const sql = await db();
    const rows = await sql`
      select state, version, updated_at from workspace_state where user_id = ${user.id}
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: "Nothing stored yet." }, { status: 404 });
    }
    return NextResponse.json({
      state: rows[0].state,
      version: rows[0].version,
      updatedAt: rows[0].updated_at,
    });
  } catch {
    return NextResponse.json({ error: "Could not reach the database." }, { status: 502 });
  }
}

/**
 * Push. Optimistic concurrency on `version`: a stale write returns 409 along
 * with the current server state so the client can decide what to do.
 */
export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured) return noDatabase();

  // reject oversized payloads before spending memory parsing them
  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_STATE_BYTES * 1.1) {
    return NextResponse.json({ error: "State is too large to sync." }, { status: 413 });
  }

  const body = await request.json().catch(() => null);
  if (!validState(body?.state)) {
    return NextResponse.json({ error: "Invalid state." }, { status: 400 });
  }
  if (JSON.stringify(body.state).length > MAX_STATE_BYTES) {
    return NextResponse.json({ error: "State is too large to sync." }, { status: 413 });
  }

  const baseVersion = Number(body?.baseVersion) || 0;
  const force = body?.force === true;
  const document = JSON.stringify(body.state);

  try {
    const user = await userFromRequest(request);
    if (!user) return unauthorized();

    const sql = await db();

    // insert on first sync, otherwise update only if nobody else moved on
    const rows = force
      ? await sql`
          insert into workspace_state (user_id, state, version)
          values (${user.id}, ${document}::jsonb, 1)
          on conflict (user_id) do update
             set state = excluded.state,
                 version = workspace_state.version + 1,
                 updated_at = now()
          returning version, updated_at
        `
      : await sql`
          insert into workspace_state (user_id, state, version)
          values (${user.id}, ${document}::jsonb, 1)
          on conflict (user_id) do update
             set state = excluded.state,
                 version = workspace_state.version + 1,
                 updated_at = now()
           where workspace_state.version = ${baseVersion}
          returning version, updated_at
        `;

    if (rows.length > 0) {
      return NextResponse.json({ version: rows[0].version, updatedAt: rows[0].updated_at });
    }

    const current = await sql`
      select state, version, updated_at from workspace_state where user_id = ${user.id}
    `;
    return NextResponse.json(
      {
        error: "Another device wrote first.",
        state: current[0]?.state ?? null,
        version: current[0]?.version ?? 0,
        updatedAt: current[0]?.updated_at ?? null,
      },
      { status: 409 },
    );
  } catch {
    return NextResponse.json({ error: "Could not reach the database." }, { status: 502 });
  }
}
