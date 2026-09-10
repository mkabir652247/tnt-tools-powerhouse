import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/tnt-tools-logo.png.asset.json";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/"
      className={`group flex items-center gap-2 ${className}`}
      aria-label="TNT Tools home"
    >
      <img
        src={logoAsset.url}
        alt="TNT Tools"
        width={200}
        height={200}
        className="h-11 w-auto transition-transform duration-300 group-hover:scale-105"
      />
      <span className="sr-only">TNT Tools</span>
    </Link>
  );
}
