import { NextResponse, type NextRequest } from "next/server";
import { userFromRequest } from "@/lib/auth";
import { connectionVariable, db, detectedVariables, isDatabaseConfigured } from "@/lib/db";

/**
 * Deployment diagnostics. Never reports connection strings, credentials or raw
 * driver errors.
 *
 * Anyone may ask whether the database is reachable — that is what makes this
 * useful when sign-in is the thing that is broken. The environment and schema
 * detail is only reconnaissance value to a stranger, so it is kept for signed-in
 * callers.
 */

export const dynamic = "force-dynamic";

async function isSignedIn(request: NextRequest) {
  if (!isDatabaseConfigured) return false;
  try {
    return (await userFromRequest(request)) !== null;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const detailed = await isSignedIn(request);
  if (!isDatabaseConfigured) {
    return NextResponse.json({
      databaseConfigured: false,
      connection: "not-configured",
      hint: "No environment variable holding a postgres:// URL was found. On Vercel: Storage → Create Database → Neon, then redeploy so the new deployment picks it up. Locally: copy .env.example to .env.local and paste a connection string.",
    });
  }

  try {
    const sql = await db();
    const rows = await sql`
      select table_name from information_schema.tables
       where table_schema = 'public'
         and table_name in ('users', 'auth_sessions', 'workspace_state')
       order by table_name
    `;
    return NextResponse.json({
      databaseConfigured: true,
      connection: "ok",
      ...(detailed && {
        connectionVariable,
        detectedVariables: detectedVariables(),
        tables: rows.map((row) => row.table_name),
      }),
    });
  } catch {
    return NextResponse.json(
      {
        databaseConfigured: true,
        connection: "failed",
        ...(detailed && { connectionVariable, detectedVariables: detectedVariables() }),
        hint: "The connection string was found but the database could not be reached. Check that it is a Neon connection string (the driver speaks Neon's HTTP protocol, not plain Postgres over TCP) and that it has not been rotated.",
      },
      { status: 502 },
    );
  }
}
