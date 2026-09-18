import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// The Supabase JS client's OAuth 2.1 authorization-server helpers are still
// beta and not yet in the exported types. Wrap the three methods we use.
type OAuthAuthzDetails = {
  client?: { name?: string; client_name?: string; client_uri?: string; redirect_uris?: string[] };
  redirect_url?: string;
  redirect_to?: string;
  scope?: string;
};
type OAuthResult = { redirect_url?: string; redirect_to?: string };
type OAuthClient = {
  getAuthorizationDetails(id: string): Promise<{ data: OAuthAuthzDetails | null; error: { message: string } | null }>;
  approveAuthorization(id: string): Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
  denyAuthorization(id: string): Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
};
const oauthClient = (supabase.auth as unknown as { oauth: OAuthClient }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { redirect: next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthClient.getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold mb-2">Authorization error</h1>
      <p className="text-sm text-muted-foreground">{String((error as Error)?.message ?? error)}</p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientName = details?.client?.name ?? details?.client?.client_name ?? "an app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauthClient.approveAuthorization(authorization_id)
      : await oauthClient.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connect {clientName} to NXGEN</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This lets <strong>{clientName}</strong> use the NXGEN Premier League tools as you. It can
            read your profile, registrations, wallet balance, and public league data. It cannot bypass
            NXGEN's permissions.
          </p>
          {details?.scope ? (
            <p className="text-xs text-muted-foreground">Requested scope: {details.scope}</p>
          ) : null}
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" disabled={busy} onClick={() => decide(false)}>
              Cancel connection
            </Button>
            <Button disabled={busy} onClick={() => decide(true)}>
              {busy ? "Working…" : "Approve"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
