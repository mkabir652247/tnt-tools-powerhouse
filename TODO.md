# TODO — Product Sub-admin and Homepage Follow-up

- [x] **Create a product-only role and enforce its baseline boundary in the app and database.** The live project has one `product_manager` assignment. The original create-only flow permits new products and subcategories, but not order, inventory, customer, settings, or role administration.

- [x] **Enforce the approved tool-taxonomy guard and immediate publication.** Product-manager-created categories must be direct children of existing active root categories; products must use an active root or direct child. New products and categories publish immediately.

- [x] **Check category deletion.** There is no delete option in the current admin category page. The live table policy permits full-admin direct deletion, but foreign keys block deleting categories referenced by products or subcategories. The latest category-delete RPC is callable only by `service_role`. Do not add a UI delete action without a separate request.

- [x] **Reorder and expand homepage products.** Display genuinely featured products before Categories, initially show up to eight, and add an inline “Show more” action that reveals the entire live catalog (with “Show less” to collapse). Keep existing sections and styling.

- [ ] **Clarify product edit/delete scope for the second sub-admin.** GitHub contains server-side product-manager update/delete functions, but the current product page exposes Edit/Delete only to full admins. Confirm whether to broaden `product_manager` for every holder or create a distinct role for the second person; specify whether edit access includes stock, featured status, and publish/hide controls. No role-policy changes until confirmed.

- [ ] **Confirm the second account and assign only the approved role.** The live database currently shows one `product_manager` assignment; the intended second account's exact Supabase sign-in email and role are not yet confirmed.
