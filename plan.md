# Plan: Product-only sub-admin with tool taxonomy

## Goal and approved behavior

Add a separate `product_manager` role, presented in the admin interface as **Product Sub-admin**. This role may create products and categories, but may not modify or delete existing products or categories, nor access store administration outside those creation tasks. New products and categories go live immediately, as requested.

The relevance guard is the approved tool taxonomy: the current active categories are root categories; only a full admin may add or alter roots. A product manager may create a category only as a direct subcategory of an active root. A product-manager-created product must use an active root or direct subcategory. These rules must be enforced by Supabase RLS/database logic, not just by the UI.

The product manager may create a new product with product content, images, specifications, and its initial stock quantity. The creation operation is atomic and records any opening stock movement. After creation, the product manager cannot edit or delete that product or adjust its stock; those operations remain with a full admin. Product images can be uploaded only to the signed-in user's own folder in the existing product-images bucket.

The role may open only `/admin/products` and `/admin/categories`. It must be redirected away from the dashboard, orders, inventory, customers, settings, and any other admin route. Existing full-admin capabilities remain unchanged.

## Implementation approach

- Add `product_manager` to the existing PostgreSQL role enum in its own migration, then add a second migration for category hierarchy, product attribution, a database taxonomy predicate, an atomic create-product RPC, and role-scoped RLS policies for categories, products, images, specifications, and image Storage uploads.
- Update generated Supabase TypeScript types to include the new role, `categories.parent_category_id`, `products.created_by`, and the create-product RPC.
- Extend the admin route guard to distinguish full admins from product managers and restrict product managers to the Products and Categories routes. Filter the navigation accordingly.
- Keep the existing TNT Tools industrial dark/orange visual language. Adapt the existing product form for product-manager create-only use, and the category form for subcategory-only creation; leave full-admin editing and management intact.
- Reuse the current TanStack Start, Supabase client, React Query, and existing product/category pages; add no new external service or dependency.

## Project structure

- `src/routes/admin/route.tsx`: role-aware admin guard, route restrictions, and role-filtered navigation.
- `src/routes/admin/products.tsx`: existing full-admin product management plus a constrained product-manager create flow.
- `src/routes/admin/categories.tsx`: existing full-admin category management plus product-manager subcategory creation.
- `src/integrations/supabase/types.ts`: generated schema and RPC types.
- `supabase/migrations/`: ordered role-enum and least-privilege policy/schema migrations.

## Constraints

The existing Supabase project is shared with production; migrations must be additive and narrowly scoped. Do not grant a role to an account until the user provides that person's exact Supabase sign-in email. The role system and policies may be implemented before account assignment, but the user remains the only admin until a specific account is authorized.
