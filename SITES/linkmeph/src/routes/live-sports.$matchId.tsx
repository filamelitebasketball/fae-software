import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Heart, Lock, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/PageShell";
import { StreamEmbed } from "@/components/StreamEmbed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { matches } from "@/data/linkmeph";

export const Route = createFileRoute("/live-sports/$matchId")({
  head: () => ({
    meta: [
      { title: "Watch Live — LinkMePH Live Sports" },
      { name: "description", content: "Live basketball and volleyball stream with score, countdown and live chat on LinkMePH." },
      { property: "og:title", content: "Watch Live — LinkMePH Live Sports" },
      { property: "og:description", content: "Stream the game live with score updates, countdown and fan chat." },
    ],
  }),
  component: MatchPage,
});

const seedChat = [
  { id: "1", user: "MarkV", text: "Laban Lipa!" },
  { id: "2", user: "Anna", text: "Clear ang stream today 🔥" },
  { id: "3", user: "Coach J", text: "Great defense that quarter." },
];

function useCountdown(target: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, new Date(target).getTime() - now);
  const h = Math.floor(diff / 3600_000);
  const m = Math.floor((diff % 3600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return { diff, label: `${h}h ${m}m ${s}s` };
}

function MatchPage() {
  const { matchId } = Route.useParams();
  const match = matches.find((m) => m.id === matchId) ?? matches[0]!;
  const countdown = useCountdown(match.startsAt);
  const [chat, setChat] = useState(seedChat);
  const [message, setMessage] = useState("");
  const locked = match.access === "pass";

  return (
    <PageShell>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {match.status === "live" ? (
              <Badge className="bg-primary text-primary-foreground">● Live Now</Badge>
            ) : match.status === "ended" ? (
              <Badge variant="secondary">Ended</Badge>
            ) : (
              <Badge variant="outline">Upcoming</Badge>
            )}
            <Badge variant="secondary">{match.partner}</Badge>
            <Badge variant="outline">{match.league}</Badge>
          </div>

          <StreamEmbed match={match} overlay={!locked} quarter="Q3">
            {locked ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <Lock className="h-8 w-8 text-brand-cyan" />
                <p className="text-sm font-semibold text-background">This game needs a pass</p>
                <p className="max-w-sm text-xs text-background/70">
                  Buy a single-game pass for ₱{match.passPrice} or subscribe monthly for all games.
                </p>
                <div className="mt-2 flex gap-2">
                  <Button onClick={() => toast.success("Pass selected", { description: "GCash / Maya checkout comes after launch." })}>
                    Buy pass ₱{match.passPrice}
                  </Button>
                  <Button asChild variant="outline"><Link to="/live-sports">See subscriptions</Link></Button>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-background/70">
                Embedded video player — stream source connected after launch
              </div>
            )}
          </StreamEmbed>

          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <h1 className="text-xl font-bold">{match.home} vs {match.away}</h1>
                <p className="text-sm text-muted-foreground">{match.venue}</p>
              </div>
              {match.score ? (
                <p className="font-display text-3xl font-bold text-brand-blue">
                  {match.score.home} <span className="text-muted-foreground">—</span> {match.score.away}
                </p>
              ) : countdown.diff > 0 ? (
                <div className="text-right">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Starts in</p>
                  <p className="font-display text-2xl font-bold">{countdown.label}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {match.status === "upcoming" ? (
            <Button variant="outline" onClick={() => toast.success("Reminder set", { description: "We'll ping you before the game starts." })}>
              <Bell className="mr-1 h-4 w-4" /> Remind me before it starts
            </Button>
          ) : null}
        </div>

        <Card className="flex max-h-[560px] flex-col">
          <CardHeader><CardTitle className="text-base">Live chat</CardTitle></CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden">
            <div className="flex gap-2">
              {["🔥", "👏", "😮", "❤️"].map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => toast(`Reacted ${e}`)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-secondary"
                >
                  {e}
                </button>
              ))}
              <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                <Heart className="h-3 w-3 text-primary" /> 1.2k
              </span>
            </div>
            <ScrollArea className="flex-1 rounded-lg border border-border p-3">
              <ul className="space-y-3">
                {chat.map((c) => (
                  <li key={c.id} className="text-sm">
                    <span className="font-semibold text-brand-blue">{c.user}</span>{" "}
                    <span className="text-muted-foreground">{c.text}</span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!message.trim()) return;
                setChat((c) => [...c, { id: String(Date.now()), user: "You", text: message.trim() }]);
                setMessage("");
              }}
            >
              <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Say something…" />
              <Button type="submit" size="icon" aria-label="Send message"><Send className="h-4 w-4" /></Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
