import { NextResponse, type NextRequest } from "next/server";
import {
  DECOY_HASH,
  createSession,
  hashPassword,
  needsRehash,
  normalizeEmail,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { db, isDatabaseConfigured } from "@/lib/db";
import { heartsFor } from "@/lib/flair";

export const dynamic = "force-dynamic";

/** Deliberately identical for "no such user" and "wrong password". */
const REJECTED = { error: "That email and password don't match." };

/**
 * Every rejection takes at least this long. Hashing both paths is not enough on
 * its own — a hash stored under older parameters verifies faster than the decoy,
 * which would leak account existence in the other direction. Padding to a fixed
 * floor removes the signal regardless of which parameters a given hash carries.
 */
const MIN_REJECT_MS = 500;

async function reject(startedAt: number) {
  const remaining = MIN_REJECT_MS - (Date.now() - startedAt);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
  return NextResponse.json(REJECTED, { status: 401 });
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  if (!isDatabaseConfigured) {
    return NextResponse.json(
      { error: "This deployment has no database configured, so accounts are unavailable." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const email = normalizeEmail(String(body?.email ?? ""));
  const password = String(body?.password ?? "");
  if (!email || !password) return reject(startedAt);

  try {
    const sql = await db();
    const rows = await sql`
      select id, first_name, last_name, email, password_hash
        from users where email = ${email}
    `;

    const stored = rows.length > 0 ? (rows[0].password_hash as string) : DECOY_HASH;
    const matched = await verifyPassword(password, stored);
    if (rows.length === 0 || !matched) return reject(startedAt);

    const row = rows[0];

    // now that the password is known good, move it onto current parameters
    if (needsRehash(stored)) {
      const upgraded = await hashPassword(password);
      await sql`update users set password_hash = ${upgraded} where id = ${row.id}`;
    }

    const token = await createSession(row.id as string);
    const response = NextResponse.json({
      user: {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
      },
      hearts: heartsFor(row.email as string),
    });
    setSessionCookie(response, token);
    return response;
  } catch {
    return NextResponse.json({ error: "Could not reach the database." }, { status: 502 });
  }
}
