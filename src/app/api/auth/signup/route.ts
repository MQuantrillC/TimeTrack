import { NextResponse, type NextRequest } from "next/server";
import {
  createSession,
  hashPassword,
  newUserId,
  normalizeEmail,
  setSessionCookie,
  validateSignUp,
} from "@/lib/auth";
import { db, isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured) {
    return NextResponse.json(
      { error: "This deployment has no database configured, so accounts are unavailable." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const problem = validateSignUp(body ?? {});
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const firstName = String(body.firstName).trim();
  const lastName = String(body.lastName).trim();
  const email = normalizeEmail(String(body.email));

  try {
    const sql = await db();
    const id = newUserId();
    const passwordHash = await hashPassword(String(body.password));

    const rows = await sql`
      insert into users (id, first_name, last_name, email, password_hash)
      values (${id}, ${firstName}, ${lastName}, ${email}, ${passwordHash})
      on conflict (email) do nothing
      returning id
    `;
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 },
      );
    }

    const token = await createSession(id);
    const response = NextResponse.json({ user: { id, firstName, lastName, email } });
    setSessionCookie(response, token);
    return response;
  } catch {
    return NextResponse.json({ error: "Could not reach the database." }, { status: 502 });
  }
}
