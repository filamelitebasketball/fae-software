import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listUpcomingGames from "./tools/list_upcoming_games";
import listLeaderboard from "./tools/list_leaderboard";
import myProfile from "./tools/my_profile";
import myRegistrations from "./tools/my_registrations";
import myWallet from "./tools/my_wallet";

// The OAuth issuer MUST be the direct Supabase host. On publish, SUPABASE_URL
// is rewritten to the `.lovable.cloud` proxy, which mcp-js rejects (RFC 8414
// issuer mismatch). Read the project ref via import.meta.env so Vite inlines
// it as a literal at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "nxgen-premiere-league",
  title: "NXGEN Premier League",
  version: "0.1.0",
  instructions:
    "Tools for the NXGEN Premier League app. Read upcoming games and division leaderboards, and access the signed-in player's profile, registrations, and wallet balance.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listUpcomingGames, listLeaderboard, myProfile, myRegistrations, myWallet],
});
