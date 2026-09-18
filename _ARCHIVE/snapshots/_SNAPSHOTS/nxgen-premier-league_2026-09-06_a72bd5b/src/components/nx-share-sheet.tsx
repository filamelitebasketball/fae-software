/**
 * Share one achievement.
 *
 * What each network actually allows, because the buttons have to be honest:
 *
 *   X and Facebook  — real web intents. X takes prefilled text plus a link;
 *                     Facebook takes a link only and ignores any text you pass,
 *                     so the caption is copied to the clipboard for pasting.
 *   Instagram, TikTok — no web share endpoint exists for posting a picture from
 *                     a page. Anyone who claims otherwise is linking you to a
 *                     dead end. On a phone the native share sheet does the job
 *                     properly (it hands the actual image file to the app), so
 *                     that is tried first; on desktop the card is saved and the
 *                     caption copied, which is the real workflow.
 *   Anything else   — the OS share sheet where it exists, otherwise copy link.
 */

import { useCallback, useRef, useState } from "react";
import { Share2, Download, Link2, Check } from "lucide-react";

export type SharePayload = {
  /** Used for the file name and the native share title. */
  title: string;
  caption: string;
  url: string;
  /**
   * Canvas size the card is painted at. Defaults to a 1080 square; a payload
   * that paints taller MUST say so, or everything past the default height is
   * silently cropped off the exported image.
   */
  width?: number;
  height?: number;
  draw: (ctx: CanvasRenderingContext2D) => void | Promise<void>;
};

const DEFAULT_SIZE = 1080;

type NavShare = Navigator & {
  canShare?: (d: ShareData) => boolean;
  share?: (d: ShareData) => Promise<void>;
};

function slug(s: string) {
  return s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "nxgen";
}

export function NxShareSheet({ payload, compact = false }: { payload: SharePayload; compact?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filename = `${slug(payload.title)}-nxgen.png`;

  const render = useCallback(async (): Promise<Blob | null> => {
    const w = payload.width ?? DEFAULT_SIZE;
    const h = payload.height ?? DEFAULT_SIZE;
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvasRef.current = canvas;
    }
    // Reused across payloads of different shapes, so set both every time.
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // Fonts may not be ready on first paint; without this the card renders in a
    // fallback face and the type looks nothing like the site.
    try {
      await document.fonts?.ready;
    } catch {
      /* font loading is a nicety, not a requirement */
    }
    ctx.clearRect(0, 0, w, h);
    await payload.draw(ctx);
    return new Promise((resolve) => canvas!.toBlob(resolve, "image/png"));
  }, [payload]);

  const saveImage = useCallback(async () => {
    const blob = await render();
    if (!blob) return false;
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 4000);
    return true;
  }, [render, filename]);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }, []);

  /** Try to hand the actual image to the OS share sheet. */
  const nativeShare = useCallback(async (): Promise<boolean> => {
    const nav = navigator as NavShare;
    const blob = await render();
    if (!blob || !nav.share) return false;
    const file = new File([blob], filename, { type: "image/png" });
    if (nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], text: payload.caption, title: payload.title });
        return true;
      } catch {
        return false; // user dismissed, or the app refused the file
      }
    }
    try {
      await nav.share({ title: payload.title, text: payload.caption, url: payload.url });
      return true;
    } catch {
      return false;
    }
  }, [render, filename, payload]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
    } catch {
      setMsg("Something went wrong. Try saving the image instead.");
    } finally {
      setBusy(false);
    }
  };

  const openIntent = (href: string) => {
    // noopener matters: a share window with window.opener can navigate this tab.
    window.open(href, "_blank", "noopener,noreferrer,width=600,height=560");
  };

  const onX = () =>
    run(async () => {
      openIntent(
        `https://x.com/intent/tweet?text=${encodeURIComponent(payload.caption)}&url=${encodeURIComponent(payload.url)}`,
      );
      const ok = await saveImage();
      setMsg(ok ? "Card saved — attach it to your post." : "Opened X.");
    });

  const onFacebook = () =>
    run(async () => {
      openIntent(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(payload.url)}`);
      const copied = await copy(payload.caption);
      await saveImage();
      setMsg(
        copied
          ? "Caption copied and card saved — Facebook only accepts the link, so paste and attach."
          : "Card saved — attach it to your post.",
      );
    });

  const onAppOnly = (app: "Instagram" | "TikTok") => () =>
    run(async () => {
      if (await nativeShare()) return;
      const copied = await copy(payload.caption);
      const saved = await saveImage();
      setMsg(
        `${app} has no web posting link, so the card ${saved ? "is saved to your downloads" : "could not be saved"}${
          copied ? " and the caption is copied" : ""
        } — open ${app} and post it.`,
      );
    });

  const onGeneric = () =>
    run(async () => {
      if (await nativeShare()) return;
      const copied = await copy(`${payload.caption}\n${payload.url}`);
      setMsg(copied ? "Link and caption copied." : "Could not copy. Save the card instead.");
    });

  const onCopyLink = () =>
    run(async () => {
      const ok = await copy(payload.url);
      setMsg(ok ? "Link copied." : "Could not copy the link.");
    });

  const onSave = () =>
    run(async () => {
      const ok = await saveImage();
      setMsg(ok ? "Saved to your downloads." : "Could not save the card.");
    });

  return (
    <div className={`sh-sheet${compact ? " sh-compact" : ""}`}>
      <div className="sh-row" role="group" aria-label={`Share ${payload.title}`}>
        <button type="button" className="sh-btn sh-primary" onClick={onGeneric} disabled={busy}>
          <Share2 aria-hidden="true" /> Share
        </button>
        <button type="button" className="sh-btn sh-fb" onClick={onFacebook} disabled={busy}>
          <FbGlyph /> Facebook
        </button>
        <button type="button" className="sh-btn sh-ig" onClick={onAppOnly("Instagram")} disabled={busy}>
          <IgGlyph /> Instagram
        </button>
        <button type="button" className="sh-btn sh-x" onClick={onX} disabled={busy}>
          <XGlyph /> X
        </button>
        <button type="button" className="sh-btn sh-tt" onClick={onAppOnly("TikTok")} disabled={busy}>
          <TtGlyph /> TikTok
        </button>
        <button type="button" className="sh-btn" onClick={onSave} disabled={busy}>
          <Download aria-hidden="true" /> Save card
        </button>
        <button type="button" className="sh-btn" onClick={onCopyLink} disabled={busy}>
          <Link2 aria-hidden="true" /> Copy link
        </button>
      </div>
      <p className="sh-msg" role="status" aria-live="polite">
        {msg ? (
          <>
            <Check aria-hidden="true" /> {msg}
          </>
        ) : (
          ""
        )}
      </p>
    </div>
  );
}

/* Brand glyphs. lucide dropped its social marks, and these have to be
   recognisable at 15px or the row reads as seven identical buttons. */
const g = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true } as const;

const FbGlyph = () => (
  <svg {...g}>
    <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.33v6.99A10 10 0 0 0 22 12Z" />
  </svg>
);
const XGlyph = () => (
  <svg {...g}>
    <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.21-6.82-5.97 6.82H1.68l7.73-8.84L1.25 2.25h6.82l4.71 6.23 5.46-6.23Zm-1.16 17.52h1.83L7.01 4.13H5.04l12.04 15.64Z" />
  </svg>
);
const IgGlyph = () => (
  <svg {...g}>
    <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.8 3.8 0 0 1-1.38-.9 3.8 3.8 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16Zm0 5.68a4.16 4.16 0 1 0 0 8.32 4.16 4.16 0 0 0 0-8.32Zm0 6.86a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4Zm5.3-7.02a.97.97 0 1 1-1.94 0 .97.97 0 0 1 1.94 0Z" />
  </svg>
);
const TtGlyph = () => (
  <svg {...g}>
    <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-1.85-2.48V9.78a5.72 5.72 0 1 0 4.94 5.66V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.29 4.29 0 0 1-3.24-1.48Z" />
  </svg>
);
