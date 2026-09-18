import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getProfileByBraceletUid } from "@/lib/public-players.functions";
import nxgLogo from "@/assets/NXG-trim.png.asset.json";

export const Route = createFileRoute("/t/$uid")({
  head: () => ({
    meta: [
      { title: "NXGEN Tap — Loading Player" },
      { name: "description", content: "Bracelet tap — opening player profile." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TapLanding,
});

function TapLanding() {
  const { uid } = Route.useParams();
  const navigate = useNavigate();
  const fetchByUid = useServerFn(getProfileByBraceletUid);
  const [status, setStatus] = useState<"loading" | "unlinked" | "private" | "error">("loading");

  useEffect(() => {
    (async () => {
      try {
        const row = await fetchByUid({ data: { uid } });
        if (!row) return setStatus("unlinked");
        if (row.is_public === false) return setStatus("private");
        navigate({ to: "/players/$playerId", params: { playerId: row.profile_id }, replace: true });
      } catch {
        setStatus("error");
      }
    })();
  }, [uid, navigate, fetchByUid]);

  return (
    <div className="min-h-screen grid place-items-center bg-background px-6 text-center">
      <div className="max-w-md space-y-6">
        <img src={nxgLogo.url} alt="NXGEN" className="mx-auto h-20 w-20 object-contain" />
        {status === "loading" && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Bracelet detected</p>
            <p className="text-lg">Opening player profile…</p>
            <div className="mx-auto h-1 w-24 animate-pulse bg-foreground/40" />
          </>
        )}
        {status === "unlinked" && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Unlinked bracelet</p>
            <h1 className="text-2xl font-black uppercase">This bracelet isn't linked yet</h1>
            <p className="text-sm text-muted-foreground">UID <span className="font-mono">{uid}</span></p>
            <div className="flex flex-col gap-2">
              <Link to="/auth" className="inline-block border border-foreground bg-foreground px-4 py-2 text-xs font-bold uppercase tracking-widest text-background">Sign in to link this bracelet</Link>
              <Link to="/register" className="text-xs text-muted-foreground underline">Or register as a new player</Link>
            </div>
          </>
        )}
        {status === "private" && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Private profile</p>
            <h1 className="text-2xl font-black uppercase">This player is private</h1>
            <Link to="/" className="text-xs text-muted-foreground underline">Back to NXGEN</Link>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-sm text-muted-foreground">Something went wrong. Please try again.</p>
            <Link to="/" className="text-xs underline">Back to NXGEN</Link>
          </>
        )}
      </div>
    </div>
  );
}
