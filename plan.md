# Plan: TNT Tools homepage and catalog loading

## Approved behavior

The homepage renders Categories before Featured Products. Featured Products shows up to eight items initially; “Show more” appends every product not yet displayed after the visible featured items, without restarting the list or duplicating products. “Show less” returns to the initial featured preview. If no products are featured but products exist, shoppers can still expand to browse the full catalog.

Active categories load in their own cached query, so they are usable independently from product images/specifications. The category request is shared with the base catalog loader to avoid a duplicate database call. Only active roots and direct active children of active roots are storefront categories/products. A valid read-only check found no active children beneath inactive roots and no active products in those categories. During a category request or an error, the UI does not present seed/demo categories as if they were live links; it shows loading, empty, and error states. The Categories page does not show zero product counts as final while product data is pending or unavailable.

## Performance diagnosis and constraints

On October 23, 2026, a read-only live check found **42 active products**, **4 active categories**, **98 product-image rows**, and **149 specification rows**. Earlier database-only `EXPLAIN ANALYZE` measured the active category query at 0.142 ms and the active product query at 0.276 ms. The live dataset and database plan do not indicate a table-size bottleneck.

Recent Supabase gateway logs for the primary Lovable preview reported origin-time medians/p95s of: categories **376.5/880.5 ms** (32 GETs), products **371/938.1 ms** (35), product-image metadata **190/534.2 ms** (32), and specifications **193/403.4 ms** (32). These gateway origin times are not full browser navigation or first-card timings. The previous client loader waited for products/categories and then for image/specification rows before releasing any product cards, creating two dependent request phases. A sum of route-level p95 values is only an illustration, not an observed page-load duration.

Recent public Storage logs showed 48 successful image GETs with median size 1,898,860 bytes, p95 5,228,257 bytes, and maximum 10,250,539 bytes. Storage service response time (median 102 ms, p95 415 ms) is not the complete customer download time. Lazy loading limits eager image requests, but multi-megabyte stored images remain a likely cause of slow image appearance on mobile networks.

A current read-only Storage count found **64 objects / 115,516,412 bytes**, of which **54 are referenced** (**114,747,660 bytes**) and **10 are unreferenced**. Three referenced objects exceed 5 MiB; the largest is 10,250,539 bytes. No objects were changed by this audit. Keep the ten unreferenced objects untouched. The existing image conversion/removal action remains pending until a full admin explicitly runs it; it updates references first and deletes only over-5-MiB originals after verifying they have no remaining reference.

The authenticated browser baseline and post-sync route timings are recorded in `performance-audit-2026-10-23.md`; neither reproduced the reported 8–10 seconds. A fresh Lovable load served the new Shop bundle from commit `2bef681` and showed product cards while ancillary image/specification data was still loading. The runs had materially different navigation/API timings, so they do not establish an end-to-end speedup. A controlled repeat and exact first-card insertion timing on the user's mobile connection remain open.

## Implemented low-risk catalog improvement

Core product/card fields now load in a base catalog query; product images and specifications load in a separate query keyed only to the selected active, visible product IDs. Cards can render before that ancillary request finishes. Square neutral placeholders prevent the temporary category fallback from looking like an incorrect product photo. On successful detail loading, existing images/specifications and the category fallback for genuinely image-less products are preserved. On a detail-query error, product listings remain available and the main catalog/product pages show a warning. Existing query invalidation prefixes still cover both layers.

This code change does not alter RLS, schema, data, image objects, product/category ordering, client-side filters/sorting, prices/stock, or append-style Show more behavior. Commit `2bef681` is pushed to GitHub `main` and its bundle was confirmed in Lovable preview; Lovable Publish was not used. See [performance-audit-2026-10-23.md](performance-audit-2026-10-23.md) for the detailed measurements and validation record.

## Image handling requirements

Optimize each referenced Storage URL by decoding it, fitting the entire image inside a transparent square with a longest edge of at most 1600 px (never crop or distort, and never upscale), converting to WebP at quality 0.84, uploading a new UUID-named object under the authorized admin's own Storage folder, then updating only its database URL references. After successful upload and an exact reference-count check, delete the source object only when it is larger than 5 MiB; keep smaller sources for rollback and leave external URLs and unreferenced Storage objects alone. New product uploads have a 5 MiB source-file cap and must be square 1:1 within a 5% tolerance; unsupported dimension decoding or out-of-range ratios are rejected before upload. Accepted images are padded into an exact square canvas no larger than 1600×1600 and encoded to WebP. The processed object and the Storage bucket both enforce a maximum of 5 MiB. Continue using immutable cache headers and the same admin-only, own-folder upload permissions.

Supabase's public image-transformation endpoint is disabled for this tenant, so existing-image conversion uses a full-admin-only batch action in the signed-in product panel. It processes unique Storage URLs sequentially, shows progress and total bytes saved, and deletes only originals over 5 MiB after their references are switched and verified unused; originals at or below 5 MiB remain. The action is idempotent for objects it has already converted. Product Sub-admins retain their existing product permissions and cannot run this cross-catalog image maintenance action.

## Implementation and structure

- `src/routes/index.tsx`: Categories-before-Featured order and append-only product expansion; core products now appear before ancillary details finish.
- `src/lib/catalog.ts`: independent active-category loader, base product loader, and product-ID-scoped image/specification loader.
- `src/lib/shop-store.tsx`: React Query orchestration for category/base/details requests; product loading state tracks the base catalog, and existing invalidation prefixes cover both layers.
- `src/routes/categories.tsx`: clear category loading/error/empty states and pending/unavailable product-count indicators.
- `src/routes/admin/products.tsx`: future uploads enforce file-size/aspect checks; full admins can run the existing-image replacement/removal action with progress and reference-safe cleanup.
- `src/lib/product-image-optimizer.ts` and `src/lib/product-image-batch-optimizer.ts`: browser-side square WebP conversion for strict new uploads and full-admin conversion of existing images.
- `supabase/migrations/20261022124000_limit_product_image_size_to_5_mib.sql`: reduce the existing product-images bucket maximum from 10 MiB to 5 MiB (applied to the live project).
- Keep the TNT Tools design, TanStack Start, React Query, and Supabase stack. Make no production image rewrite or deletion without an explicit authorized admin run.

**Database timing refresh (October 23):** a fresh read-only bounded EXPLAIN measured active-category execution at 1.170 ms and active-product execution at 0.296 ms (planning: 1.295 ms and 1.603 ms). Earlier samples were 0.142 ms and 0.276 ms. The database work remains negligible compared with the observed gateway timings, but these do not measure browser navigation.
