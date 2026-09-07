import { Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { formatPrice } from "@/data/products";
import { useShop } from "@/lib/shop-store";

export function CartDrawer() {
  const { cartOpen, setCartOpen, detailedCart, subtotal, setQty, removeFromCart } = useShop();

  return (
    <div
      className={`fixed inset-0 z-[60] ${cartOpen ? "" : "pointer-events-none"}`}
      aria-hidden={!cartOpen}
    >
      <div
        onClick={() => setCartOpen(false)}
        className={`absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300 ${
          cartOpen ? "opacity-100" : "opacity-0"
        }`}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-border bg-surface transition-transform duration-300 ${
          cartOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Shopping cart"
      >
        <header className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-display text-lg font-extrabold uppercase tracking-wide">Your Cart</h2>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            aria-label="Close cart"
            className="grid h-9 w-9 place-items-center rounded-sm border border-border transition-colors hover:border-primary hover:text-primary"
          >
            <X width={18} height={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {detailedCart.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Your cart is empty. Start with the best sellers.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {detailedCart.map(({ product, qty }) => (
                <li key={product.id} className="grid grid-cols-[64px_minmax(0,1fr)] gap-3">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    loading="lazy"
                    width={1024}
                    height={1024}
                    className="h-16 w-16 rounded-sm object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-bold">{product.name}</p>
                    <p className="text-sm text-primary">{formatPrice(product.price)}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center rounded-sm border border-border">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() => setQty(product.id, qty - 1)}
                          className="grid h-8 w-8 place-items-center hover:text-primary"
                        >
                          <Minus width={14} height={14} />
                        </button>
                        <span className="w-8 text-center text-sm">{qty}</span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() => setQty(product.id, qty + 1)}
                          className="grid h-8 w-8 place-items-center hover:text-primary"
                        >
                          <Plus width={14} height={14} />
                        </button>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${product.name}`}
                        onClick={() => removeFromCart(product.id)}
                        className="grid h-8 w-8 place-items-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                      >
                        <Trash2 width={14} height={14} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="border-t border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Subtotal</span>
            <span className="font-display text-lg font-extrabold text-primary">
              {formatPrice(subtotal)}
            </span>
          </div>
          <div className="grid gap-2">
            <Link to="/checkout" onClick={() => setCartOpen(false)} className="btn-orange w-full text-sm">
              Checkout
            </Link>
            <Link to="/cart" onClick={() => setCartOpen(false)} className="btn-ghost-outline w-full text-sm">
              View Cart
            </Link>
          </div>
        </footer>
      </aside>
    </div>
  );
}
