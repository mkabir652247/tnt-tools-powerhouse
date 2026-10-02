import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  dateTime,
  money,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  statusClass,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/admin-format";

type OrdersSearch = { q?: string | undefined };

export const Route = createFileRoute("/admin/orders")({
  validateSearch: (search: Record<string, unknown>): OrdersSearch =>
    typeof search["q"] === "string" ? { q: search["q"] } : {},
  component: AdminOrders,
  head: () => ({ meta: [{ title: "Orders — TNT Tools Admin" }] }),
});

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  shipping_address: string;
  city: string | null;
  order_status: OrderStatus;
  payment_method: string;
  payment_status: PaymentStatus;
  subtotal: number;
  shipping_fee: number;
  discount: number;
  total_amount: number;
  notes: string | null;
  created_at: string;
};

function AdminOrders() {
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? "");
  const [status, setStatus] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const orders = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, customer_name, customer_email, customer_phone, shipping_address, city, order_status, payment_method, payment_status, subtotal, shipping_fee, discount, total_amount, notes, created_at",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (orders.data ?? []).filter((o) => {
      if (status !== "all" && o.order_status !== status) return false;
      if (term && !`${o.order_number} ${o.customer_name} ${o.customer_phone}`.toLowerCase().includes(term))
        return false;
      return true;
    });
  }, [orders.data, q, status]);

  const open = (orders.data ?? []).find((o) => o.id === openId) ?? null;

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Orders</h1>

      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Order number, customer or phone…"
          aria-label="Search orders"
          className="field-tnt h-10 max-w-xs text-sm"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="field-tnt h-10 w-auto text-sm" aria-label="Order status">
          <option value="all">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>
      </div>

      {orders.isLoading ? (
        <div className="h-40 animate-pulse rounded-sm border border-border bg-surface" />
      ) : orders.error ? (
        <p className="text-sm text-destructive">{(orders.error as Error).message}</p>
      ) : list.length === 0 ? (
        <p className="rounded-sm border border-border bg-surface p-6 text-sm text-muted-foreground">
          {(orders.data ?? []).length === 0 ? "No orders yet." : "No orders match these filters."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Order</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Status</th>
                <th className="hidden px-4 py-2 md:table-cell">Payment</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="hidden px-4 py-2 lg:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => setOpenId(o.id)}
                  className="cursor-pointer border-t border-border hover:bg-primary/5"
                >
                  <td className="px-4 py-2 font-semibold text-primary">{o.order_number}</td>
                  <td className="px-4 py-2">{o.customer_name}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-sm border px-2 py-0.5 text-xs capitalize ${statusClass(o.order_status)}`}>
                      {o.order_status}
                    </span>
                  </td>
                  <td className="hidden px-4 py-2 md:table-cell">
                    <span className={`rounded-sm border px-2 py-0.5 text-xs capitalize ${statusClass(o.payment_status)}`}>
                      {o.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">{money(o.total_amount)}</td>
                  <td className="hidden px-4 py-2 text-xs text-muted-foreground lg:table-cell">{dateTime(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && <OrderDetail order={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function OrderDetail({ order, onClose }: { order: Order; onClose: () => void }) {
  const qc = useQueryClient();
  const [orderStatus, setOrderStatus] = useState<OrderStatus>(order.order_status);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(order.payment_status);
  const [notes, setNotes] = useState(order.notes ?? "");
  const [saved, setSaved] = useState(false);
  const closed = order.order_status === "cancelled" || order.order_status === "returned";

  const items = useQuery({
    queryKey: ["admin", "order-items", order.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("id, product_name_snapshot, sku_snapshot, quantity, unit_price, total_price")
        .eq("order_id", order.id);
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (
        (orderStatus === "cancelled" || orderStatus === "returned") &&
        orderStatus !== order.order_status &&
        !window.confirm(`Mark this order as ${orderStatus}? Its items will go back into stock. This can't be undone.`)
      ) {
        throw new Error("Not changed.");
      }
      const { error } = await supabase.rpc("admin_update_order", {
        _order_id: order.id,
        _order_status: orderStatus,
        _payment_status: paymentStatus,
        _notes: notes,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ["admin"] });
      qc.invalidateQueries({ queryKey: ["storefront", "catalog"] });
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70" onClick={onClose}>
      <div
        className="h-full w-full max-w-xl overflow-y-auto border-l border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold uppercase">{order.order_number}</h2>
            <p className="text-xs text-muted-foreground">{dateTime(order.created_at)}</p>
          </div>
          <button onClick={onClose} className="btn-ghost-outline px-3 py-1.5 text-xs">Close</button>
        </div>

        <section className="mt-5 space-y-1 text-sm">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer & shipping</h3>
          <p className="font-semibold">{order.customer_name}</p>
          <p>{order.customer_phone}</p>
          {order.customer_email && <p>{order.customer_email}</p>}
          <p className="text-muted-foreground">
            {order.shipping_address}
            {order.city ? `, ${order.city}` : ""}
          </p>
          <p className="text-muted-foreground">
            Payment method: {order.payment_method === "cod" ? "Cash on Delivery" : order.payment_method}
          </p>
        </section>

        <section className="mt-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Items</h3>
          {items.isLoading ? (
            <div className="h-16 animate-pulse rounded-sm bg-background" />
          ) : items.error ? (
            <p className="text-sm text-destructive">{(items.error as Error).message}</p>
          ) : (
            <ul className="divide-y divide-border rounded-sm border border-border text-sm">
              {items.data!.map((it) => (
                <li key={it.id} className="flex justify-between gap-3 p-3">
                  <span className="min-w-0">
                    <span className="block truncate">{it.product_name_snapshot}</span>
                    <span className="text-xs text-muted-foreground">
                      {it.sku_snapshot ?? ""} · {it.quantity} × {money(it.unit_price)}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold">{money(it.total_price)}</span>
                </li>
              ))}
            </ul>
          )}
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between"><dt className="text-muted-foreground">Discount</dt><dd>-{money(order.discount)}</dd></div>
            )}
            <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd>{money(order.shipping_fee)}</dd></div>
            <div className="flex justify-between font-bold"><dt>Total</dt><dd className="text-primary">{money(order.total_amount)}</dd></div>
          </dl>
        </section>

        <form
          className="mt-6 space-y-3 border-t border-border pt-5"
          onSubmit={(e) => {
            e.preventDefault();
            setSaved(false);
            save.mutate();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-xs uppercase text-muted-foreground">Order status</span>
              <select
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
                className="field-tnt capitalize"
              >
                {ORDER_STATUSES.filter((s) => !closed || s === "cancelled" || s === "returned").map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs uppercase text-muted-foreground">Payment status</span>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="field-tnt capitalize"
              >
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-xs uppercase text-muted-foreground">Internal notes</span>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="field-tnt" />
          </label>
          {save.error && (save.error as Error).message !== "Not changed." && (
            <p className="text-sm text-destructive">{(save.error as Error).message}</p>
          )}
          {saved && <p className="text-sm text-emerald-400">Order updated.</p>}
          <button type="submit" disabled={save.isPending} className="btn-orange px-4 py-2 text-xs">
            {save.isPending ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
