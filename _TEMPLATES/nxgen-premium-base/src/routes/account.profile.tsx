import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/account/profile")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: Redirect,
});

function Redirect() {
  const navigate = useNavigate();
  useEffect(() => { navigate({ to: "/profile", replace: true }); }, [navigate]);
  return <div className="min-h-screen grid place-items-center text-muted-foreground">Redirecting…</div>;
}
