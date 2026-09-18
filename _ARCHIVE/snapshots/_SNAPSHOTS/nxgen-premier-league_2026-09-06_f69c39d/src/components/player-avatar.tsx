import { SignedImage } from "@/components/signed-image";

/**
 * Metallic NXGEN initial badge — used whenever a player has no profile picture.
 */
export function PlayerInitial({ name, size = 36 }: { name: string; size?: number }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full font-black"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.45,
        color: "#2a1600",
        background: "linear-gradient(145deg, #fff2a8 0%, #ffcc66 25%, #ffb347 55%, #b3651a 85%, #6b3a0a 100%)",
        boxShadow:
          "inset 0 2px 0 rgba(255,255,255,0.7), inset 0 -6px 10px rgba(0,0,0,0.4), 0 0 0 2px rgba(255,179,71,0.65), 0 6px 16px -3px rgba(255,106,0,0.55)",
        textShadow: "0 1px 0 rgba(255,255,255,0.45)",
      }}
    >
      {initial}
    </span>
  );
}

/**
 * Single source of truth for player imagery across the site.
 *
 * `photo` is whatever the record stores — a storage path in the private
 * `player-photos` bucket, or a full URL. Roster/leaderboard/POTG records all
 * resolve to the player's account profile picture (kept in sync by the
 * database), so changing the profile photo updates every card automatically.
 */
export function PlayerAvatar({
  name,
  photo,
  size = 36,
  className,
  rounded = true,
}: {
  name: string;
  photo?: string | null;
  size?: number;
  className?: string;
  rounded?: boolean;
}) {
  const shape = rounded ? "rounded-full" : "";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden ${shape} ${className ?? ""}`}
      style={className ? undefined : { width: size, height: size }}
    >
      <SignedImage
        bucket="player-photos"
        path={photo ?? null}
        alt={name}
        className="h-full w-full object-cover"
        fallback={<PlayerInitial name={name} size={size} />}
      />
    </span>
  );
}
