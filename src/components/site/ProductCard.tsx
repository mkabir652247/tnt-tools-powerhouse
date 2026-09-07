import { Link } from "@tanstack/react-router";
import { Eye, Heart, ShoppingCart } from "lucide-react";
import { discountPercent, formatPrice, type Product } from "@/data/products";
import { useShop } from "@/lib/shop-store";
import { Stars } from "./Stars";

export function ProductCard({
  product,
  onQuickView,
}: {
  product: Product;
  onQuickView?: (product: Product) => void;
}) {
  const { addToCart, toggleWishlist, isWishlisted } = useShop();
  const discount = discountPercent(product);
  const wished = isWishlisted(product.id);

  return (
    <article className="card-tool group relative flex flex-col overflow-hidden">
      <div className="relative aspect-square overflow-hidden bg-surface-strong">
        <Link to="/product/$slug" params={{ slug: product.slug }} aria-label={product.name}>
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            width={1024}
            height={1024}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
          {discount > 0 && (
            <span className="rounded-sm bg-primary px-2 py-1 font-display text-[11px] font-bold uppercase tracking-wider text-primary-foreground">
              -{discount}%
            </span>
          )}
          {product.badges.map((b) => (
            <span
              key={b}
              className="rounded-sm border border-border bg-background/85 px-2 py-1 font-display text-[11px] font-bold uppercase tracking-wider"
            >
              {b}
            </span>
          ))}
          {!product.inStock && (
            <span className="rounded-sm bg-destructive px-2 py-1 font-display text-[11px] font-bold uppercase tracking-wider text-destructive-foreground">
              Out of stock
            </span>
          )}
        </div>

        <div className="absolute right-3 top-3 flex flex-col gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-100">
          <button
            type="button"
            onClick={() => toggleWishlist(product.id)}
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={wished}
            className="grid h-9 w-9 place-items-center rounded-sm border border-border bg-background/85 transition-colors hover:border-primary hover:text-primary"
          >
            <Heart width={16} height={16} className={wished ? "fill-primary text-primary" : ""} />
          </button>
          {onQuickView && (
            <button
              type="button"
              onClick={() => onQuickView(product)}
              aria-label="Quick view"
              className="grid h-9 w-9 place-items-center rounded-sm border border-border bg-background/85 transition-colors hover:border-primary hover:text-primary"
            >
              <Eye width={16} height={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link
          to="/product/$slug"
          params={{ slug: product.slug }}
          className="font-display text-base font-bold leading-snug transition-colors group-hover:text-primary"
        >
          {product.name}
        </Link>
        <p className="line-clamp-2 text-sm text-muted-foreground">{product.spec}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Stars rating={product.rating} />
          <span>
            {product.rating.toFixed(1)} ({product.reviewCount})
          </span>
        </div>
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="font-display text-lg font-extrabold text-primary">
            {formatPrice(product.price)}
          </span>
          {product.oldPrice && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(product.oldPrice)}
            </span>
          )}
        </div>
        <button
          type="button"
          disabled={!product.inStock}
          onClick={() => addToCart(product.id)}
          className="btn-orange mt-2 w-full text-sm"
        >
          <ShoppingCart width={16} height={16} />
          {product.inStock ? "Add to Cart" : "Unavailable"}
        </button>
      </div>
    </article>
  );
}
