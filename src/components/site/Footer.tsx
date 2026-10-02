import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Youtube } from "lucide-react";
import { useShop } from "@/lib/shop-store";
import { Logo } from "./Logo";

export function Footer() {
  const { catalogCategories: categories } = useShop();

  return (
    <footer className="border-t border-border bg-surface">
      <div className="container-tnt grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 text-sm text-muted-foreground">
            TNT Tools supplies professional-grade power tools, water pumps and workshop equipment to
            contractors, technicians and serious DIY users.
          </p>
          <div className="mt-5 flex gap-2">
            {[Facebook, Instagram, Youtube, Linkedin].map((Icon, i) => (
              <a
                key={i}
                href="#"
                aria-label="TNT Tools social profile"
                className="grid h-9 w-9 place-items-center rounded-sm border border-border transition-colors hover:border-primary hover:text-primary"
              >
                <Icon width={16} height={16} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-wider">Quick Links</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/shop" className="hover:text-primary">
                Shop All Tools
              </Link>
            </li>
            <li>
              <Link to="/categories" className="hover:text-primary">
                Categories
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-primary">
                About Us
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-primary">
                Contact
              </Link>
            </li>
            <li>
              <Link to="/account" className="hover:text-primary">
                My Account
              </Link>
            </li>
            <li>
              <Link to="/auth" className="hover:text-primary">
                Staff sign in
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-wider">
            Shop Categories
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {categories.slice(0, 6).map((c) => (
              <li key={c.slug}>
                <Link to="/shop" search={{ category: c.slug }} className="hover:text-primary">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-wider">
            Customer Support
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Phone width={16} height={16} className="mt-0.5 shrink-0 text-primary" />
              <span>+92 300 000 0000</span>
            </li>
            <li className="flex items-start gap-2">
              <Mail width={16} height={16} className="mt-0.5 shrink-0 text-primary" />
              <span>support@tnttools.example</span>
            </li>
            <li className="flex items-start gap-2">
              <MapPin width={16} height={16} className="mt-0.5 shrink-0 text-primary" />
              <span>Tool Market Road, Karachi, Pakistan</span>
            </li>
          </ul>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="mt-5 flex gap-2"
            aria-label="Footer newsletter signup"
          >
            <input
              type="email"
              required
              placeholder="Email address"
              aria-label="Email address"
              className="field-tnt text-sm"
            />
            <button type="submit" className="btn-orange px-4 text-xs">
              Join
            </button>
          </form>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="container-tnt flex flex-col gap-3 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} TNT Tools. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <a href="#" className="hover:text-primary">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-primary">
              Terms &amp; Conditions
            </a>
            <a href="#" className="hover:text-primary">
              Shipping &amp; Returns
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
