import {
  AtSign,
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  MessageCircle,
  Music2,
  Phone,
  Wallet,
  Youtube,
} from "lucide-react";

import type { LinkType, Profile, ProfileTheme } from "@/data/linkmeph";
import { cn } from "@/lib/utils";

const icons: Record<LinkType, React.ComponentType<{ className?: string }>> = {
  facebook: Facebook,
  instagram: Instagram,
  tiktok: Music2,
  website: Globe,
  whatsapp: MessageCircle,
  viber: MessageCircle,
  gcash: Wallet,
  email: AtSign,
  phone: Phone,
  linkedin: Linkedin,
  youtube: Youtube,
};

export const themeStyles: Record<
  ProfileTheme,
  { shell: string; cover: string; card: string; button: string; name: string; sub: string }
> = {
  midnight: {
    shell: "bg-ink",
    cover: "bg-[image:var(--gradient-brand)] opacity-80",
    card: "bg-ink/95 border-white/10",
    button: "border-white/10 bg-white/5 text-background hover:bg-white/10",
    name: "text-background",
    sub: "text-background/70",
  },
  aurora: {
    shell: "bg-secondary",
    cover: "brand-gradient",
    card: "bg-card border-border",
    button: "border-border bg-background text-foreground hover:bg-secondary",
    name: "text-foreground",
    sub: "text-muted-foreground",
  },
  ember: {
    shell: "bg-secondary",
    cover: "heat-gradient",
    card: "bg-card border-border",
    button: "border-primary/25 bg-primary/5 text-foreground hover:bg-primary/10",
    name: "text-foreground",
    sub: "text-muted-foreground",
  },
  paper: {
    shell: "bg-background",
    cover: "bg-muted",
    card: "bg-card border-border",
    button: "border-border bg-card text-foreground hover:bg-muted",
    name: "text-foreground",
    sub: "text-muted-foreground",
  },
};

export function ProfileCard({
  profile,
  theme,
  className,
  onLinkClick,
}: {
  profile: Profile;
  theme?: ProfileTheme;
  className?: string;
  onLinkClick?: (link: Profile["links"][number]) => void;
}) {
  const t = themeStyles[theme ?? profile.theme];
  const initials = profile.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  return (
    <div className={cn("overflow-hidden rounded-3xl border shadow-brand", t.shell, t.card, className)}>
      <div className={cn("relative h-28", t.cover)}>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium uppercase tracking-[0.2em] text-primary-foreground/70">
          cover photo
        </span>
      </div>

      <div className="-mt-10 px-5 pb-6">
        <div className="brand-gradient flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-card font-display text-xl font-bold text-primary-foreground">
          {initials}
        </div>
        <h2 className={cn("mt-4 text-xl font-bold", t.name)}>{profile.name || "Your name"}</h2>
        <p className={cn("text-sm", t.sub)}>
          {profile.title || "Your title"}
          {profile.company ? ` · ${profile.company}` : ""}
        </p>
        <p className={cn("mt-3 text-sm leading-relaxed", t.sub)}>{profile.bio}</p>

        {profile.embed ? (
          <div className="mt-5 rounded-2xl border border-border bg-muted/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {profile.embed.platform} {profile.embed.kind}
            </p>
            <div className="mt-2 flex aspect-video items-center justify-center rounded-xl bg-ink/90 text-xs text-background/70">
              Embedded {profile.embed.platform} {profile.embed.kind} preview
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{profile.embed.title}</p>
          </div>
        ) : null}

        <div className="mt-5 space-y-2">
          {profile.links.map((link) => {
            const Icon = icons[link.type];
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => onLinkClick?.(link)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                  t.button,
                )}
              >
                <Icon className="h-4 w-4 shrink-0 text-brand-blue" />
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{link.label}</span>
                  <span className="block text-xs opacity-70">{link.value}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function downloadVCard(profile: Profile) {
  const vcf = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${profile.name}`,
    `TITLE:${profile.title}`,
    `ORG:${profile.company}`,
    `EMAIL;TYPE=INTERNET:${profile.email}`,
    `TEL;TYPE=CELL:${profile.phone}`,
    `NOTE:${profile.bio}`,
    `URL:https://linkmeph.com/p/${profile.slug}`,
    "END:VCARD",
  ].join("\n");

  const blob = new Blob([vcf], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${profile.slug || "linkmeph"}.vcf`;
  a.click();
  URL.revokeObjectURL(url);
}
