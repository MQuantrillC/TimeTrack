import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin";
import { userFromRequest } from "@/lib/auth";
import { db, isDatabaseConfigured } from "@/lib/db";

/**
 * The account roster, for administrators only.
 *
 * Read-only by design: it reports totals about each account and offers no way
 * to act on one. Authorisation is decided here on every request, never from
 * anything the client sends.
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isDatabaseConfigured) {
    return NextResponse.json({ error: "No database configured." }, { status: 503 });
  }

  try {
    const user = await userFromRequest(request);
    if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    if (!isAdmin(user.email)) {
      return NextResponse.json({ error: "Not available for this account." }, { status: 403 });
    }

    const sql = await db();
    // the state document is user-written, so every read of it is type-guarded
    const rows = await sql`
      select u.first_name,
             u.last_name,
             u.email,
             u.created_at,
             case when jsonb_typeof(w.state -> 'projects') = 'array'
                  then jsonb_array_length(w.state -> 'projects') else 0 end as projects,
             case when jsonb_typeof(w.state -> 'sessions') = 'array'
                  then jsonb_array_length(w.state -> 'sessions') else 0 end as sessions,
             case when jsonb_typeof(w.state -> 'sessions') = 'array' then coalesce((
                    select sum(case when (s ->> 'duration') ~ '^[0-9]+$'
                                    then (s ->> 'duration')::bigint else 0 end)
                      from jsonb_array_elements(w.state -> 'sessions') s
                  ), 0) else 0 end as tracked_ms,
             w.updated_at
        from users u
        left join workspace_state w on w.user_id = u.id
       order by u.created_at
    `;

    return NextResponse.json({
      users: rows.map((row) => ({
        name: `${row.first_name} ${row.last_name}`.trim(),
        email: row.email,
        createdAt: row.created_at,
        projects: Number(row.projects),
        sessions: Number(row.sessions),
        trackedMs: Number(row.tracked_ms),
        lastSyncedAt: row.updated_at,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Could not reach the database." }, { status: 502 });
  }
}
