/**
 * Who may see the account roster.
 *
 * Server-only, like lib/flair.ts: imported by API routes and never by a client
 * component, so these addresses stay out of the JavaScript bundle. The client
 * receives a boolean, which decides whether to *show* the button — the endpoint
 * itself re-checks on every request, so the boolean grants nothing.
 */

const ADMINS = new Set(["quantrillmarco@gmail.com"]);

export function isAdmin(email: string): boolean {
  return ADMINS.has(email.trim().toLowerCase());
}
