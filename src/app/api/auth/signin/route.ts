import { NextResponse, type NextRequest } from "next/server";
import { createSession, normalizeEmail, setSessionCookie, verifyPassword } from "@/lib/auth";
import { db, isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Deliberately identical for "no such user" and "wrong password". */
const REJECTED = { error: "That email and password don't match." };

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured) {
    return NextResponse.json(
      { error: "This deployment has no database configured, so accounts are unavailable." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const email = normalizeEmail(String(body?.email ?? ""));
  const password = String(body?.password ?? "");
  if (!email || !password) return NextResponse.json(REJECTED, { status: 401 });

  try {
    const sql = await db();
    const rows = await sql`
      select id, first_name, last_name, email, password_hash
        from users where email = ${email}
    `;
    if (rows.length === 0) return NextResponse.json(REJECTED, { status: 401 });

    const row = rows[0];
    if (!(await verifyPassword(password, row.password_hash as string))) {
      return NextResponse.json(REJECTED, { status: 401 });
    }

    const token = await createSession(row.id as string);
    const response = NextResponse.json({
      user: {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
      },
    });
    setSessionCookie(response, token);
    return response;
  } catch {
    return NextResponse.json({ error: "Could not reach the database." }, { status: 502 });
  }
}
