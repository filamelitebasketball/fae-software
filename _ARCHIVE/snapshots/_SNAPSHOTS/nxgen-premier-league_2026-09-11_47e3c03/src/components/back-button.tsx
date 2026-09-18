import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

/**
 * Universal "Back" affordance. Uses browser history when possible,
 * falls back to `fallback` (default /) when the app was opened cold.
 */
export function BackButton({
  fallback = "/",
  label = "Back",
  className = "",
}: {
  fallback?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const onClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: fallback });
    }
  };
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={className}
      aria-label={label}
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}
