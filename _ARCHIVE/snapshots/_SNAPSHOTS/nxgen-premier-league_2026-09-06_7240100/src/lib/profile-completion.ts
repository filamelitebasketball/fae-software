export type CompletableProfile = {
  full_name?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  bio?: string | null;
  position?: string | null;
  jersey_number?: string | null;
  division?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  date_of_birth?: string | null;
};

export const COMPLETION_FIELDS: { key: keyof CompletableProfile; label: string }[] = [
  { key: "full_name", label: "Full name" },
  { key: "phone", label: "Phone" },
  { key: "photo_url", label: "Profile photo" },
  { key: "bio", label: "Short bio" },
  { key: "position", label: "Position" },
  { key: "jersey_number", label: "Jersey number" },
  { key: "division", label: "Division" },
  { key: "height_cm", label: "Height" },
  { key: "weight_kg", label: "Weight" },
  { key: "date_of_birth", label: "Date of birth" },
];

export function computeCompletion(p: CompletableProfile | null | undefined) {
  if (!p) return { percent: 0, missing: COMPLETION_FIELDS.map((f) => f.label), completed: 0, total: COMPLETION_FIELDS.length };
  const missing: string[] = [];
  let done = 0;
  for (const f of COMPLETION_FIELDS) {
    const v = p[f.key];
    const filled = v !== null && v !== undefined && String(v).trim() !== "";
    if (filled) done += 1;
    else missing.push(f.label);
  }
  return {
    percent: Math.round((done / COMPLETION_FIELDS.length) * 100),
    completed: done,
    total: COMPLETION_FIELDS.length,
    missing,
  };
}

/** Minimum % required to unlock restricted features (bracelet, wallet, purchases). */
export const COMPLETION_UNLOCK = 60;

export function isProfileUnlocked(p: CompletableProfile | null | undefined) {
  return computeCompletion(p).percent >= COMPLETION_UNLOCK;
}
