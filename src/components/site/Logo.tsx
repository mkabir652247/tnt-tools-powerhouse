import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`group flex items-center gap-2 ${className}`} aria-label="TNT Tools home">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-sm bg-primary font-display text-lg font-extrabold text-primary-foreground transition-transform group-hover:rotate-3">
        T
      </span>
      <span className="font-display text-xl font-extrabold tracking-tight">
        TNT<span className="text-primary">TOOLS</span>
      </span>
    </Link>
  );
}
