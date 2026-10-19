# Plan: TNT Tools Product Sub-admin and Homepage

## Approved behavior

The existing `product_manager` role remains the sub-admin role. It can create products and direct subcategories under an existing active root tool category; both publish immediately. The user has now authorized this role to edit and delete products as well. The live database currently has one `product_manager` assignment, so this role-level change affects that current holder and any future holders of the same role.

Product managers can edit product details across the catalog, including name/slug, descriptions, category (subject to the active tool-taxonomy guard), brand/SKU, price, stock quantity/threshold, product images, and specifications. Any stock change must continue through the existing audited stock adjustment function. Product managers cannot feature, hide, or publish-toggle products, edit or delete existing categories, or access orders, inventory, customers, settings, or user-role management. Product deletion must use the authenticated server function and its service-only database RPC; products in order history cannot be deleted, preserving order history. A full admin can hide those products instead.

The Products page must expose Edit/Delete to product managers while preserving full-admin controls. Product-manager edits and deletions must call `src/lib/catalog-admin.functions.ts` so server-side role checks and service-only RPCs remain the security boundary; do not invoke privileged RPCs directly from browser code. New product creation continues through the existing create-only database function. The admin route remains restricted to `/admin/products` and `/admin/categories` for product managers.

On the homepage, show products genuinely marked Featured before the Categories section. Show up to eight featured items initially; **Show more** expands inline to every product in the live catalog and **Show less** restores the featured preview.

Category deletion was checked but is not part of this change: no delete button is exposed in the admin UI. Keep category edit/delete privileges unchanged.

## Implementation approach and project structure

- `src/routes/index.tsx`: featured-first homepage order and inline full-catalog expansion.
- `src/routes/admin/products.tsx`: role-aware product edit/delete UI and server-function calls; preserve create, audited stock updates, taxonomy, and product-order safety rules.
- `src/lib/catalog-admin.functions.ts`: existing authenticated role-checking server function for product updates/deletes; reuse it rather than adding a new privilege path.
- `src/routes/admin/route.tsx` and `src/routes/admin/categories.tsx`: preserve the existing route and create-only category boundaries.
- `supabase/migrations/`: reuse the already-applied `product_manager_update_product` and `delete_catalog_product` service-only RPCs; no new database schema change is intended.
- Keep the current TNT Tools dark/orange design language and existing TanStack Start/Supabase stack; add no dependencies or external services.
