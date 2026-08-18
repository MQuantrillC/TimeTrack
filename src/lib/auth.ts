import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";
import { promisify } from "node:util";
import type { NextRequest, NextResponse } from "next/server";
import { db } from "./db";

// promisify resolves to the no-options overload, so name the one we use
const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

/** OWASP minimum for scrypt at N=2^14 is p=5. Memory stays at 128*N*r = 16 MB. */
const PARAMS = { N: 16384, r: 8, p: 5, keylen: 64 };

export const SESSION_COOKIE = "tt_session";
const SESSION_TTL_DAYS = 30;

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

/* ------------------------------------------------------------------ passwords */

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password.normalize("NFKC"), salt, PARAMS.keylen, {
    N: PARAMS.N,
    r: PARAMS.r,
    p: PARAMS.p,
  });
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltPart, keyPart] = parts;
  try {
    const salt = Buffer.from(saltPart, "base64url");
    const expected = Buffer.from(keyPart, "base64url");
    const key = await scryptAsync(password.normalize("NFKC"), salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    return key.length === expected.length && timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

/** True when a stored hash was made with weaker settings than PARAMS. */
export function needsRehash(stored: string): boolean {
  const [scheme, n, r, p] = stored.split("$");
  return (
    scheme !== "scrypt" ||
    Number(n) !== PARAMS.N ||
    Number(r) !== PARAMS.r ||
    Number(p) !== PARAMS.p
  );
}

/**
 * A hash of a random value nobody holds the input to, verified when no account
 * matches so that sign-in does comparable work on both paths.
 *
 * It is a decoy, not a secret. Note that it cannot equalise timing on its own:
 * hashes made under older parameters cost less to verify, so the sign-in route
 * also pads every rejection to a fixed floor.
 */
export const DECOY_HASH =
  "scrypt$16384$8$5$08Jth7DgqWQtiTe2FXMGfw$PNcfim2U7uRq9x0OETLm3mQ0YVcMBc-QYG1AEKd6_FOT2ZhntlR3nwTMitYsR0BwVM_6ysrBFmRDfJ6phUPp1g";

/* ------------------------------------------------------------------- sessions */

/**
 * Opaque session tokens. Only the SHA-256 of a token is stored, so a leaked
 * database still cannot be used to impersonate anyone.
 */
export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<string> {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);
  const sql = await db();
  // sign-in is a natural moment to drop this user's stale rows
  await sql`delete from auth_sessions where user_id = ${userId} and expires_at < now()`;
  await sql`
    insert into auth_sessions (token_hash, user_id, expires_at)
    values (${tokenHash(token)}, ${userId}, ${expiresAt.toISOString()})
  `;
  return token;
}

export async function destroySession(token: string): Promise<void> {
  const sql = await db();
  await sql`delete from auth_sessions where token_hash = ${tokenHash(token)}`;
}

export async function userFromRequest(request: NextRequest): Promise<User | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const sql = await db();
  const rows = await sql`
    select u.id, u.first_name, u.last_name, u.email
      from auth_sessions s
      join users u on u.id = s.user_id
     where s.token_hash = ${tokenHash(token)}
       and s.expires_at > now()
  `;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    email: row.email as string,
  };
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 86_400,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

/* ----------------------------------------------------------------- validation */

export type Credentials = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateSignUp(input: Partial<Credentials>): string | null {
  const firstName = (input.firstName ?? "").trim();
  const lastName = (input.lastName ?? "").trim();
  const email = normalizeEmail(input.email ?? "");
  const password = input.password ?? "";

  if (firstName.length < 1 || firstName.length > 80) return "Enter your first name.";
  if (lastName.length < 1 || lastName.length > 80) return "Enter your last name.";
  if (email.length > 254 || !EMAIL.test(email)) return "Enter a valid email address.";
  if (password.length < 8) return "Use a password of at least 8 characters.";
  if (password.length > 200) return "That password is too long.";
  return null;
}

export function newUserId(): string {
  return randomUUID();
}
