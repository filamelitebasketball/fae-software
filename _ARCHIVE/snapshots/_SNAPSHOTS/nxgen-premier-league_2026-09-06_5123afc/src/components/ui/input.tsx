import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Matched to the account pages: 44px so the tap target clears the minimum,
// the site's corner radius, and a gold focus ring instead of the shadcn one.
        "nx-input flex h-11 w-full rounded-[10px] border border-input bg-white/[0.04] px-3.5 py-1 text-base transition-colors " +
          "placeholder:text-muted-foreground hover:border-white/25 focus-visible:outline-none " +
          "focus-visible:border-[var(--gold)] focus-visible:bg-white/[0.06] focus-visible:ring-[3px] focus-visible:ring-[rgba(201,162,39,0.18)] " +
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground " +
          "disabled:cursor-not-allowed disabled:opacity-60 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
