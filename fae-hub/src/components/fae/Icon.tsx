import type { CSSProperties } from "react";

/**
 * F.A.E. icon set — hand-drawn stroke SVGs so every sport glyph
 * matches the brand (no stock icon library look).
 */

const PATHS: Record<string, React.ReactNode> = {
  logo: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18M5.6 5.6c2.4 1.7 3.9 3.9 3.9 6.4s-1.5 4.7-3.9 6.4M18.4 5.6c-2.4 1.7-3.9 3.9-3.9 6.4s1.5 4.7 3.9 6.4" />
    </>
  ),
  basketball: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18M5.6 5.6c2.4 1.7 3.9 3.9 3.9 6.4s-1.5 4.7-3.9 6.4M18.4 5.6c-2.4 1.7-3.9 3.9-3.9 6.4s1.5 4.7 3.9 6.4" />
    </>
  ),
  volleyball: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 8.5 6M12 3a13.5 13.5 0 0 1 1.5 9M12 3a13.7 13.7 0 0 0-6.8 8.2M20.5 9a13.5 13.5 0 0 1-11 5.6M20.5 9A9 9 0 0 1 12 21M9.5 14.6A9 9 0 0 1 12 21M5.2 11.2A9 9 0 0 1 12 21" />
    </>
  ),
  pickleball: (
    <>
      <path d="M14.5 3.5a6 6 0 0 1 6 6c0 2.6-1.7 4.4-3.8 5.2l-4.9 4.9a2.4 2.4 0 0 1-3.4 0l-1-1a2.4 2.4 0 0 1 0-3.4l4.9-4.9c.8-2.1-.3-4.4 1.2-5.9a6 6 0 0 1 1-0.9z" />
      <circle cx="15" cy="9" r="0.6" />
      <circle cx="12.4" cy="11.6" r="0.6" />
      <circle cx="17.4" cy="11.6" r="0.6" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
      <path d="M8 5H5a3 3 0 0 0 3 4M16 5h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4l.7 3H9.3l.7-3z" />
    </>
  ),
  net: (
    <>
      <path d="M3 5h18M3 19h18M3 5v14M21 5v14M8.2 5v14M15.8 5v14M3 12h18" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 2" />
    </>
  ),
  phone: <path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  star: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8L12 3.5z" />,
  "arrow-right": <path d="M4 12h15M13 6l6 6-6 6" />,
  "arrow-down": <path d="M12 4v15M6 13l6 6 6-6" />,
  "arrow-up-right": <path d="M7 17L17 7M9 7h8v8" />,
  check: <path d="M4.5 12.5l5 5 10-11" />,
  alert: (
    <>
      <path d="M12 3.5L22 20H2L12 3.5z" />
      <path d="M12 10v4.5M12 17.4v.1" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l5 5" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6L6 18" />,
  "chevron-down": <path d="M6 9.5l6 6 6-6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  play: <path d="M8 5.5v13l11-6.5-11-6.5z" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 5.4a3.5 3.5 0 0 1 0 6.2M17.5 14.3a6.5 6.5 0 0 1 4 5.7" />
    </>
  ),
  logout: <path d="M14 4H6v16h8M10 12h11M18 8l3.5 4L18 16" />,
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3.5h12V21l-2-1.4-2 1.4-2-1.4L10 21l-2-1.4L6 21V3.5z" />
      <path d="M9.5 8.5h5M9.5 12h5" />
    </>
  ),
  package: (
    <>
      <path d="M12 3l8 4v10l-8 4-8-4V7l8-4z" />
      <path d="M4 7l8 4 8-4M12 11v10" />
    </>
  ),
  chart: <path d="M4 20V10M9.5 20V4M15 20v-9M20 20V7" />,
  activity: <path d="M3 12h4l2.5-7 4.5 14L16.5 12H21" />,
  "credit-card": (
    <>
      <rect x="3" y="5.5" width="18" height="13.5" rx="2" />
      <path d="M3 10h18M6.5 14.5h4" />
    </>
  ),
  google: (
    <>
      <path d="M21.35 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.24a4.48 4.48 0 0 1-1.94 2.94v2.44h3.14c1.84-1.7 2.91-4.2 2.91-7.39z" fill="#4285F4" stroke="none" />
      <path d="M12 22c2.7 0 4.96-.9 6.61-2.44l-3.14-2.44c-.87.58-1.98.93-3.47.93-2.67 0-4.93-1.8-5.74-4.22H3.02v2.52A10 10 0 0 0 12 22z" fill="#34A853" stroke="none" />
      <path d="M6.26 13.83a6.02 6.02 0 0 1 0-3.83V7.48H3.02a10 10 0 0 0 0 9.04l3.24-2.69z" fill="#FBBC05" stroke="none" />
      <path d="M12 5.95c1.47 0 2.79.51 3.83 1.5l2.87-2.87A9.98 9.98 0 0 0 12 2 10 10 0 0 0 3.02 7.48l3.24 2.52C7.07 7.75 9.33 5.95 12 5.95z" fill="#EA4335" stroke="none" />
    </>
  ),
  facebook: (
    <path
      d="M13.5 22v-8.2h2.76l.41-3.2H13.5V8.56c0-.93.26-1.56 1.58-1.56h1.69V4.14c-.3-.04-1.3-.14-2.48-.14-2.45 0-4.13 1.5-4.13 4.24v2.36H7.4v3.2h2.76V22h3.34z"
      fill="#1877F2"
      stroke="none"
    />
  ),
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  tiktok: (
    <path d="M16.6 5.82A4.28 4.28 0 0 1 13 2h-3v13.5a2.5 2.5 0 1 1-2-2.45V9.5a6 6 0 1 0 5.5 6V9.82A7.72 7.72 0 0 0 18 11V7.5a4.28 4.28 0 0 1-1.4-1.68z" />
  ),
  "message-circle": (
    <path d="M21 12a9 9 0 0 1-13.46 7.82L3 21l1.18-4.54A9 9 0 1 1 21 12z" />
  ),
  "sign-out": <path d="M14 4H6v16h8M10 12h11M18 8l3.5 4L18 16" />,
  "calendar-clock": (
    <>
      <rect x="4" y="5.5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
      <circle cx="12" cy="15" r="2.5" />
      <path d="M12 13.5v1.5l1 .7" />
    </>
  ),
  "help-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 0 1 4.87.5c0 1.5-2.37 2-2.37 3.5M12 17.5v.1" />
    </>
  ),
  shield: (
    <path d="M12 3l7 3.5v5c0 4.5-3 8.3-7 9.5-4-1.2-7-5-7-9.5v-5L12 3z" />
  ),
  "external-link": (
    <>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6M10 14L21 3" />
    </>
  ),
};

export interface IconProps {
  name: keyof typeof PATHS | string;
  size?: number;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, className, style, strokeWidth = 1.6 }: IconProps) {
  const filled = name === "google" || name === "facebook" || name === "tiktok";
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      fill={filled ? undefined : "none"}
      stroke={filled ? undefined : "currentColor"}
      strokeWidth={filled ? undefined : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name] ?? null}
    </svg>
  );
}
