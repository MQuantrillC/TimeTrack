# TimeTrack — Security Audit

**Date:** 17 August 2026
**Commit audited:** `076dd55`
**Target:** https://time-track-eight-lyart.vercel.app

## Scope and method

Whole-codebase review at `076dd55`: all 29 source files, the five API routes, the
authentication and sync layers, the database schema, and the deployed production instance.

Covered: authentication, session management, authorization and tenant isolation, SQL
injection, XSS, CSRF, information disclosure, transport security, dependency
vulnerabilities, input validation, denial of service, secrets handling, and the
commercial and regulatory gaps a corporate buyer will ask about.

Method: static review of every server-side path, dependency audit (`npm audit`, production
and development trees), inspection of live production response headers, verification of
which build is actually deployed, and dynamic probing of the authentication endpoints
against a local instance connected to the production database.

Not covered: the infrastructure and account security of Vercel and Neon themselves,
physical and organisational controls, penetration testing of third-party dependencies, and
load or resilience testing.

---

## Summary

| ID | Severity | Finding |
|----|----------|---------|
| C1 | **Critical** | Production database credential exposed and not rotated |
| H1 | **High** | No rate limiting or lockout on authentication endpoints |
| H2 | **High** | Password hashing work factor below OWASP minimum |
| M1 | Medium | User enumeration via sign-up response and sign-in timing |
| M2 | Medium | Security headers absent (CSP, frame-ancestors, nosniff, Referrer-Policy) |
| M3 | Medium | Public health endpoint discloses environment and schema detail |
| M4 | Medium | No password reset and no email verification |
| M5 | Medium | Application database role holds DDL privileges |
| M6 | Medium | No account deletion or data export (GDPR Articles 17 and 20) |
| L1 | Low | Expired sessions are never purged |
| L2 | Low | 30-day sessions with no idle timeout or rotation |
| L3 | Low | Request body parsed before the size cap is applied |
| L4 | Low | Session cookie lacks the `__Host-` prefix |
| L5 | Low | No audit logging |
| L6 | Low | Synced state document is only shallowly validated |
| I1 | Info | CSRF defence rests entirely on `SameSite=Lax` |
| I2 | Info | Tracker data is held in `localStorage` in plaintext |
| I3 | Info | No MFA, SSO or team model |

**Verdict.** The core security engineering is sound: no injection surface, no broken access
control, no XSS vector, and correct cryptographic primitives. What stands between this and
a corporate sale is not architecture but a handful of hardening measures plus the
account-lifecycle and compliance features an enterprise buyer treats as table stakes. C1
must be resolved before any commercial conversation.

---

## Remediation applied — 18 August 2026

Six findings have been closed. Each was chosen for having no effect on how the application
behaves for a user; the rest remain open and are described in full below.

| ID | Status | What changed |
|----|--------|--------------|
| H2 | **Fixed** | scrypt raised to N=2^14, r=8, **p=5**, the OWASP minimum at this N. Verified cost rose from 59 ms to ~115 ms per hash. Because parameters live inside each hash string, existing passwords keep verifying; a successful sign-in now re-hashes anything stored under weaker settings, so accounts migrate as people use them. |
| M1 | **Partly fixed** | The timing oracle is closed. Sign-in hashes on both paths and pads every rejection to a 500 ms floor. The sign-up 409 still discloses that an address is registered — closing it needs the email capability from M4, so it stays open. |
| M2 | **Fixed** | `next.config.ts` now sets a Content-Security-Policy, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` and `Permissions-Policy`, and drops the `X-Powered-By` banner. Clickjacking is no longer possible. |
| M3 | **Fixed** | `/api/health` returns only `databaseConfigured` and `connection` to an anonymous caller. Variable names and table names now require a session, so the endpoint stays useful for diagnosing an outage without handing a stranger a map. |
| L1 | **Fixed** | Signing in first deletes that user's expired session rows, so the table no longer grows without bound. |
| L3 | **Fixed** | `Content-Length` is checked before the body is parsed, so an oversized payload is rejected without being read into memory. |

### On the timing fix

Worth recording, because the obvious fix was wrong. Hashing a decoy on the unknown-account
path did not equalise the timings — it inverted them. Hashes written under the old `p=1`
verify faster than the new `p=5` decoy, so accounts created before the change became
*faster* to reject than unknown addresses, and the oracle survived in the other direction.
Any fixed decoy has this problem while two parameter sets coexist. Padding every rejection
to a constant floor removes the signal regardless of which parameters a given hash carries.

Measured over eight samples per case, before and after:

```
before   unknown 205,205,160,155,148,130 ms   known 250,229,283,283,234,278 ms   (separable)
after    unknown 532,521,537,538,535,535,514,529 ms
         known   547,519,560,526,533,514,518,537 ms                              (overlapping)
```

### Verification

Production build served locally with the enforced policy: all pages render, fonts and
styles load, the timer runs, navigation and sign-in work, and the browser reports **no CSP
violations**. The password re-hash path was exercised end to end by planting a `p=1` hash,
signing in, and confirming it was rewritten to `p=5` with the old and new passwords still
behaving correctly. The oversized-payload guard returns 413.

---

## What is already correct

Worth stating plainly, because a buyer's reviewer will check these first.

- **No SQL injection surface.** All 14 SQL statements use the Neon driver's
  tagged-template form, so every value is sent as a bound parameter. There is no string
  concatenation into SQL anywhere, and no dynamic query construction.
- **No broken access control.** Every read and write on `workspace_state` is scoped to
  `user.id` resolved from the session cookie. The API accepts no user-supplied identifier
  for row lookup, so there is no IDOR surface. Sync returns 401 when unauthenticated.
  One deliberate exception, added 2 September 2026: `GET /api/admin/users` returns per-account
  totals — name, email, project and session counts, tracked time, last sync — to the
  addresses listed in `src/lib/admin.ts`. It is read-only and offers no way to act on
  another account. Authorisation is decided in the route on every request from the session
  cookie; the `admin` boolean the client receives only decides whether to draw the button,
  and forging it grants nothing. Verified: 401 signed out, 403 with no data for an ordinary
  signed-in account.
- **No XSS vector.** No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function` or
  `document.write` anywhere. All user-controlled strings render through React's escaping.
- **Sound password cryptography.** scrypt with a fresh 16-byte random salt per password,
  compared with `timingSafeEqual`. Parameters are stored alongside each hash, so the work
  factor can be raised without invalidating existing credentials.
- **Sound session handling.** 256-bit random tokens; only their SHA-256 is stored, so a
  database disclosure cannot be replayed into account takeover. A fresh token is issued on
  every sign-in, so session fixation is not possible.
- **Correct cookie flags.** `httpOnly`, `sameSite=lax`, `secure` in production, `path=/`.
- **Generic authentication errors.** Sign-in returns an identical message, status and — since
  the M1 fix — an indistinguishable response time for an unknown email and a wrong password.
- **No secrets in the repository.** `.env*` is gitignored with an explicit exception only
  for `.env.example`, which holds no values. No credentials appear in tracked files.
- **Clean dependency tree.** `npm audit` reports 0 vulnerabilities across production and
  development. Only four runtime dependencies: Next.js, React, React DOM, Neon driver.
- **Sanitised error responses.** Database exceptions are caught and replaced with generic
  messages; no driver output, stack trace or connection detail reaches the client.
- **HSTS enforced.** `max-age=63072000; includeSubDomains; preload`, supplied by Vercel.
  Since the M2 fix this sits alongside a CSP, `frame-ancestors 'none'`, `nosniff`,
  `Referrer-Policy` and `Permissions-Policy`.
- **API routes are not CORS-exposed.** No `Access-Control-Allow-Origin` on `/api/*`, so they
  are same-origin only. The static HTML carries Vercel's default `ACAO: *`, which is
  harmless — it permits reading public markup without credentials.
- **Payload cap.** Synced documents above 1 MB are rejected, so the endpoint cannot be used
  as general-purpose storage.
- **No console logging.** Nothing is written to logs anywhere in the application, so no
  credential or token can leak through log aggregation.

---

## Findings

### C1 — Production database credential exposed and not rotated · Critical

**Where:** Neon role `neondb_owner`; `.env.local` on the development workstation.

The connection string for the production database — including the password for the owning
role — was pasted into a third-party chat transcript and has not been rotated. It also sits
in cleartext in `.env.local` on at least one developer machine.

That role owns the schema. Anyone holding the string has unrestricted read and write access
to every account record, password hash and time-tracking document, and can drop the schema
outright. The database is reachable from the public internet; Neon does not restrict by
source IP on the free tier.

**Impact:** Complete compromise of all customer data at rest.

**Remediation.**

1. Reset the password for `neondb_owner` in the Neon console.
2. Confirm the Vercel integration has propagated the new value, then redeploy.
3. Remove `.env.local` from any machine that does not need it, or repopulate it with a
   development-branch credential rather than the production one.
4. Adopt a secret-management practice before selling: credentials never leave the secret
   store, are rotated on a schedule, and are rotated immediately on suspected exposure.

No commercial engagement should begin while this is outstanding. Due-diligence
questionnaires ask directly when credentials were last rotated and how exposure is handled.

---

### H1 — No rate limiting or lockout on authentication endpoints · High

**Where:** `src/app/api/auth/signin/route.ts`, `src/app/api/auth/signup/route.ts`

Neither endpoint limits attempts by IP, by account, or globally. There is no lockout, no
backoff, and no CAPTCHA. An attacker can guess passwords against a known email address as
fast as the platform will serve requests, indefinitely, and without leaving any trace
(see L5).

The only brake is the ~250 ms cost of a scrypt verification, capping a single-threaded
attacker at roughly four guesses a second per connection — no obstacle to a distributed or
merely patient one. Sign-up is likewise unthrottled, so the endpoint can be used to create
accounts in bulk.

**Impact:** Credential stuffing and online password guessing against any known account.

**Remediation.** Rate limit on both client IP and target email — a common starting point is
5 attempts per account per 15 minutes and 20 per IP per 15 minutes, with exponential
backoff beyond that. Because the platform is serverless, an in-memory counter will not hold
across instances; use a shared store (Upstash Redis, or a `login_attempts` table in the
existing database). Apply the same treatment to sign-up.

---

### H2 — Password hashing work factor below OWASP minimum · High

**Status: fixed 18 August 2026.** Raised to p=5, with re-hash on next sign-in.

**Where:** `src/lib/auth.ts` — `PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 }`

The scrypt cost is N=2^14, r=8, p=1. The OWASP Password Storage Cheat Sheet gives the
minimum acceptable scrypt configuration as N=2^17, r=8, p=1, or an equivalent trade, of
which the lowest listed is N=2^14, r=8, **p=5**. The current settings sit below every option
in that table.

Measured cost is approximately 59 ms per hash on the development machine, against a target
of at least 100 ms for interactive authentication.

**Impact:** If the password table is disclosed, offline cracking is roughly five times
cheaper than the accepted baseline. This does not affect online attacks, and does not weaken
the hashes against anything but brute force — the per-password salt still defeats
precomputation entirely.

**Remediation.** Raise to `p: 5`, keeping N=2^14 so memory stays at 16 MB per hash (the
safer choice on a memory-constrained serverless runtime), or move to N=2^16, r=8, p=2.
Because parameters are stored inside each hash string, existing passwords keep verifying
under their old settings; add a re-hash on the next successful sign-in to migrate users
forward.

---

### M1 — User enumeration via sign-up response and sign-in timing · Medium

**Status: partly fixed 18 August 2026.** Timing oracle closed; the sign-up 409 remains.

**Where:** `src/app/api/auth/signup/route.ts` (409 response); `src/app/api/auth/signin/route.ts`

Two independent oracles reveal whether a given email has an account.

**Direct.** Sign-up returns `409 "An account with that email already exists."` — an
unauthenticated caller learns membership from a single request.

**Timing.** Sign-in returns early when no user row matches, *before* running scrypt. When
the account exists, the ~250 ms verification runs. Measured against a local instance, six
samples each:

```
unknown email:                 205, 205, 160, 155, 148, 130 ms   (median ~157)
known email, wrong password:   250, 229, 283, 283, 234, 278 ms   (median ~263)
```

The distributions barely overlap; a handful of samples per address classifies it reliably.

**Impact:** An attacker can confirm which addresses on a list hold accounts — useful for
targeted phishing and for narrowing a credential-stuffing campaign. Combined with H1, which
imposes no cost on repeated probing, this is more than theoretical.

**Remediation.** For the timing channel, always perform a scrypt verification: when no user
matches, verify the supplied password against a fixed dummy hash and discard the result, so
both paths do equal work. For the direct oracle, either return an identical success-shaped
response and send an email explaining that an account already exists (the standard pattern,
which needs M4's email capability), or accept the disclosure as a deliberate usability
trade-off and record that decision.

---

### M2 — Security headers absent · Medium

**Status: fixed 18 August 2026.** Full header set added, verified against a production build.

**Where:** `next.config.ts` — no `headers()` entry; no middleware.

Live production responses carry `Strict-Transport-Security` from Vercel and nothing else.
Absent:

- `Content-Security-Policy` — no defence in depth if an XSS vector is ever introduced
- `X-Frame-Options` / CSP `frame-ancestors` — the app can be framed by any origin, so it is
  clickjackable; an attacker can overlay the authenticated UI and harvest interactions
- `X-Content-Type-Options: nosniff` — permits MIME-type confusion
- `Referrer-Policy` — full URLs leak to third parties in the `Referer` header
- `Permissions-Policy` — no restriction on camera, microphone, geolocation

**Impact:** Clickjacking is directly exploitable today. The rest are defence-in-depth gaps
that a buyer's automated scan will flag immediately.

**Remediation.** Add a `headers()` block to `next.config.ts` setting `frame-ancestors
'none'`, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive
`Permissions-Policy`, and a CSP. Next.js needs `'unsafe-inline'` for styles unless nonces
are wired up, so start in report-only mode, confirm nothing breaks, then enforce.

---

### M3 — Public health endpoint discloses environment and schema detail · Medium

**Status: fixed 18 August 2026.** Detail now requires a session.

**Where:** `src/app/api/health/route.ts`

`GET /api/health` requires no authentication and currently returns, from production:

```json
{ "databaseConfigured": true, "connectionVariable": "DATABASE_URL",
  "detectedVariables": ["DATABASE_URL","DATABASE_URL_UNPOOLED","POSTGRES_PRISMA_URL",
                        "POSTGRES_URL","POSTGRES_URL_NON_POOLING","POSTGRES_URL_NO_SSL"],
  "connection": "ok", "tables": ["auth_sessions","users","workspace_state"] }
```

No credential is exposed — the endpoint returns variable *names* only, by design. But it
confirms the hosting provider, the database vendor, the exact table names, and that a
`POSTGRES_URL_NO_SSL` variable exists in the environment.

**Impact:** Reconnaissance value. None of it is exploitable alone; all of it shortens an
attacker's path.

**Remediation.** Keep the endpoint — it earned its place during deployment — but reduce the
unauthenticated response to `{ "status": "ok" }` and gate the detail behind a shared-secret
header or an authenticated session.

---

### M4 — No password reset and no email verification · Medium

**Where:** no such routes exist.

There is no way to recover an account. A forgotten password means the account and all its
data are permanently unreachable, with no administrative override. Email addresses are never
verified, so anyone can register using an address they do not control.

**Impact:** Guaranteed permanent data loss for any user who forgets a password — a support
burden no commercial buyer will accept. Unverified addresses additionally allow squatting on
a colleague's or a competitor's email.

**Remediation.** Add an email provider (Resend and Postmark both have suitable free tiers)
and implement verification on sign-up, plus password reset via a single-use, time-limited,
hashed token. Invalidate all existing sessions when a password changes.

---

### M5 — Application database role holds DDL privileges · Medium

**Where:** `src/lib/db.ts` — `ensureSchema()`

The application connects as `neondb_owner` and issues `CREATE TABLE IF NOT EXISTS` and
`CREATE INDEX IF NOT EXISTS` on the first request after every cold start. The runtime role
can therefore alter or drop the schema.

**Impact:** Any SQL injection or application compromise escalates from data disclosure to
schema destruction. No such vector was found in this review, but the blast radius is larger
than it needs to be, and least privilege is a standard due-diligence question.

**Remediation.** Move schema creation into a migration run at deploy time, and have the
application connect as a role holding `SELECT, INSERT, UPDATE, DELETE` on the three tables
and nothing more.

---

### M6 — No account deletion or data export · Medium

**Where:** no such routes exist.

Users cannot delete their account or extract their data. Under GDPR that is Article 17
(erasure) and Article 20 (portability); comparable rights exist under CCPA.

The schema is well prepared for deletion — both `auth_sessions` and `workspace_state`
cascade from `users` — so a single `DELETE FROM users` fully erases a person. Only the
endpoint and the UI are missing.

**Impact:** Blocks a sale to any EU-facing company, and to most others with a privacy
review. Note also that data is stored in `us-east-1`, which is an international transfer
question for an EU customer.

**Remediation.** Add authenticated "delete my account" and "export my data" endpoints. For a
commercial sale, also prepare a privacy policy, a data processing agreement, a retention
schedule, and a documented answer on data residency.

---

### L1 — Expired sessions are never purged · Low

**Status: fixed 18 August 2026.** Purged for that user on each sign-in.

`auth_sessions` rows are deleted only on explicit sign-out, so expired rows accumulate
indefinitely. They cannot be used to authenticate — `userFromRequest` filters on
`expires_at > now()` — making this a hygiene and storage-growth issue rather than an
access-control one. Add a scheduled sweep, or delete expired rows opportunistically during
session lookup.

### L2 — 30-day sessions with no idle timeout or rotation · Low

Sessions last 30 days from issue regardless of activity, are not rotated periodically, and
are not invalidated when a password changes (there is no password change yet — see M4). A
stolen cookie stays valid for up to a month. Consider a shorter absolute lifetime with a
sliding idle window, and a "sign out everywhere" control once account management exists.

### L3 — Request body parsed before the size cap is applied · Low

**Status: fixed 18 August 2026.** Content-Length is checked first.

`src/app/api/sync/route.ts` calls `request.json()` and only then measures the serialised size
against the 1 MB cap, so a large payload is fully parsed before rejection. Vercel's own
request limit bounds this, so exposure is modest. Check `Content-Length` before parsing.

### L4 — Session cookie lacks the `__Host-` prefix · Low

The cookie is named `tt_session`. Renaming it to `__Host-tt_session` instructs the browser to
reject it unless it is secure, host-only and path `/` — which it already is — and prevents a
subdomain from overwriting it. Free hardening.

### L5 — No audit logging · Low

Nothing is recorded for sign-in success or failure, sign-up, sign-out, or data mutation.
There is no way to detect a brute-force campaign in progress (H1), investigate a suspected
compromise, or answer a customer asking who accessed what. Enterprise buyers commonly
require an audit trail outright.

### L6 — Synced state document is only shallowly validated · Low

`validState()` checks that `projects` and `sessions` are arrays and stops there. Any
structure within the 1 MB cap is accepted and stored. Because the document is scoped to its
own user and rendered through React's escaping, the exposure is self-inflicted only.
Validating the shape properly — with Zod or equivalent — would also protect the client from
a malformed document.

### I1 — CSRF defence rests entirely on `SameSite=Lax` · Informational

There is no CSRF token. State-changing requests are protected solely by the cookie's
`SameSite=Lax` attribute, which stops browsers sending it on cross-site POSTs. That is
correct and sufficient today, helped by `vercel.app` being on the Public Suffix List so
sibling deployments count as cross-site. It becomes fragile if the app moves to a custom
domain that also hosts other, less trusted applications on subdomains. Revisit then, with
the double-submit pattern or an `Origin` header check.

### I2 — Tracker data is held in `localStorage` in plaintext · Informational

Projects and sessions are mirrored to `localStorage` so the app works offline. Sign-out
clears it, but closing the browser without signing out leaves the data readable by anyone
with access to that profile, and by any script that achieves execution on the origin. This
is an inherent consequence of the offline-first design and is a reasonable trade, but it
should be disclosed to a buyer rather than discovered by them.

### I3 — No MFA, SSO or team model · Informational

There is no second factor, no SAML or OIDC, no organisations, no roles, and no administrator
view. All are standard expectations for business software, and their absence shapes what the
product can be sold as, and to whom.

---

## Prioritised remediation plan

**Before any commercial conversation**

1. C1 — rotate the exposed database credential.

**Before a paid pilot** (roughly a week of work)

2. H1 — rate limiting on both authentication endpoints.
3. H2 — raise the scrypt work factor, with re-hash on sign-in.
4. M2 — security headers, CSP report-only first.
5. M1 — constant-time sign-in path.
6. M3 — reduce the unauthenticated health response.

**Before a signed enterprise contract** (roughly a month)

7. M4 — email verification and password reset.
8. M6 — account deletion and data export, plus privacy policy and DPA.
9. M5 — least-privilege database role and deploy-time migrations.
10. L5 — audit logging for authentication and mutation events.
11. L1, L2, L3, L4, L6 — remaining hardening items.

**Shapes the product, not just its security posture**

12. I3 — MFA, SSO and a team model, if the buyer expects business software rather than a
    personal tool.

---

## Limitations

This is a code and configuration review with light dynamic probing, not a penetration test.
It covers the application at commit `076dd55` and does not assess the security of Vercel,
Neon, or the developer workstation. No third-party assurance is implied: a buyer requiring
independent validation will want an external test against a staging environment, and
possibly SOC 2 Type II evidence, neither of which this substitutes for.
