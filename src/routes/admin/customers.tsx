import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dateTime, money } from "@/lib/admin-format";

export const Route = createFileRoute("/admin/customers")({
  component: AdminCustomers,
  head: () => ({ meta: [{ title: "Customers — TNT Tools Admin" }] }),
});

function AdminCustomers() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("customer_name, customer_phone, customer_email, city, total_amount, created_at, order_status")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const map = new Map<
        string,
        { name: string; phone: string; email: string | null; city: string | null; orders: number; spend: number; last: string }
      >();
      for (const o of data ?? []) {
        const key = o.customer_phone;
        const cur = map.get(key) ?? {
          name: o.customer_name,
          phone: o.customer_phone,
          email: o.customer_email,
          city: o.city,
          orders: 0,
          spend: 0,
          last: o.created_at,
        };
        cur.orders += 1;
        if (o.order_status !== "cancelled" && o.order_status !== "returned") {
          cur.spend += Number(o.total_amount ?? 0);
        }
        map.set(key, cur);
      }
      return [...map.values()];
    },
  });

  if (isLoading) return <div className="h-40 animate-pulse rounded-sm border border-border bg-surface" />;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Customers</h1>
      {data!.length === 0 ? (
        <p className="rounded-sm border border-border bg-surface p-6 text-sm text-muted-foreground">
          No customers yet — they appear here after their first order.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Phone</th>
                <th className="hidden px-4 py-2 md:table-cell">City</th>
                <th className="px-4 py-2 text-right">Orders</th>
                <th className="px-4 py-2 text-right">Spend</th>
                <th className="hidden px-4 py-2 lg:table-cell">Last order</th>
              </tr>
            </thead>
            <tbody>
              {data!.map((c) => (
                <tr key={c.phone} className="border-t border-border">
                  <td className="px-4 py-2 font-semibold">{c.name}</td>
                  <td className="px-4 py-2">{c.phone}</td>
                  <td className="hidden px-4 py-2 md:table-cell">{c.city ?? "—"}</td>
                  <td className="px-4 py-2 text-right">{c.orders}</td>
                  <td className="px-4 py-2 text-right">{money(c.spend)}</td>
                  <td className="hidden px-4 py-2 text-xs text-muted-foreground lg:table-cell">
                    {dateTime(c.last)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
