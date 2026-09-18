import { Link } from "@tanstack/react-router";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "gold" | "ghost" | "danger";
export type ButtonSize = "default" | "sm" | "xs";

const sizeClasses: Record<ButtonSize, string> = {
  default: "px-5 py-2.5 text-sm",
  sm: "px-4 py-2 text-[13px]",
  xs: "px-3 py-1.5 text-xs",
};

const variantClasses: Record<ButtonVariant, string> = {
  gold: "btn-gold",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

function classes(variant: ButtonVariant, size: ButtonSize, className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap select-none",
    sizeClasses[size],
    variantClasses[variant],
    className,
  );
}

export interface FaeButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant = "gold", size = "default", className, ...props }: FaeButtonProps) {
  return <button className={classes(variant, size, className)} {...props} />;
}

export interface ButtonLinkProps {
  to?: string;
  href?: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
  external?: boolean;
  onClick?: () => void;
}

export function ButtonLink({
  to,
  href,
  params,
  search,
  variant = "gold",
  size = "default",
  className,
  children,
  external,
  onClick,
}: ButtonLinkProps) {
  const cls = classes(variant, size, className);
  if (href || external) {
    return (
      <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className={cls} onClick={onClick}>
        {children}
      </a>
    );
  }
  return (
    <Link
      to={to ?? "/"}
      {...(params ? { params } : {})}
      {...(search ? { search } : {})}
      className={cls}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
