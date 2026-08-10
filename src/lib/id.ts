export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Unambiguous alphabet — no 0/o, 1/l/i, so a code can be read aloud or typed. */
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
const CODE_LENGTH = 16;

export const CODE_PATTERN = new RegExp(`^[${ALPHABET}]{${CODE_LENGTH}}$`);

/** 16 characters, ~79 bits of entropy. Stored bare, shown in groups of four. */
export function newSyncCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

/** Accepts dashes, spaces and any casing. */
export function normalizeSyncCode(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** kfn3-8pqz-2wtd-6hxs */
export function formatSyncCode(code: string): string {
  return (code.match(/.{1,4}/g) ?? []).join("-");
}
