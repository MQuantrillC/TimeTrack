import { NextResponse } from "next/server";
import { connectionVariable, db, detectedVariables, isDatabaseConfigured } from "@/lib/db";

/**
 * Deployment diagnostics. Reports variable *names* and whether a query
 * succeeds — never connection strings, credentials or raw driver errors.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseConfigured) {
    return NextResponse.json({
      databaseConfigured: false,
      connectionVariable: null,
      detectedVariables: [],
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
      connectionVariable,
      detectedVariables: detectedVariables(),
      connection: "ok",
      tables: rows.map((row) => row.table_name),
    });
  } catch {
    return NextResponse.json(
      {
        databaseConfigured: true,
        connectionVariable,
        detectedVariables: detectedVariables(),
        connection: "failed",
        hint: "The connection string was found but the database could not be reached. Check that it is a Neon connection string (the driver speaks Neon's HTTP protocol, not plain Postgres over TCP) and that it has not been rotated.",
      },
      { status: 502 },
    );
  }
}
