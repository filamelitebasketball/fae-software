/**
 * Where this site lives, in one place.
 *
 * The public origin was written out by hand in 36 places across 23 files —
 * canonical tags, og:url, the sitemap, JSON-LD, and the footer painted onto
 * every shared player card. Moving to a real domain meant finding all 36, and
 * anything missed would keep pointing Google at the old Lovable address with a
 * canonical tag aimed away from the new one.
 *
 * Set VITE_SITE_URL when the domain changes. The default is the current
 * Lovable address, so nothing moves until it is set.
 */

const RAW =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_URL) ||
  (typeof process !== "undefined" && process.env?.SITE_URL) ||
  "https://nxgenpremierleague.lovable.app";

/** No trailing slash, so `${SITE_URL}/faq` never becomes a double slash. */
export const SITE_URL = String(RAW).replace(/\/+$/, "");

/** Bare host, for the line printed on shared player cards. */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
