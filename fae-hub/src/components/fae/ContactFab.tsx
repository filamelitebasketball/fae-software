import { useState } from "react";
import { FAE_CONTACT, FAE_WHATSAPP } from "@/lib/constants";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

export function ContactFab() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2 sm:bottom-6">
      {open && (
        <div className="fade-in flex flex-col gap-2">
          <a
            href={FAE_WHATSAPP}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-full border border-border bg-surface-2 py-2.5 pl-4 pr-3 text-sm font-medium text-foreground shadow-lg transition-all hover:border-goldline hover:shadow-xl"
          >
            <span>WhatsApp</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-white">
              <Icon name="message-circle" size={18} strokeWidth={2} />
            </span>
          </a>
          <a
            href={`tel:${FAE_CONTACT.phone.replace(/\s/g, "")}`}
            className="flex items-center gap-3 rounded-full border border-border bg-surface-2 py-2.5 pl-4 pr-3 text-sm font-medium text-foreground shadow-lg transition-all hover:border-goldline hover:shadow-xl"
          >
            <span>Call us</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-primary-foreground">
              <Icon name="phone" size={18} strokeWidth={2} />
            </span>
          </a>
          <a
            href={`mailto:${FAE_CONTACT.email}`}
            className="flex items-center gap-3 rounded-full border border-border bg-surface-2 py-2.5 pl-4 pr-3 text-sm font-medium text-foreground shadow-lg transition-all hover:border-goldline hover:shadow-xl"
          >
            <span>Email</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sport-volleyball text-white">
              <Icon name="arrow-up-right" size={18} strokeWidth={2} />
            </span>
          </a>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300",
          open
            ? "rotate-45 bg-surface-3 text-foreground border border-border"
            : "bg-gold text-primary-foreground hover:shadow-xl hover:scale-105",
        )}
        aria-label={open ? "Close contact menu" : "Contact us"}
      >
        <Icon name={open ? "plus" : "message-circle"} size={24} strokeWidth={2} />
      </button>
    </div>
  );
}
