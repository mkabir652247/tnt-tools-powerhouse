import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { formatPrice } from "@/data/products";
import { useShop } from "@/lib/shop-store";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Shopping Cart — TNT Tools" },
      { name: "description", content: "Review the tools in your TNT Tools cart before checkout." },
      { property: "og:title", content: "Shopping Cart — TNT Tools" },
      { property: "og:description", content: "Review your selected power tools and equipment." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { detailedCart, subtotal, setQty, removeFromCart } = useShop();
  const shipping = subtotal > 0 && subtotal < 25000 ? 750 : 0;

  return (
    <div className="container-tnt py-12">
      <h1 className="text-3xl sm:text-4xl">Your Cart</h1>

      {detailedCart.length === 0 ? (
        <div className="mt-10 rounded-lg border border-border bg-surface p-12 text-center">
          <p className="text-muted-foreground">Your cart is empty.</p>
          <Link to="/shop" className="btn-orange mt-6">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <ul className="space-y-4">
            {detailedCart.map(({ product, qty }) => (
              <li
                key={product.id}
                className="grid grid-cols-[88px_minmax(0,1fr)] gap-4 rounded-lg border border-border bg-surface p-4"
              >
                <img
                  src={product.images[0]}
                  alt={product.name}
                  loading="lazy"
                  width={1024}
                  height={1024}
                  className="h-22 w-22 rounded-sm object-cover"
                />
                <div className="min-w-0">
                  <Link
                    to="/product/$slug"
                    params={{ slug: product.slug }}
                    className="font-display font-bold hover:text-primary"
                  >
                    {product.name}
                  </Link>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{product.spec}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <div className="flex items-center rounded-sm border border-border">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => setQty(product.id, qty - 1)}
                        className="grid h-9 w-9 place-items-center hover:text-primary"
                      >
                        <Minus width={14} height={14} />
                      </button>
                      <span className="w-9 text-center text-sm">{qty}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => setQty(product.id, qty + 1)}
                        className="grid h-9 w-9 place-items-center hover:text-primary"
                      >
                        <Plus width={14} height={14} />
                      </button>
                    </div>
                    <span className="font-display font-bold text-primary">
                      {formatPrice(product.price * qty)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFromCart(product.id)}
                      className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 width={14} height={14} /> Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit rounded-lg border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-extrabold uppercase tracking-wide">
              Order Summary
            </h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd>{shipping === 0 ? "Free" : formatPrice(shipping)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-3 font-display text-base font-extrabold">
                <dt>Total</dt>
                <dd className="text-primary">{formatPrice(subtotal + shipping)}</dd>
              </div>
            </dl>
            <Link to="/checkout" className="btn-orange mt-6 w-full text-sm">
              Proceed to Checkout
            </Link>
            <Link to="/shop" className="btn-ghost-outline mt-2 w-full text-sm">
              Continue Shopping
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
