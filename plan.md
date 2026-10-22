# Plan: TNT Tools homepage and catalog loading

## Approved behavior

The homepage renders Categories before Featured Products. Featured Products shows up to eight items initially; “Show more” appends every product not yet displayed after the visible featured items, without restarting the list or duplicating products. “Show less” returns to the initial featured preview. If no products are featured but products exist, shoppers can still expand to browse the full catalog.

Active categories load in their own cached query, so they are usable independently from product images/specifications. The category request is shared with the catalog loader to avoid a duplicate database call. Only active roots and direct active children of active roots are storefront categories/products. A live read-only check found zero currently active children beneath inactive roots and zero active products in those categories. During a category request or an error, the UI does not present seed/demo categories as if they were live links; it shows loading, empty, and error states. The Categories page does not show zero product counts as final while product data is pending or unavailable.

## Performance diagnosis and constraints

On October 22, 2026, the live TNT Tools database reported 42 active products and 4 active categories, with indexes present on `products.is_active`, product/category relationships, and product-image/specification lookups. This does not indicate a large database-row or missing-index bottleneck. The `product-images` Storage bucket has 62 objects, of which 54 referenced active product listings; those referenced objects total 114,747,660 bytes (about 115 MB), 35 are larger than 1 MB, and the largest is 10,250,539 bytes (about 10.3 MB). The previous uploader stored selected files unchanged up to the bucket's 10 MB limit, and product cards use original URLs, so large image payloads are a confirmed, high-confidence source of slow rendering. The uploader now resizes new files to at most 1600 px, WebP-compresses when supported, and sets long immutable cache headers. Existing Storage objects and references are not rewritten or deleted; existing oversized photos must be replaced/re-uploaded or served through enabled Supabase image transforms. Four active categories currently have no database image URL and two active products have no image rows; existing category/product fallback art remains in place.

## Implementation and structure

- `src/routes/index.tsx`: Categories-before-Featured order and append-only product expansion.
- `src/lib/catalog.ts`: independent active-category loader alongside the full catalog loader, sharing category data.
- `src/lib/shop-store.tsx`: category fetch/cache and category-specific loading/error state; no demo-category links during live loading.
- `src/routes/categories.tsx`: clear category loading/error/empty states and pending/unavailable product-count indicators.
- `src/routes/admin/products.tsx`: future uploads resize to 1600 px, convert to WebP where browser support permits, and receive one-year cache headers under unique Storage paths.
- Keep the TNT Tools design, TanStack Start, React Query, and Supabase stack; no database migrations or live media rewrites.
