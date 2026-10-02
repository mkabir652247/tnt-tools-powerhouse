import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { dateTime } from "@/lib/admin-format";

export const Route = createFileRoute("/admin/inventory")({
  component: AdminInventory,
  head: () => ({ meta: [{ title: "Inventory — TNT Tools Admin" }] }),
});

type Row = {
  id: string;
  name: string;
  sku: string | null;
  category_id: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
};

type Movement = {
  id: string;
  product_id: string;
  quantity_change: number;
  movement_type: string;
  note: string | null;
  created_at: string;
};

const MOVEMENT_TYPES = ["restock", "purchase", "adjustment", "return", "sale"] as const;

function stockState(r: Row) {
  if (r.stock_quantity === 0) return "out";
  if (r.stock_quantity <= r.low_stock_threshold) return "low";
  return "ok";
}

function AdminInventory() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [status, setStatus] = useState("all");
  const [adjusting, setAdjusting] = useState<Row | null>(null);
  const [historyFor, setHistoryFor] = useState<string | "all">("all");

  const data = useQuery({
    queryKey: ["admin", "inventory"],
    queryFn: async () => {
      const [p, c, m] = await Promise.all([
        supabase
          .from("products")
          .select("id, name, sku, category_id, stock_quantity, low_stock_threshold, is_active")
          .order("name"),
        supabase.from("categories").select("id, name").order("name"),
        supabase
          .from("inventory_movements")
          .select("id, product_id, quantity_change, movement_type, note, created_at")
          .order("created_at", { ascending: false })
          .limit(300),
      ]);
      if (p.error) throw p.error;
      if (c.error) throw c.error;
      if (m.error) throw m.error;
      return { products: p.data as Row[], categories: c.data, movements: m.data as Movement[] };
    },
  });

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data.data?.products ?? []).filter((r) => {
      if (term && !`${r.name} ${r.sku ?? ""}`.toLowerCase().includes(term)) return false;
      if (cat !== "all" && r.category_id !== cat) return false;
      if (status !== "all" && stockState(r) !== status) return false;
      return true;
    });
  }, [data.data, q, cat, status]);

  const nameById = useMemo(
    () => new Map((data.data?.products ?? []).map((p) => [p.id, p.name])),
    [data.data],
  );
  const low = (data.data?.products ?? []).filter((r) => stockState(r) === "low");
  const out = (data.data?.products ?? []).filter((r) => stockState(r) === "out");
  const history = (data.data?.movements ?? []).filter(
    (m) => historyFor === "all" || m.product_id === historyFor,
  );

  if (data.isLoading) return <div className="h-40 animate-pulse rounded-sm border border-border bg-surface" />;
  if (data.error) return <p className="text-sm text-destructive">{(data.error as Error).message}</p>;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Inventory</h1>

      {(low.length > 0 || out.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {out.length > 0 && (
            <div className="rounded-sm border border-destructive/40 bg-destructive/10 p-4 text-sm">
              <p className="font-semibold text-destructive">Out of stock ({out.length})</p>
              <p className="mt-1 text-muted-foreground">{out.map((r) => r.name).join(", ")}</p>
            </div>
          )}
          {low.length > 0 && (
            <div className="rounded-sm border border-primary/40 bg-primary/10 p-4 text-sm">
              <p className="font-semibold text-primary">Low stock ({low.length})</p>
              <p className="mt-1 text-muted-foreground">
                {low.map((r) => `${r.name} (${r.stock_quantity})`).join(", ")}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or SKU…"
          aria-label="Search inventory"
          className="field-tnt h-10 max-w-xs text-sm"
        />
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="field-tnt h-10 w-auto text-sm" aria-label="Category">
          <option value="all">All categories</option>
          {data.data!.categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="field-tnt h-10 w-auto text-sm" aria-label="Stock status">
          <option value="all">All stock levels</option>
          <option value="ok">In stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-sm border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Product</th>
              <th className="hidden px-4 py-2 sm:table-cell">SKU</th>
              <th className="px-4 py-2 text-right">Stock</th>
              <th className="hidden px-4 py-2 text-right md:table-cell">Alert at</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">No products match.</td>
              </tr>
            ) : (
              rows.map((r) => {
                const s = stockState(r);
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-2 font-semibold">
                      {r.name}
                      {!r.is_active && <span className="ml-2 text-xs text-muted-foreground">(hidden)</span>}
                    </td>
                    <td className="hidden px-4 py-2 text-muted-foreground sm:table-cell">{r.sku ?? "—"}</td>
                    <td className={`px-4 py-2 text-right font-semibold ${s === "out" ? "text-destructive" : s === "low" ? "text-primary" : ""}`}>
                      {r.stock_quantity}
                    </td>
                    <td className="hidden px-4 py-2 text-right text-muted-foreground md:table-cell">{r.low_stock_threshold}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-right">
                      <button onClick={() => setAdjusting(r)} className="text-xs text-primary hover:underline">
                        Restock / adjust
                      </button>
                      <button onClick={() => setHistoryFor(r.id)} className="ml-3 text-xs text-muted-foreground hover:text-primary">
                        History
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <section className="rounded-sm border border-border bg-surface">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide">
            Stock history {historyFor !== "all" && `— ${nameById.get(historyFor)}`}
          </h2>
          {historyFor !== "all" && (
            <button onClick={() => setHistoryFor("all")} className="ml-auto text-xs text-primary hover:underline">
              Show all
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No stock movements yet.</p>
        ) : (
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-sm">
              <tbody>
                {history.map((m) => (
                  <tr key={m.id} className="border-t border-border first:border-t-0">
                    <td className="px-4 py-2 text-xs text-muted-foreground">{dateTime(m.created_at)}</td>
                    <td className="px-4 py-2">{nameById.get(m.product_id) ?? "Deleted product"}</td>
                    <td className="px-4 py-2 capitalize text-muted-foreground">{m.movement_type}</td>
                    <td className={`px-4 py-2 text-right font-semibold ${m.quantity_change < 0 ? "text-destructive" : "text-emerald-400"}`}>
                      {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                    </td>
                    <td className="hidden px-4 py-2 text-xs text-muted-foreground md:table-cell">{m.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {adjusting && (
        <AdjustDialog
          row={adjusting}
          onClose={() => setAdjusting(null)}
          onDone={() => {
            setAdjusting(null);
            qc.invalidateQueries({ queryKey: ["admin"] });
            qc.invalidateQueries({ queryKey: ["storefront", "catalog"] });
          }}
        />
      )}
    </div>
  );
}

function AdjustDialog({ row, onClose, onDone }: { row: Row; onClose: () => void; onDone: () => void }) {
  const [type, setType] = useState<(typeof MOVEMENT_TYPES)[number]>("restock");
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      const n = Number(qty);
      if (!Number.isInteger(n) || n <= 0) throw new Error("Enter a whole number greater than 0.");
      const change = mode === "add" ? n : -n;
      if (row.stock_quantity + change < 0) {
        throw new Error(`Stock can't go below zero (current stock is ${row.stock_quantity}).`);
      }
      const { error } = await supabase.rpc("admin_adjust_stock", {
        _product_id: row.id,
        _change: change,
        _type: type,
        _note: note.trim() || null,
      } as never);
      if (error) throw error;
    },
    onSuccess: onDone,
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-sm border border-border bg-surface p-5">
        <h2 className="font-display text-lg font-bold uppercase">Adjust stock</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {row.name} — currently <span className="text-foreground">{row.stock_quantity}</span> in stock
        </p>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="flex gap-2">
            {(["add", "remove"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-sm border px-3 py-2 text-sm ${mode === m ? "border-primary bg-primary/15 text-primary" : "border-border"}`}
              >
                {m === "add" ? "Add stock" : "Remove stock"}
              </button>
            ))}
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-xs uppercase text-muted-foreground">Reason</span>
            <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="field-tnt">
              {MOVEMENT_TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">{t}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs uppercase text-muted-foreground">Quantity</span>
            <input type="number" min={1} step={1} value={qty} onChange={(e) => setQty(e.target.value)} className="field-tnt" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs uppercase text-muted-foreground">Note (optional)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} className="field-tnt" maxLength={200} />
          </label>
          {save.error && <p className="text-sm text-destructive">{(save.error as Error).message}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost-outline px-4 py-2 text-xs">Cancel</button>
            <button type="submit" disabled={save.isPending} className="btn-orange px-4 py-2 text-xs">
              {save.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
