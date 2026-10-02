import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dateTime, money, statusClass } from "@/lib/admin-format";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
  head: () => ({ meta: [{ title: "Dashboard — TNT Tools Admin" }] }),
});

type Metrics = {
  totalProducts: number;
  totalUnits: number;
  lowStock: number;
  outOfStock: number;
  totalOrders: number;
  pendingOrders: number;
  totalSales: number;
};

async function loadDashboard() {
  const [
    { data: products, error: pErr },
    { data: orders, error: oErr },
    { data: items, error: iErr },
  ] = await Promise.all([
    supabase.from("products").select("id, name, stock_quantity, low_stock_threshold, is_active"),
    supabase
      .from("orders")
      .select(
        "id, order_number, customer_name, total_amount, order_status, payment_status, created_at",
      )
      .order("created_at", { ascending: false }),
    supabase.from("order_items").select("product_name_snapshot, quantity, total_price"),
  ]);
  if (pErr) throw pErr;
  if (oErr) throw oErr;
  if (iErr) throw iErr;

  const prods = products ?? [];
  const ords = orders ?? [];

  const metrics: Metrics = {
    totalProducts: prods.length,
    totalUnits: prods.reduce((s, p) => s + (p.stock_quantity ?? 0), 0),
    lowStock: prods.filter(
      (p) => (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) <= (p.low_stock_threshold ?? 0),
    ).length,
    outOfStock: prods.filter((p) => (p.stock_quantity ?? 0) === 0).length,
    totalOrders: ords.length,
    pendingOrders: ords.filter((o) => o.order_status === "pending").length,
    totalSales: ords
      .filter((o) => o.order_status !== "cancelled" && o.order_status !== "returned")
      .reduce((s, o) => s + Number(o.total_amount ?? 0), 0),
  };

  const sellers = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const it of items ?? []) {
    const key = it.product_name_snapshot;
    const cur = sellers.get(key) ?? { name: key, qty: 0, revenue: 0 };
    cur.qty += it.quantity;
    cur.revenue += Number(it.total_price ?? 0);
    sellers.set(key, cur);
  }
  const topProducts = [...sellers.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);

  return { metrics, recentOrders: ords.slice(0, 8), topProducts };
}

function AdminDashboard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: loadDashboard,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-sm border border-border bg-surface" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-sm border border-destructive/40 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Couldn't load the dashboard: {(error as Error).message}
        </p>
        <button onClick={() => refetch()} className="btn-orange mt-3 px-4 py-2 text-xs">
          Try again
        </button>
      </div>
    );
  }

  const m = data!.metrics;
  const cards = [
    { label: "Total products", value: m.totalProducts },
    { label: "Inventory units", value: m.totalUnits },
    { label: "Low stock", value: m.lowStock, warn: m.lowStock > 0 },
    { label: "Out of stock", value: m.outOfStock, warn: m.outOfStock > 0 },
    { label: "Total orders", value: m.totalOrders },
    { label: "Pending orders", value: m.pendingOrders },
    { label: "Total sales", value: money(m.totalSales) },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-sm border border-border bg-surface p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</p>
            <p
              className={`mt-2 font-display text-2xl font-bold ${c.warn ? "text-primary" : "text-foreground"}`}
            >
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-sm border border-border bg-surface xl:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide">
              Recent orders
            </h2>
            <Link to="/admin/products" className="text-xs text-primary hover:underline">
              Manage products
            </Link>
          </div>
          {data!.recentOrders.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Order</th>
                    <th className="px-4 py-2">Customer</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="hidden px-4 py-2 sm:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.recentOrders.map((o) => (
                    <tr key={o.id} className="border-t border-border">
                      <td className="px-4 py-2 font-semibold">{o.order_number}</td>
                      <td className="px-4 py-2">{o.customer_name}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-sm border px-2 py-0.5 text-xs capitalize ${statusClass(o.order_status)}`}
                        >
                          {o.order_status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">{money(o.total_amount)}</td>
                      <td className="hidden px-4 py-2 text-xs text-muted-foreground sm:table-cell">
                        {dateTime(o.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-sm border border-border bg-surface">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide">Top selling</h2>
          </div>
          {data!.topProducts.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No sales recorded yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data!.topProducts.map((p) => (
                <li
                  key={p.name}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <span className="min-w-0 truncate">{p.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {p.qty} sold · {money(p.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
