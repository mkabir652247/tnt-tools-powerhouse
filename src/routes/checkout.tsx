import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Banknote } from "lucide-react";
import { formatPrice } from "@/data/products";
import { useShop } from "@/lib/shop-store";
import { placeOrder } from "@/lib/orders.functions";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — TNT Tools" },
      { name: "description", content: "Complete your TNT Tools order with Cash on Delivery." },
      { property: "og:title", content: "Checkout — TNT Tools" },
      { property: "og:description", content: "Secure checkout for professional power tools and equipment." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Checkout,
});

const COUPONS: Record<string, number> = { TNT10: 0.1, POWER15: 0.15 };

function Checkout() {
  const { detailedCart, subtotal, clearCart } = useShop();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const submitOrder = useServerFn(placeOrder);
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState<{ code: string; rate: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const shipping = subtotal > 0 && subtotal < 25000 ? 750 : 0;
  const discount = applied ? Math.round(subtotal * applied.rate) : 0;
  const total = Math.max(0, subtotal - discount) + shipping;
  const unavailable = detailedCart.filter(({ product }) => !product.inStock);

  function applyCoupon() {
    const rate = COUPONS[coupon.trim().toUpperCase()];
    if (!rate) {
      setApplied(null);
      setCouponError("That code is not valid.");
      return;
    }
    setApplied({ code: coupon.trim().toUpperCase(), rate });
    setCouponError("");
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (detailedCart.length === 0 || submitting) return;
    if (unavailable.length > 0) {
      setOrderError(`Remove out-of-stock items first: ${unavailable.map((l) => l.product.name).join(", ")}`);
      return;
    }
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "");
    setSubmitting(true);
    setOrderError(null);
    try {
      const address = [get("address"), get("postal")].filter(Boolean).join(", ");
      const res = await submitOrder({
        data: {
          customer_name: get("name"),
          customer_phone: get("phone"),
          customer_email: get("email"),
          shipping_address: address,
          city: get("city"),
          notes: get("notes"),
          ...(applied ? { coupon: applied.code } : {}),
          items: detailedCart.map(({ product, qty }) => ({ product_id: product.id, quantity: qty })),
        },
      });
      if (!res.ok) {
        setOrderError(res.error);
        await queryClient.invalidateQueries({ queryKey: ["storefront", "catalog"] });
        return;
      }
      clearCart();
      await queryClient.invalidateQueries({ queryKey: ["storefront", "catalog"] });
      navigate({ to: "/order-confirmation", search: { order: res.orderNumber, total: res.total } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      // Validation errors come back as a JSON list from the server.
      try {
        const parsed = JSON.parse(msg) as { message: string }[];
        setOrderError(parsed.map((p) => p.message).join(". "));
      } catch {
        setOrderError("We couldn't place your order. Check your connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (detailedCart.length === 0) {
    return (
      <div className="container-tnt py-20 text-center">
        <h1 className="text-3xl">Checkout</h1>
        <p className="mt-3 text-muted-foreground">Your cart is empty, so there is nothing to check out.</p>
        <Link to="/shop" className="btn-orange mt-6">
          Browse Tools
        </Link>
      </div>
    );
  }

  return (
    <div className="container-tnt py-12">
      <h1 className="text-3xl sm:text-4xl">Checkout</h1>

      <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-extrabold uppercase tracking-wide">
              Shipping Information
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Input label="Full name" name="name" required />
              <Input label="Phone" name="phone" type="tel" required />
              <Input label="Email (optional)" name="email" type="email" />
              <Input label="City" name="city" required />
              <div className="sm:col-span-2">
                <Input label="Street address" name="address" required />
              </div>
              <Input label="Postal code" name="postal" />
              <Input label="Order notes (optional)" name="notes" />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-extrabold uppercase tracking-wide">
              Payment Method
            </h2>
            <div className="mt-5 flex items-center gap-3 rounded-sm border border-primary bg-primary/10 p-4">
              <Banknote width={18} height={18} className="shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold">Cash on Delivery</p>
                <p className="text-xs text-muted-foreground">Pay in cash when your order arrives.</p>
              </div>
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-lg border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-extrabold uppercase tracking-wide">
            Order Summary
          </h2>
          <ul className="mt-5 space-y-3 text-sm">
            {detailedCart.map(({ product, qty }) => (
              <li key={product.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                <span className="min-w-0 truncate text-muted-foreground">
                  {product.name} × {qty}
                  {!product.inStock && <span className="ml-1 text-destructive">(out of stock)</span>}
                </span>
                <span className="shrink-0">{formatPrice(product.price * qty)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5">
            <label htmlFor="coupon" className="mb-1.5 block text-sm font-semibold">
              Discount code
            </label>
            <div className="flex gap-2">
              <input
                id="coupon"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder="TNT10"
                className="field-tnt text-sm"
              />
              <button type="button" onClick={applyCoupon} className="btn-ghost-outline px-4 text-xs">
                Apply
              </button>
            </div>
            {couponError && <p className="mt-1 text-xs text-destructive">{couponError}</p>}
            {applied && (
              <p className="mt-1 text-xs text-[var(--success)]">
                {applied.code} applied — {Math.round(applied.rate * 100)}% off
              </p>
            )}
          </div>

          <dl className="mt-5 space-y-3 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatPrice(subtotal)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Discount</dt>
                <dd className="text-[var(--success)]">-{formatPrice(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd>{shipping === 0 ? "Free" : formatPrice(shipping)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-3 font-display text-base font-extrabold">
              <dt>Total</dt>
              <dd className="text-primary">{formatPrice(total)}</dd>
            </div>
          </dl>

          {orderError && (
            <p role="alert" className="mt-4 rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {orderError}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-orange mt-6 w-full text-sm disabled:opacity-60">
            {submitting ? "Placing order…" : "Place Order (Cash on Delivery)"}
          </button>
        </aside>
      </form>
    </div>
  );
}

function Input({
  label,
  name,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        maxLength={120}
        placeholder={placeholder}
        className="field-tnt text-sm"
      />
    </div>
  );
}
