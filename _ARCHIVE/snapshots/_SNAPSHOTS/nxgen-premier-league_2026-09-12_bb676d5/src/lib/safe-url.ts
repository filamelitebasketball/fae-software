/** Only http(s) links are safe to render as an href or persist from user input. */
export function isSafeHttpUrl(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  const value = raw.trim();
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Returns the URL when safe, otherwise undefined (so no href is rendered). */
export function safeHttpUrl(raw: unknown): string | undefined {
  return isSafeHttpUrl(raw) ? (raw as string).trim() : undefined;
}
