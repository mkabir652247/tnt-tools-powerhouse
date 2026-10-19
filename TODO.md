# TODO — Product Sub-admin and Homepage

- [x] **Maintain the Product Sub-admin's create-only category scope.** The existing `product_manager` role can create a category only as a direct subcategory of an existing active root category. New subcategories publish immediately. It cannot create roots, edit existing categories, or delete categories.

- [x] **Enforce the active tool taxonomy and immediate product publication.** A Product Sub-admin can create a product only in an active root or direct child category; a new product is active immediately and includes product details, images, specifications, and initial stock through the existing atomic create function.

- [x] **Check the category-delete option without adding a new control.** The current admin category page has no Delete button. Full admins have database-level direct-delete permission, but foreign keys block deleting categories referenced by products or subcategories; the latest delete RPC is service-role only. Product Sub-admins cannot delete categories.

- [x] **Show and expand homepage products.** Genuinely featured products appear before Categories, up to eight are shown initially, and “Show more” expands to the complete live catalog while “Show less” restores the featured preview. This was pushed to GitHub `main` in commit `74b410f`.

- [x] **Enable product editing and deletion for the existing `product_manager` role.** Product Sub-admins can edit products across the catalog: name/slug, descriptions, category within the active tool taxonomy, brand/SKU, prices, stock quantity/threshold, images, and specifications. Stock changes are audit-logged. They can delete products only when no order items reference them; product history is preserved. They cannot feature, hide, or publish-toggle products or edit/delete categories. Updates and deletions pass through the authenticated server function and its service-only RPCs; the browser never calls privileged RPCs directly. This permission belongs to the existing role, so it applies to all current and future `product_manager` holders.
