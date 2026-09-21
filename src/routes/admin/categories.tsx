import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/categories")({
  component: AdminCategories,
  head: () => ({ meta: [{ title: "Categories — TNT Tools Admin" }] }),
});

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function AdminCategories() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<CategoryRow> | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, description, image_url, is_active")
        .order("name");
      if (error) throw error;
      return data as CategoryRow[];
    },
  });

  const save = useMutation({
    mutationFn: async (row: Partial<CategoryRow>) => {
      const payload = {
        name: row.name!.trim(),
        slug: row.slug?.trim() || slugify(row.name!),
        description: row.description ?? null,
        image_url: row.image_url ?? null,
        is_active: row.is_active ?? true,
      };
      const res = row.id
        ? await supabase.from("categories").update(payload).eq("id", row.id)
        : await supabase.from("categories").insert(payload);
      if (res.error) throw res.error;
    },
    onSuccess: () => {
      setEditing(null);
      setMessage("Category saved.");
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      qc.invalidateQueries({ queryKey: ["storefront"] });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (row: CategoryRow) => {
      const { error } = await supabase
        .from("categories")
        .update({ is_active: !row.is_active })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      qc.invalidateQueries({ queryKey: ["storefront"] });
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Categories</h1>
        <button
          onClick={() => setEditing({ is_active: true })}
          className="btn-orange ml-auto px-4 py-2 text-xs"
        >
          Add category
        </button>
      </div>

      {message && <p className="text-sm text-emerald-400">{message}</p>}
      {save.error && (
        <p className="text-sm text-destructive">Couldn't save: {(save.error as Error).message}</p>
      )}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-sm border border-border bg-surface" />
      ) : (data?.length ?? 0) === 0 ? (
        <p className="rounded-sm border border-border bg-surface p-6 text-sm text-muted-foreground">
          No categories yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="hidden px-4 py-2 sm:table-cell">Slug</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data!.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-2 font-semibold">{c.name}</td>
                  <td className="hidden px-4 py-2 text-muted-foreground sm:table-cell">{c.slug}</td>
                  <td className="px-4 py-2">
                    <span className={c.is_active ? "text-emerald-400" : "text-muted-foreground"}>
                      {c.is_active ? "Active" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => setEditing(c)} className="text-xs text-primary hover:underline">
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive.mutate(c)}
                      className="ml-3 text-xs text-muted-foreground hover:text-primary"
                    >
                      {c.is_active ? "Hide" : "Show"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-sm border border-border bg-surface p-5">
            <h2 className="font-display text-lg font-bold uppercase">
              {editing.id ? "Edit category" : "Add category"}
            </h2>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate(editing);
              }}
            >
              <Field label="Name">
                <input
                  required
                  className="field-tnt"
                  value={editing.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </Field>
              <Field label="Slug (web address)">
                <input
                  className="field-tnt"
                  placeholder="auto from name"
                  value={editing.slug ?? ""}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                />
              </Field>
              <Field label="Description">
                <textarea
                  rows={3}
                  className="field-tnt"
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </Field>
              <Field label="Image URL">
                <input
                  className="field-tnt"
                  value={editing.image_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.is_active ?? true}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                />
                Visible on the store
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="btn-ghost-outline px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button type="submit" disabled={save.isPending} className="btn-orange px-4 py-2 text-xs">
                  {save.isPending ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
