/**
 * Small delights for particular accounts.
 *
 * Server-only on purpose: this module is imported by the auth routes and never
 * by a client component, so the addresses below stay out of the JavaScript
 * bundle. The client only ever learns a boolean about itself.
 */

const HEARTS = new Set(["daninicole2105@gmail.com"]);

export function heartsFor(email: string): boolean {
  return HEARTS.has(email.trim().toLowerCase());
}
