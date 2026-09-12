import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Banknote, CreditCard, Wallet } from "lucide-react";
import { formatPrice } from "@/data/products";
import { useShop } from "@/lib/shop-store";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — TNT Tools" },
      { name: "description", content: "Complete your TNT Tools order: shipping, discount code and payment method." },
      { property: "og:title", content: "Checkout — TNT Tools" },
      { property: "og:description", content: "Secure checkout for professional power tools and equipment." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Checkout,
});

const COUPONS: Record<string, number> = { TNT10: 0.1, POWER15: 0.15 };

function Checkout() {
  const { detailedCart, subtotal, placeOrder } = useShop();
  const navigate = useNavigate();
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState<{ code: string; rate: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [payment, setPayment] = useState("card");

  const shipping = subtotal > 0 && subtotal < 25000 ? 750 : 0;
  const discount = applied ? Math.round(subtotal * applied.rate) : 0;
  const total = Math.max(0, subtotal - discount) + shipping;

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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (detailedCart.length === 0) return;
    const id = placeOrder(total);
    navigate({ to: "/order-confirmation", search: { order: id, total } });
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
              <Input label="Email" name="email" type="email" required />
              <Input label="City" name="city" required />
              <div className="sm:col-span-2">
                <Input label="Street address" name="address" required />
              </div>
              <Input label="Postal code" name="postal" />
              <Input label="Company (optional)" name="company" />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-extrabold uppercase tracking-wide">
              Payment Method
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { id: "card", label: "Card", icon: CreditCard },
                { id: "cod", label: "Cash on Delivery", icon: Banknote },
                { id: "wallet", label: "Mobile Wallet", icon: Wallet },
              ].map(({ id, label, icon: Icon }) => (
                <label
                  key={id}
                  className={`flex cursor-pointer items-center gap-3 rounded-sm border p-4 transition-colors ${
                    payment === id ? "border-primary bg-primary/10" : "border-border hover:border-primary/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={id}
                    checked={payment === id}
                    onChange={() => setPayment(id)}
                    className="sr-only"
                  />
                  <Icon width={18} height={18} className="shrink-0 text-primary" />
                  <span className="min-w-0 truncate text-sm font-semibold">{label}</span>
                </label>
              ))}
            </div>
            {payment === "card" && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Input label="Card number" name="card" placeholder="0000 0000 0000 0000" />
                </div>
                <Input label="Expiry" name="expiry" placeholder="MM/YY" />
                <Input label="CVC" name="cvc" placeholder="123" />
              </div>
            )}
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

          <button type="submit" className="btn-orange mt-6 w-full text-sm">
            Place Order
          </button>
          <p className="mt-3 text-xs text-muted-foreground">
            This is a demo checkout — no payment is processed and no card details are stored.
          </p>
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
