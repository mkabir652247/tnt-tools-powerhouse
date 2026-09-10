import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Heart, Minus, Plus, ShieldCheck, Truck, X } from "lucide-react";
import {
  discountPercent,
  formatPrice,
  getProductBySlug,
  getRelated,
  type Product,
} from "@/data/products";
import { ProductCard } from "@/components/site/ProductCard";
import { QuickView } from "@/components/site/QuickView";
import { Stars } from "@/components/site/Stars";
import { useShop } from "@/lib/shop-store";

export const Route = createFileRoute("/product/$slug")({
  loader: ({ params }) => {
    const product = getProductBySlug(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Product unavailable — TNT Tools" }, { name: "robots", content: "noindex" }],
      };
    }
    const { product } = loaderData;
    return {
      meta: [
        { title: `${product.name} — TNT Tools` },
        { name: "description", content: product.description.slice(0, 155) },
        { property: "og:title", content: `${product.name} — TNT Tools` },
        { property: "og:description", content: product.spec },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="container-tnt py-24 text-center">
      <h1 className="text-3xl">Product not found</h1>
      <p className="mt-3 text-muted-foreground">This tool may have been renamed or retired.</p>
      <Link to="/shop" className="btn-orange mt-6">
        Back to Shop
      </Link>
    </div>
  ),
  component: ProductPage,
});

const REVIEWS = [
  { name: "Ahmed R.", rating: 5, text: "Excellent build quality and very good performance." },
  { name: "Usman K.", rating: 5, text: "Good product, competitive price, and quick delivery." },
  { name: "Faisal T.", rating: 4, text: "Strong tool for the money. Packaging could be better." },
];

function ProductPage() {
  const { product } = Route.useLoaderData();
  const { addToCart, toggleWishlist, isWishlisted, setCartOpen } = useShop();
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);
  const [quick, setQuick] = useState<Product | null>(null);
  const discount = discountPercent(product);
  const related = getRelated(product);

  return (
    <div className="container-tnt py-10">
      <nav className="text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">
          Home
        </Link>{" "}
        /{" "}
        <Link to="/shop" className="hover:text-primary">
          Shop
        </Link>{" "}
        / <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <img
              src={product.images[active]}
              alt={product.name}
              width={1024}
              height={1024}
              className="aspect-square w-full object-cover"
            />
          </div>
          <div className="mt-3 flex gap-3">
            {product.images.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`View image ${i + 1}`}
                className={`h-20 w-20 overflow-hidden rounded-sm border transition-colors ${
                  active === i ? "border-primary" : "border-border hover:border-primary/60"
                }`}
              >
                <img
                  src={img}
                  alt=""
                  loading="lazy"
                  width={1024}
                  height={1024}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <h1 className="text-3xl sm:text-4xl">{product.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Stars rating={product.rating} />
            <span>
              {product.rating.toFixed(1)} · {product.reviewCount} reviews
            </span>
            <span className="text-border">|</span>
            <span>{product.brand}</span>
          </div>

          <div className="mt-5 flex flex-wrap items-baseline gap-3">
            <span className="font-display text-3xl font-extrabold text-primary">
              {formatPrice(product.price)}
            </span>
            {product.oldPrice && (
              <span className="text-lg text-muted-foreground line-through">
                {formatPrice(product.oldPrice)}
              </span>
            )}
            {discount > 0 && (
              <span className="rounded-sm bg-primary px-2 py-1 font-display text-xs font-bold uppercase text-primary-foreground">
                Save {discount}%
              </span>
            )}
          </div>

          <p
            className={`mt-3 inline-flex items-center gap-2 text-sm ${
              product.inStock ? "text-[var(--success)]" : "text-destructive"
            }`}
          >
            {product.inStock ? <Check width={16} height={16} /> : <X width={16} height={16} />}
            {product.stockLabel ?? (product.inStock ? "In stock — ships in 24 hours" : "Out of stock")}
          </p>

          <p className="mt-5 text-muted-foreground">{product.description}</p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-sm border border-border">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="grid h-11 w-11 place-items-center hover:text-primary"
              >
                <Minus width={16} height={16} />
              </button>
              <span className="w-10 text-center font-display font-bold">{qty}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQty((q) => q + 1)}
                className="grid h-11 w-11 place-items-center hover:text-primary"
              >
                <Plus width={16} height={16} />
              </button>
            </div>
            <button
              type="button"
              disabled={!product.inStock}
              onClick={() => addToCart(product.id, qty)}
              className="btn-orange flex-1 sm:flex-none"
            >
              Add to Cart
            </button>
            <Link
              to="/checkout"
              onClick={() => {
                if (product.inStock) addToCart(product.id, qty);
                setCartOpen(false);
              }}
              className="btn-ghost-outline flex-1 sm:flex-none"
            >
              Buy Now
            </Link>
            <button
              type="button"
              onClick={() => toggleWishlist(product.id)}
              aria-label="Toggle wishlist"
              className="grid h-11 w-11 place-items-center rounded-sm border border-border transition-colors hover:border-primary hover:text-primary"
            >
              <Heart
                width={18}
                height={18}
                className={isWishlisted(product.id) ? "fill-primary text-primary" : ""}
              />
            </button>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-sm border border-border bg-surface px-4 py-3 text-sm">
              <Truck width={18} height={18} className="shrink-0 text-primary" /> Fast nationwide
              delivery
            </div>
            <div className="flex items-center gap-3 rounded-sm border border-border bg-surface px-4 py-3 text-sm">
              <ShieldCheck width={18} height={18} className="shrink-0 text-primary" /> Warranty
              included
            </div>
          </div>

          <div className="mt-8">
            <h2 className="font-display text-lg font-extrabold uppercase tracking-wide">Features</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {product.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check width={16} height={16} className="mt-0.5 shrink-0 text-primary" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <section className="mt-14 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl">Specifications</h2>
          <table className="mt-4 w-full text-sm">
            <tbody>
              {product.specs.map((s) => (
                <tr key={s.label} className="border-b border-border">
                  <th scope="row" className="py-3 text-left font-semibold">
                    {s.label}
                  </th>
                  <td className="py-3 text-right text-muted-foreground">{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="text-2xl">Customer Reviews</h2>
          <ul className="mt-4 space-y-4">
            {REVIEWS.map((r) => (
              <li key={r.name} className="rounded-lg border border-border bg-surface p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 font-display font-bold text-primary">
                    {r.name.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-bold">{r.name}</p>
                    <Stars rating={r.rating} size={12} />
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">“{r.text}”</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl">Related Products</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((p) => (
            <ProductCard key={p.id} product={p} onQuickView={setQuick} />
          ))}
        </div>
      </section>

      <QuickView product={quick} onClose={() => setQuick(null)} />
    </div>
  );
}
