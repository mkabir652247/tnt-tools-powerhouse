import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Package, Truck } from "lucide-react";
import { formatPrice } from "@/data/products";

type ConfirmSearch = { order?: string | undefined; total?: number | undefined };

export const Route = createFileRoute("/order-confirmation")({
  validateSearch: (search: Record<string, unknown>): ConfirmSearch => ({
    order: search["order"] ? String(search["order"]) : undefined,
    total: search["total"] ? Number(search["total"]) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Order Confirmed — TNT Tools" },
      { name: "description", content: "Your TNT Tools order has been confirmed and is being prepared for dispatch." },
      { property: "og:title", content: "Order Confirmed — TNT Tools" },
      { property: "og:description", content: "Thank you for your order with TNT Tools." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderConfirmation,
});

function OrderConfirmation() {
  const { order, total } = Route.useSearch();

  return (
    <div className="container-tnt py-20">
      <div className="mx-auto max-w-xl rounded-lg border border-border bg-surface p-10 text-center">
        <CheckCircle2 width={48} height={48} className="mx-auto text-primary" />
        <h1 className="mt-5 text-3xl">Order Confirmed</h1>
        <p className="mt-3 text-muted-foreground">
          Thank you — your order has been received. We'll call you to confirm before dispatch. Pay in
          cash when your tools arrive.
        </p>

        <dl className="mt-7 grid gap-3 rounded-sm border border-border p-5 text-left text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Order number</dt>
            <dd className="font-display font-bold">{order ?? "TNT-000000"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Order total</dt>
            <dd className="font-display font-bold text-primary">{formatPrice(total ?? 0)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Status</dt>
            <dd>Processing</dd>
          </div>
        </dl>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-sm border border-border px-4 py-3 text-left text-sm">
            <Package width={18} height={18} className="shrink-0 text-primary" /> Packed within 24h
          </div>
          <div className="flex items-center gap-3 rounded-sm border border-border px-4 py-3 text-left text-sm">
            <Truck width={18} height={18} className="shrink-0 text-primary" /> Tracked delivery
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/shop" className="btn-orange">
            Keep Shopping
          </Link>
          <Link to="/account" className="btn-ghost-outline">
            View Account
          </Link>
        </div>
      </div>
    </div>
  );
}
