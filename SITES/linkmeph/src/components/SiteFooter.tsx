import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone, Smartphone } from "lucide-react";

import { Logo } from "@/components/Logo";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            LinkMePH builds digital business cards, NFC data transfer and QR code services — now expanding
            into live sports streaming and creative editing services.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Founded 2022 in Lipa City, Batangas, Philippines by Isidro V. Raymundo Jr.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">Explore</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/card" className="hover:text-foreground">LinkMe Card</Link></li>
            <li><Link to="/live-sports" className="hover:text-foreground">Live Sports</Link></li>
            <li><Link to="/creative-services" className="hover:text-foreground">Creative Services</Link></li>
            <li><Link to="/my-passes" className="hover:text-foreground">My Passes</Link></li>
            <li><Link to="/dashboard" className="hover:text-foreground">Account dashboard</Link></li>
            <li><Link to="/about" className="hover:text-foreground">About us</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">Contact</h3>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-brand-blue" /> (043) 000 0000</li>
            <li className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-brand-blue" /> +63 917 000 0000</li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-brand-blue" /> contact@linkmeph.com</li>
            <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-brand-blue" /> Lipa City, Batangas, PH</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted-foreground">
          © {new Date().getFullYear()} LinkMePH. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
