import { createFileRoute, useRouteContext } from "@tanstack/react-router";
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
  parent_category_id: string | null;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function AdminCategories() {
  const { isAdmin } = useRouteContext({ from: "/admin" });
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<CategoryRow> | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, description, image_url, is_active, parent_category_id")
        .order("name");
      if (error) throw error;
      return data as CategoryRow[];
    },
  });

  const rootCategories = (data ?? []).filter(
    (category) => !category.parent_category_id && (category.is_active || isAdmin),
  );
  const categoryById = new Map((data ?? []).map((category) => [category.id, category]));

  const save = useMutation({
    mutationFn: async (row: Partial<CategoryRow>) => {
      const name = row.name?.trim() ?? "";
      if (!name) throw new Error("Category name is required.");
      const slug = row.slug?.trim() || slugify(name);
      if (!slug) throw new Error("Enter a category name that can be used to create a web address.");
      const payload = {
        name,
        slug,
        description: row.description?.trim() || null,
        image_url: row.image_url?.trim() || null,
      };
      const parentCategoryId = row.parent_category_id ?? null;

      if (!isAdmin) {
        if (row.id) throw new Error("Product sub-admins can only add new subcategories.");
        const parent = rootCategories.find((category) => category.id === parentCategoryId);
        if (!parent) throw new Error("Choose an existing active root tool category.");
        const { error } = await supabase.from("categories").insert({
          ...payload,
          is_active: true,
          parent_category_id: parent.id,
        });
        if (error) throw error;
        return;
      }

      const adminPayload = {
        ...payload,
        is_active: row.is_active ?? true,
        parent_category_id: parentCategoryId,
      };
      const result = row.id
        ? await supabase.from("categories").update(adminPayload).eq("id", row.id)
        : await supabase.from("categories").insert(adminPayload);
      if (result.error) throw result.error;
    },
    onSuccess: async () => {
      setEditing(null);
      setMessage(isAdmin ? "Category saved." : "Subcategory added and published.");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin", "categories"] }),
        qc.invalidateQueries({ queryKey: ["storefront"] }),
      ]);
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
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Categories</h1>
          {!isAdmin && (
            <p className="mt-1 text-sm text-muted-foreground">
              Add a subcategory under an active tool category. It will appear in the store
              immediately.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setMessage(null);
            setEditing({ is_active: true, parent_category_id: null });
          }}
          disabled={!isAdmin && rootCategories.length === 0}
          className="btn-orange ml-auto px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isAdmin ? "Add category" : "Add subcategory"}
        </button>
      </div>

      {!isAdmin && rootCategories.length === 0 && (
        <p className="text-sm text-muted-foreground">
          There are no active root categories. Ask a full admin to add or activate a tool category
          first.
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-emerald-400">
          {message}
        </p>
      )}
      {save.error && (
        <p role="alert" className="text-sm text-destructive">
          Couldn’t save: {(save.error as Error).message}
        </p>
      )}
      {toggleActive.error && (
        <p role="alert" className="text-sm text-destructive">
          Couldn’t change category visibility: {(toggleActive.error as Error).message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {(error as Error).message}
        </p>
      )}

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
                <th className="px-4 py-2">Parent</th>
                <th className="hidden px-4 py-2 sm:table-cell">Slug</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data!.map((category) => {
                const parentName = category.parent_category_id
                  ? (categoryById.get(category.parent_category_id)?.name ?? "Inactive root")
                  : "Root category";
                return (
                  <tr key={category.id} className="border-t border-border">
                    <td className="px-4 py-2 font-semibold">{category.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{parentName}</td>
                    <td className="hidden px-4 py-2 text-muted-foreground sm:table-cell">
                      {category.slug}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          category.is_active ? "text-emerald-400" : "text-muted-foreground"
                        }
                      >
                        {category.is_active ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {isAdmin ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditing(category)}
                            className="text-xs text-primary hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={toggleActive.isPending}
                            onClick={() => toggleActive.mutate(category)}
                            className="ml-3 text-xs text-muted-foreground hover:text-primary disabled:opacity-50"
                          >
                            {category.is_active ? "Hide" : "Show"}
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Create-only access</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-sm border border-border bg-surface p-5">
            <h2 className="font-display text-lg font-bold uppercase">
              {editing.id ? "Edit category" : isAdmin ? "Add category" : "Add subcategory"}
            </h2>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                save.mutate(editing);
              }}
            >
              <Field label="Name">
                <input
                  required
                  maxLength={160}
                  className="field-tnt"
                  value={editing.name ?? ""}
                  onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                />
              </Field>
              <Field label={isAdmin ? "Parent category" : "Parent tool category"}>
                <select
                  required={!isAdmin}
                  className="field-tnt"
                  value={editing.parent_category_id ?? ""}
                  onChange={(event) =>
                    setEditing({ ...editing, parent_category_id: event.target.value || null })
                  }
                >
                  <option value="">
                    {isAdmin ? "Root category (no parent)" : "Choose an active root category"}
                  </option>
                  {rootCategories
                    .filter((category) => category.id !== editing.id)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {isAdmin
                    ? "Only root categories can be selected as a parent."
                    : "Subcategories must belong directly to an existing active root category."}
                </span>
              </Field>
              <Field label="Slug (web address)">
                <input
                  maxLength={180}
                  className="field-tnt"
                  placeholder="auto from name"
                  value={editing.slug ?? ""}
                  onChange={(event) => setEditing({ ...editing, slug: event.target.value })}
                />
              </Field>
              <Field label="Description">
                <textarea
                  rows={3}
                  maxLength={1000}
                  className="field-tnt"
                  value={editing.description ?? ""}
                  onChange={(event) => setEditing({ ...editing, description: event.target.value })}
                />
              </Field>
              <Field label="Image URL">
                <input
                  className="field-tnt"
                  value={editing.image_url ?? ""}
                  onChange={(event) => setEditing({ ...editing, image_url: event.target.value })}
                />
              </Field>
              {isAdmin ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editing.is_active ?? true}
                    onChange={(event) =>
                      setEditing({ ...editing, is_active: event.target.checked })
                    }
                  />
                  Visible on the store
                </label>
              ) : (
                <p className="rounded-sm border border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground">
                  New subcategories are published immediately. Existing categories cannot be edited
                  or hidden from this account.
                </p>
              )}
              {save.error && (
                <p role="alert" className="text-sm text-destructive">
                  {(save.error as Error).message}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="btn-ghost-outline px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={save.isPending}
                  className="btn-orange px-4 py-2 text-xs"
                >
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
