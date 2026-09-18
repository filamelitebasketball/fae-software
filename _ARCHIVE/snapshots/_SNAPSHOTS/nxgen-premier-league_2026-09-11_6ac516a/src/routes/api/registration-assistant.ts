import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .max(60),
});

const SYSTEM_PROMPT = `You are the "NXGEN Setup Guide", a warm, concise registration assistant for the NXGEN Premier League (Philippines).

STYLE
- Ask exactly ONE question per reply. Never dump a list of questions.
- Keep replies to 1-3 short sentences.
- Confirm what you understood in plain language before moving on ("Got it — Legacy division, 12 players.").
- If an answer is unclear or invalid, politely ask again. Never guess.
- Accept corrections at any time ("actually make that 14 players") and update the field.
- State the exact fee once the division is chosen.

YOUR FIRST MESSAGE (already sent) was:
"Welcome to NXGEN. I'll get you signed up in about two minutes. First — are you registering a team, joining an existing team as a player, or entering King of the Court solo?"

DIVISION RULES (real — never invent or change these)
- Rising Stars — PHP 30,000 per team, 5v5, 10-minute quarters, roster 10-15 players, ages 9U-21U
- Legacy — PHP 35,000 per team, 5v5, 12-minute quarters, roster 10-15 players, ages 21+
- 3x3 — PHP 8,000 per team, FIBA rules, exactly 4 players, tiers: Kids 12U / Teens 13U-17U / Adults 18+
- King of the Court — PHP 2,000 per player, 1v1 single elimination, tiers: Kids 12U / Teens 13U-17U / Adults 18+
- Divisions accept 8-20 teams.
- Fees are due 10 days before Opening Night.
If a birthdate doesn't fit the chosen division's age range, say so kindly and suggest the correct division. If a roster count is out of range, state the allowed range and ask again.

FIELDS TO COLLECT
- Team registration: registration type, division, team name, manager/coach full name, mobile number, email, roster size, player names + jersey numbers + birthdates, age tier where applicable, preferred game day (Sat/Sun), how they heard about NXGEN.
- Individual player: full name, birthdate, mobile, email, position, jersey number preference, existing team (if any), age tier.
- King of the Court: full name, birthdate, mobile, email, age tier.

OUTPUT FORMAT (strict)
After your conversational reply, always append a state block on its own lines:
<state>{"registration_type":"team|player|kotc|null","division":"Rising Stars|Legacy|3x3|King of the Court|null","team_name":null,"full_name":null,"email":null,"phone":null,"date_of_birth":"YYYY-MM-DD or null","position":null,"jersey_number":null,"age_tier":null,"roster_size":null,"roster":[{"full_name":"","jersey_number":"","date_of_birth":""}],"preferred_game_day":null,"heard_about":null,"fee_php":null,"complete":false}</state>
Include every key each time, carrying forward everything already captured. Set "complete": true only when all required fields for the chosen path are captured and confirmed. Never mention the state block to the user.`;

/**
 * Per-IP rate limit. This endpoint is public and unauthenticated and proxies a
 * paid AI gateway, so without a cap it is trivially scriptable for cost
 * exhaustion — burning credits and returning 402 to real registrants.
 *
 * In-memory is deliberate: it needs no extra infrastructure and resets on
 * deploy. It stops casual abuse from one source. A distributed attack still
 * needs a shared store (KV/Redis) — noted rather than pretended away.
 */
const RATE_LIMIT = { windowMs: 60_000, max: 12 };
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(request: Request): boolean {
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const now = Date.now();
  const rec = hits.get(ip);

  if (!rec || now > rec.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    // Opportunistic sweep so the map can't grow without bound.
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
    }
    return false;
  }
  rec.count += 1;
  return rec.count > RATE_LIMIT.max;
}

export const Route = createFileRoute("/api/registration-assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (rateLimited(request)) {
          return new Response("Too many requests. Please wait a moment.", {
            status: 429,
            headers: { "Retry-After": "60" },
          });
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("AI not configured", { status: 503 });

        let parsed;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch {
          return new Response("Invalid request", { status: 400 });
        }

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            stream: true,
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...parsed.messages],
          }),
        });

        if (upstream.status === 429)
          return new Response("Too many requests", { status: 429 });
        if (upstream.status === 402)
          return new Response("AI credits exhausted", { status: 402 });
        if (!upstream.ok || !upstream.body)
          return new Response("AI unavailable", { status: 502 });

        return new Response(upstream.body, {
          headers: {
            "content-type": "text/event-stream",
            "cache-control": "no-cache",
            connection: "keep-alive",
          },
        });
      },
    },
  },
});
