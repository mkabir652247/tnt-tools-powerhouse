import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, Menu, Search, ShoppingCart, User, X } from "lucide-react";
import { useState } from "react";
import { useShop } from "@/lib/shop-store";
import { Logo } from "./Logo";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/categories", label: "Categories" },
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
  const { cartCount, wishlist, setCartOpen } = useShop();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [term, setTerm] = useState("");
  const navigate = useNavigate();

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchOpen(false);
    setMenuOpen(false);
    navigate({ to: "/shop", search: { q: term } });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="hazard-stripe h-1 w-full" />
      <div className="container-tnt flex h-16 items-center gap-4">
        <Logo />

        <nav className="ml-6 hidden items-center gap-6 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "text-primary" }}
              className="font-display text-sm font-bold uppercase tracking-wide text-foreground/85 transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <form onSubmit={submitSearch} className="hidden items-center xl:flex">
            <label className="sr-only" htmlFor="header-search">
              Search products
            </label>
            <input
              id="header-search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search tools…"
              className="field-tnt h-9 w-48 py-1 text-sm"
            />
          </form>

          <button
            type="button"
            aria-label="Search"
            onClick={() => setSearchOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-sm transition-colors hover:text-primary xl:hidden"
          >
            <Search width={19} height={19} />
          </button>

          <Link
            to="/wishlist"
            aria-label="Wishlist"
            className="relative grid h-10 w-10 place-items-center rounded-sm transition-colors hover:text-primary"
          >
            <Heart width={19} height={19} />
            {wishlist.length > 0 && <Badge value={wishlist.length} />}
          </Link>

          <button
            type="button"
            aria-label="Open cart"
            onClick={() => setCartOpen(true)}
            className="relative grid h-10 w-10 place-items-center rounded-sm transition-colors hover:text-primary"
          >
            <ShoppingCart width={19} height={19} />
            {cartCount > 0 && <Badge value={cartCount} />}
          </button>

          <Link
            to="/account"
            aria-label="Account"
            className="grid h-10 w-10 place-items-center rounded-sm transition-colors hover:text-primary"
          >
            <User width={19} height={19} />
          </Link>

          <Link to="/shop" className="btn-orange ml-2 hidden px-4 py-2 text-xs sm:inline-flex">
            Shop Now
          </Link>

          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-sm transition-colors hover:text-primary lg:hidden"
          >
            {menuOpen ? <X width={20} height={20} /> : <Menu width={20} height={20} />}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-border bg-surface p-3 xl:hidden">
          <form onSubmit={submitSearch} className="container-tnt flex gap-2">
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search drills, pumps, grinders…"
              aria-label="Search products"
              className="field-tnt"
            />
            <button type="submit" className="btn-orange px-4 text-sm">
              Go
            </button>
          </form>
        </div>
      )}

      {menuOpen && (
        <nav className="border-t border-border bg-surface lg:hidden">
          <ul className="container-tnt flex flex-col py-2">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  activeOptions={{ exact: item.to === "/" }}
                  activeProps={{ className: "text-primary" }}
                  className="block border-b border-border py-3 font-display text-sm font-bold uppercase tracking-wide"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="py-3">
              <Link to="/shop" onClick={() => setMenuOpen(false)} className="btn-orange w-full text-sm">
                Shop Now
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

function Badge({ value }: { value: number }) {
  return (
    <span className="absolute right-0.5 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
      {value}
    </span>
  );
}
