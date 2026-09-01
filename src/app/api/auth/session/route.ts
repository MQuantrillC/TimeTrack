import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, clearSessionCookie, destroySession, userFromRequest } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { heartsFor } from "@/lib/flair";

export const dynamic = "force-dynamic";

/** Who am I? Returns `{ user: null }` when signed out, or when there is no database. */
export async function GET(request: NextRequest) {
  if (!isDatabaseConfigured) {
    return NextResponse.json({ user: null, accountsAvailable: false });
  }
  try {
    const user = await userFromRequest(request);
    return NextResponse.json({
      user,
      accountsAvailable: true,
      hearts: user ? heartsFor(user.email) : false,
    });
  } catch {
    return NextResponse.json({ user: null, accountsAvailable: false });
  }
}

/** Sign out. */
export async function DELETE(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  if (token && isDatabaseConfigured) {
    await destroySession(token).catch(() => {
      // the cookie is cleared either way — a stale row simply expires
    });
  }
  return response;
}
