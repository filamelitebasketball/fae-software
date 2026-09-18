import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Renders an image stored in a *private* Supabase Storage bucket by fetching
 * a short-lived signed URL. Falls back to the given `fallback` node while
 * loading or on error. Use for buckets like `player-photos`, `potg-posts`,
 * `payment-proofs` that cannot be made public (workspace policy blocks it).
 */
export function SignedImage({
  bucket,
  path,
  alt,
  className,
  fallback,
  expiresIn = 3600,
}: {
  bucket: string;
  path: string | null | undefined;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  expiresIn?: number;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    setUrl(null); setErr(false);
    if (!path) return;
    // Already a full URL? just use it.
    if (/^https?:\/\//i.test(path)) { setUrl(path); return; }
    (async () => {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
      if (!alive) return;
      if (error || !data?.signedUrl) setErr(true);
      else setUrl(data.signedUrl);
    })();
    return () => { alive = false; };
  }, [bucket, path, expiresIn]);

  if (!path || err) return <>{fallback ?? null}</>;
  if (!url) return <>{fallback ?? <div className={className} aria-label={alt} />}</>;
  return <img src={url} alt={alt} className={className} loading="lazy" />;
}
