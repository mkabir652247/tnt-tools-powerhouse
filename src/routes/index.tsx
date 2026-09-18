import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Headphones,
  Layers,
  ShieldCheck,
  Star,
  Tag,
  Truck,
  Wrench,
  Zap,
} from "lucide-react";
import heroImage from "@/assets/tnt-hero-promo.jpeg.asset.json";
import workshopImage from "@/assets/workshop.jpg";
import promoImage from "@/assets/product-angle-grinder.jpg";
import { categories, products, type Product } from "@/data/products";
import { ProductCard } from "@/components/site/ProductCard";
import { QuickView } from "@/components/site/QuickView";
import { Stars } from "@/components/site/Stars";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TNT Tools — Power Your Work. Built to Perform." },
      {
        name: "description",
        content:
          "Shop professional power tools, water pumps, grinders, welding machines and workshop equipment at TNT Tools. Reliable quality at competitive prices.",
      },
      { property: "og:title", content: "TNT Tools — Power Your Work. Built to Perform." },
      {
        property: "og:description",
        content:
          "Professional power tools, water pumps and reliable equipment for every job.",
      },
    ],
  }),
  component: Home,
});

const TRUST = [
  { icon: BadgeCheck, label: "Quality Tools" },
  { icon: Tag, label: "Competitive Prices" },
  { icon: ShieldCheck, label: "Reliable Products" },
  { icon: Truck, label: "Fast Delivery" },
];

const BENEFITS = [
  {
    icon: ShieldCheck,
    title: "Reliable Quality",
    text: "Every tool is tested against real site conditions before it reaches our shelves.",
  },
  {
    icon: Tag,
    title: "Competitive Pricing",
    text: "Direct sourcing keeps professional-grade equipment within reach of every crew.",
  },
  {
    icon: Wrench,
    title: "Professional-Grade Tools",
    text: "Built for daily duty cycles, not weekend-only use.",
  },
  {
    icon: Layers,
    title: "Wide Product Range",
    text: "From 21V drills to 50L compressors — one supplier for the whole workshop.",
  },
  {
    icon: Truck,
    title: "Fast Delivery",
    text: "Dispatched within 24 hours nationwide, with tracking on every order.",
  },
  {
    icon: Headphones,
    title: "Customer Support",
    text: "Technical help and after-sales service from people who use these tools.",
  },
];

const REVIEWS = [
  {
    name: "Ahmed R.",
    role: "Electrical contractor",
    rating: 5,
    text: "Excellent build quality and very good performance. The drill works exactly as expected.",
  },
  {
    name: "Usman K.",
    role: "Workshop owner",
    rating: 5,
    text: "Good product, competitive price, and quick delivery. Will order the compressor next.",
  },
  {
    name: "Bilal S.",
    role: "Site supervisor",
    rating: 4,
    text: "The grinder has taken a serious beating on site and still runs smooth. Solid value.",
  },
  {
    name: "Hina M.",
    role: "Maintenance engineer",
    rating: 5,
    text: "Pump was installed the same week and has been running daily without a single issue.",
  },
];

function Home() {
  const [quick, setQuick] = useState<Product | null>(null);
  const featured = products.slice(0, 8);
  const bestSellers = products.filter((p) => p.badges.length > 0).slice(0, 4);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="pointer-events-none absolute -right-40 top-0 h-[520px] w-[520px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--primary), transparent 65%)" }}
        />
        <div className="container-tnt grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
          <div className="fade-up">
            <p className="eyebrow">Professional Hardware Since 2009</p>
            <h1 className="mt-4 text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
              Power Your Work.
              <span className="block text-primary">Built to Perform.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Professional power tools, water pumps, and reliable equipment for every job.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" className="btn-orange">
                Shop Now <ArrowRight width={16} height={16} />
              </Link>
              <Link to="/categories" className="btn-ghost-outline">
                Explore Categories
              </Link>
            </div>
            <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {TRUST.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-2 rounded-sm border border-border bg-surface px-3 py-2.5"
                >
                  <Icon width={16} height={16} className="shrink-0 text-primary" />
                  <span className="min-w-0 text-[11px] font-semibold uppercase leading-tight tracking-wide">
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <img
              src={heroImage.url}
              alt="TNT Tools power tools arranged around the TNT Tools logo"
              width={1536}
              height={1024}
              className="glow-orange w-full rounded-lg border border-border object-cover"
            />
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container-tnt py-16">
        <SectionHead
          eyebrow="Shop by Category"
          title="Every Trade Covered"
          action={{ to: "/categories", label: "All categories" }}
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Link
              key={c.slug}
              to="/shop"
              search={{ category: c.slug }}
              className="card-tool group relative overflow-hidden"
            >
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src={c.image}
                  alt={c.name}
                  loading="lazy"
                  width={1024}
                  height={1024}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="p-4">
                <h3 className="font-display text-lg font-extrabold transition-colors group-hover:text-primary">
                  {c.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary">
                  Browse <ArrowRight width={14} height={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="border-y border-border bg-surface/40 py-16">
        <div className="container-tnt">
          <SectionHead
            eyebrow="Featured Products"
            title="Tools That Earn Their Keep"
            action={{ to: "/shop", label: "View all products" }}
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} onQuickView={setQuick} />
            ))}
          </div>
        </div>
      </section>

      {/* PROMO */}
      <section className="container-tnt py-16">
        <div className="relative grid items-center gap-8 overflow-hidden rounded-lg border border-border bg-surface p-8 md:grid-cols-2 md:p-12">
          <div
            className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full opacity-40 blur-3xl"
            style={{ background: "radial-gradient(circle, var(--primary), transparent 65%)" }}
          />
          <div className="relative">
            <p className="eyebrow">Limited Time</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">
              Power Deals. <span className="text-primary">Better Prices.</span>
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Get professional-grade tools at competitive prices.
            </p>
            <Link to="/shop" search={{ sort: "discount" }} className="btn-orange mt-7">
              View All Deals
            </Link>
          </div>
          <img
            src={promoImage}
            alt="Discounted professional angle grinder"
            loading="lazy"
            width={1024}
            height={1024}
            className="relative w-full rounded-lg border border-border object-cover"
          />
        </div>
      </section>

      {/* WHY */}
      <section className="border-y border-border bg-surface/40 py-16">
        <div className="container-tnt">
          <SectionHead eyebrow="Why TNT Tools" title="Built on Trust and Torque" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="card-tool p-6">
                <span className="grid h-11 w-11 place-items-center rounded-sm bg-primary/15 text-primary">
                  <Icon width={20} height={20} />
                </span>
                <h3 className="mt-4 font-display text-lg font-extrabold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BEST SELLERS */}
      <section className="container-tnt py-16">
        <SectionHead
          eyebrow="Best Sellers"
          title="What the Pros Keep Buying"
          action={{ to: "/shop", label: "See the shop" }}
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {bestSellers.map((p) => (
            <ProductCard key={p.id} product={p} onQuickView={setQuick} />
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section className="border-y border-border bg-surface/40 py-16">
        <div className="container-tnt grid items-center gap-10 lg:grid-cols-2">
          <img
            src={workshopImage}
            alt="Professional workshop with tool wall and workbench"
            loading="lazy"
            width={1536}
            height={1024}
            className="w-full rounded-lg border border-border object-cover"
          />
          <div>
            <p className="eyebrow">About TNT Tools</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">Equipment That Shows Up Every Day</h2>
            <p className="mt-4 text-muted-foreground">
              TNT Tools provides reliable power tools, construction equipment, water pumps, and
              workshop essentials for professionals, technicians, contractors, and DIY users.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { icon: ShieldCheck, label: "Quality" },
                { icon: Zap, label: "Performance" },
                { icon: BadgeCheck, label: "Reliability" },
                { icon: Tag, label: "Value for Money" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-sm border border-border bg-surface px-4 py-3"
                >
                  <Icon width={18} height={18} className="shrink-0 text-primary" />
                  <span className="font-display text-sm font-bold uppercase tracking-wide">
                    {label}
                  </span>
                </div>
              ))}
            </div>
            <Link to="/about" className="btn-ghost-outline mt-7">
              More About Us
            </Link>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="container-tnt py-16">
        <SectionHead eyebrow="Customer Reviews" title="Rated by People Who Work" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {REVIEWS.map((r) => (
            <figure key={r.name} className="card-tool flex h-full flex-col p-6">
              <Stars rating={r.rating} />
              <blockquote className="mt-4 flex-1 text-sm text-muted-foreground">
                “{r.text}”
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 font-display font-bold text-primary">
                  {r.name.charAt(0)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-sm font-bold">{r.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{r.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="border-t border-border">
        <div className="hazard-stripe h-1.5 w-full" />
        <div className="container-tnt py-16 text-center">
          <Star width={22} height={22} className="mx-auto text-primary" />
          <h2 className="mt-4 text-3xl sm:text-4xl">Get the Latest Deals &amp; New Tools</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Subscribe to receive new product launches, exclusive offers, and special discounts.
          </p>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="mx-auto mt-7 flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <input
              type="email"
              required
              placeholder="you@company.com"
              aria-label="Email address"
              className="field-tnt"
            />
            <button type="submit" className="btn-orange shrink-0">
              Subscribe
            </button>
          </form>
        </div>
      </section>

      <QuickView product={quick} onClose={() => setQuick(null)} />
    </div>
  );
}

function SectionHead({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: { to: "/shop" | "/categories"; label: string };
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-2 text-2xl sm:text-3xl">{title}</h2>
      </div>
      {action && (
        <Link
          to={action.to}
          className="hidden shrink-0 items-center gap-1 font-display text-xs font-bold uppercase tracking-wider text-primary hover:underline sm:inline-flex"
        >
          {action.label} <ArrowRight width={14} height={14} />
        </Link>
      )}
    </div>
  );
}
