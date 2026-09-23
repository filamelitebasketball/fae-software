import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";

// Standard TanStack Start config (Supabase + Vercel only — Lovable fully removed).
// Nitro builds the deployable server output and auto-detects the host: on Vercel
// (VERCEL=1) it emits .vercel/output; locally it builds a node server.
// DO NOT remove nitro() — without it the Vercel build emits no server output and
// every route 404s. A Lovable "Fixed build output path" edit removed it on 2026-09-19.
export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
      // src/server.ts is our SSR error-wrapping server entry.
      server: { entry: "server" },
    }),
    nitro(),
    viteReact(),
  ],
  resolve: { dedupe: ["react", "react-dom"] },
});
