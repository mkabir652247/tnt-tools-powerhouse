import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, MapPin, Package, User } from "lucide-react";
import { formatPrice, products } from "@/data/products";
import { useShop } from "@/lib/shop-store";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My Account — TNT Tools" },
      { name: "description", content: "View your TNT Tools orders, saved tools, addresses and profile details." },
      { property: "og:title", content: "My Account — TNT Tools" },
      { property: "og:description", content: "Orders, wishlist, addresses and profile in one place." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Account,
});

const TABS = [
  { id: "orders", label: "Orders", icon: Package },
  { id: "wishlist", label: "Wishlist", icon: Heart },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "profile", label: "Profile", icon: User },
] as const;

const SAMPLE_ORDERS = [
  { id: "TNT-482310", date: "12 Aug 2026", status: "Delivered", total: 31400, items: 2 },
  { id: "TNT-471902", date: "29 Jul 2026", status: "Delivered", total: 8900, items: 1 },
  { id: "TNT-460118", date: "04 Jul 2026", status: "Refunded", total: 6450, items: 1 },
];

function Account() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("orders");
  const { wishlist, lastOrder } = useShop();
  const saved = products.filter((p) => wishlist.includes(p.id));

  return (
    <div className="container-tnt py-12">
      <p className="eyebrow">My Account</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">Welcome back, Kabir</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex shrink-0 items-center gap-2 rounded-sm border px-4 py-3 text-sm font-semibold transition-colors ${
                tab === id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/60"
              }`}
            >
              <Icon width={16} height={16} /> {label}
            </button>
          ))}
        </nav>

        <div className="rounded-lg border border-border bg-surface p-6">
          {tab === "orders" && (
            <div>
              <h2 className="font-display text-lg font-extrabold uppercase tracking-wide">
                Order History
              </h2>
              <ul className="mt-5 space-y-3">
                {lastOrder && (
                  <OrderRow
                    id={lastOrder.id}
                    date="Today"
                    status="Processing"
                    total={lastOrder.total}
                    items={1}
                  />
                )}
                {SAMPLE_ORDERS.map((o) => (
                  <OrderRow key={o.id} {...o} />
                ))}
              </ul>
            </div>
          )}

          {tab === "wishlist" && (
            <div>
              <h2 className="font-display text-lg font-extrabold uppercase tracking-wide">
                Saved Tools
              </h2>
              {saved.length === 0 ? (
                <p className="mt-5 text-sm text-muted-foreground">
                  Nothing saved yet.{" "}
                  <Link to="/shop" className="text-primary hover:underline">
                    Browse the shop
                  </Link>
                  .
                </p>
              ) : (
                <ul className="mt-5 space-y-3">
                  {saved.map((p) => (
                    <li
                      key={p.id}
                      className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-sm border border-border p-3"
                    >
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        loading="lazy"
                        width={1024}
                        height={1024}
                        className="h-14 w-14 rounded-sm object-cover"
                      />
                      <Link
                        to="/product/$slug"
                        params={{ slug: p.slug }}
                        className="min-w-0 truncate text-sm font-semibold hover:text-primary"
                      >
                        {p.name}
                      </Link>
                      <span className="shrink-0 font-display text-sm font-bold text-primary">
                        {formatPrice(p.price)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === "addresses" && (
            <div>
              <h2 className="font-display text-lg font-extrabold uppercase tracking-wide">
                Saved Addresses
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <address className="rounded-sm border border-border p-5 not-italic text-sm text-muted-foreground">
                  <p className="font-display font-bold text-foreground">Workshop</p>
                  <p className="mt-2">Plot 14, Tool Market Road</p>
                  <p>Karachi, Pakistan</p>
                  <p className="mt-2">+92 300 000 0000</p>
                </address>
                <address className="rounded-sm border border-border p-5 not-italic text-sm text-muted-foreground">
                  <p className="font-display font-bold text-foreground">Home</p>
                  <p className="mt-2">House 22, Block C</p>
                  <p>Karachi, Pakistan</p>
                  <p className="mt-2">+92 300 000 0000</p>
                </address>
              </div>
            </div>
          )}

          {tab === "profile" && (
            <form onSubmit={(e) => e.preventDefault()}>
              <h2 className="font-display text-lg font-extrabold uppercase tracking-wide">
                Profile Details
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Full name" defaultValue="Kabir" />
                <Field label="Email" type="email" defaultValue="kabir@example.com" />
                <Field label="Phone" type="tel" defaultValue="+92 300 000 0000" />
                <Field label="Company" defaultValue="TNT Contracting" />
              </div>
              <button type="submit" className="btn-orange mt-6 text-sm">
                Save Changes
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderRow({
  id,
  date,
  status,
  total,
  items,
}: {
  id: string;
  date: string;
  status: string;
  total: number;
  items: number;
}) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-sm border border-border p-4">
      <div className="min-w-0">
        <p className="truncate font-display text-sm font-bold">{id}</p>
        <p className="text-xs text-muted-foreground">
          {date} · {items} item{items === 1 ? "" : "s"} · {status}
        </p>
      </div>
      <span className="shrink-0 font-display text-sm font-bold text-primary">
        {formatPrice(total)}
      </span>
    </li>
  );
}

function Field({
  label,
  type = "text",
  defaultValue,
}: {
  label: string;
  type?: string;
  defaultValue?: string;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <input id={id} type={type} defaultValue={defaultValue} maxLength={120} className="field-tnt text-sm" />
    </div>
  );
}
