import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-semibold cursor-pointer " +
    "transition-[transform,background-color,border-color,color] duration-150 active:scale-[0.98] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-0 " +
    "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed " +
    "motion-reduce:transition-none motion-reduce:active:scale-100 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "text-[#1a1204] bg-[linear-gradient(135deg,#f6e3a8_0%,#d9ae2c_45%,#b8860b_100%)] " +
          "shadow-[0_6px_18px_rgba(201,162,39,0.28)] hover:brightness-110 hover:-translate-y-px",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:-translate-y-px",
        outline:
          "border border-white/20 bg-white/[0.04] text-foreground hover:bg-white/[0.08] hover:border-white/35 hover:-translate-y-px",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:-translate-y-px",
        ghost: "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-lg px-3.5 text-xs",
        lg: "h-12 rounded-[10px] px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
