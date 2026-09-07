import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { discountPercent, formatPrice, type Product } from "@/data/products";
import { useShop } from "@/lib/shop-store";
import { Stars } from "./Stars";

export function QuickView({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { addToCart } = useShop();
  if (!product) return null;
  const discount = discountPercent(product);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4">
      <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-label={`${product.name} quick view`}
        className="relative grid w-full max-w-3xl gap-6 overflow-hidden rounded-lg border border-border bg-surface p-5 sm:grid-cols-2"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quick view"
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-sm border border-border transition-colors hover:border-primary hover:text-primary"
        >
          <X width={18} height={18} />
        </button>
        <img
          src={product.images[0]}
          alt={product.name}
          loading="lazy"
          width={1024}
          height={1024}
          className="aspect-square w-full rounded-sm object-cover"
        />
        <div className="flex flex-col gap-3">
          <h3 className="pr-10 font-display text-xl font-extrabold">{product.name}</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Stars rating={product.rating} />
            <span>
              {product.rating.toFixed(1)} · {product.reviewCount} reviews
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{product.description}</p>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-extrabold text-primary">
              {formatPrice(product.price)}
            </span>
            {product.oldPrice && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.oldPrice)}
              </span>
            )}
            {discount > 0 && (
              <span className="rounded-sm bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                -{discount}%
              </span>
            )}
          </div>
          <div className="mt-auto grid gap-2">
            <button
              type="button"
              disabled={!product.inStock}
              onClick={() => {
                addToCart(product.id);
                onClose();
              }}
              className="btn-orange w-full text-sm"
            >
              {product.inStock ? "Add to Cart" : "Out of stock"}
            </button>
            <Link
              to="/product/$slug"
              params={{ slug: product.slug }}
              onClick={onClose}
              className="btn-ghost-outline w-full text-sm"
            >
              Full Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
