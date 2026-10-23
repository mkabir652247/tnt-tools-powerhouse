# TNT Tools storefront performance audit — 2026-10-23

## Executive summary

The available evidence does **not** show a multi-second Supabase SQL bottleneck. Read-only database plans complete in about 0.3–1.2 ms, and recent Supabase gateway p95 response-origin times for catalog endpoints are below one second. In the authenticated preview browser, however, the homepage waited for categories/products and then for a second image/specification request wave before the old loader could render product cards. Lazy route chunks also completed just before those API requests began. These serial stages can add meaningful delay, especially on a slower mobile connection, but the sandbox browser did not reproduce the reported 8–10 seconds.

I changed the client to render the core product/category data before image and specification metadata, then load that metadata separately. I also changed the Shop count to say “Loading products…” rather than briefly showing a false zero. This is a targeted, non-destructive change; it does not alter catalog data, RLS, or database schema. The code and audit were committed and pushed to GitHub `main` as **`2bef681`**. No Lovable Publish action was used.

A valid post-change browser comparison is still blocked: after the push, the Lovable preview served the exact same Shop JavaScript asset fingerprint as the pre-change baseline. I therefore do **not** claim an end-to-end speedup. The updated code needs to be confirmed in the Lovable workspace/preview before the after-test can be completed.

## Live data and database evidence

At the time of the read-only audit, the database contained 42 active products, 4 active categories, 98 product-image rows, and 149 specification rows. Read-only `EXPLAIN ANALYZE` measured the active category query at **1.170 ms** execution time (**1.295 ms** planning) and the active product query at **0.296 ms** execution (**1.603 ms** planning). Earlier runs were also sub-millisecond for execution: 0.142 ms for categories and 0.276 ms for products. These plans are not browser/API timings, but they provide no indication that SQL execution itself explains an 8–10 second wait.

Supabase gateway logs for the primary Lovable preview during the sampled recent period showed:

| Endpoint       | Requests | p50 origin time | p95 origin time | Maximum |
| -------------- | -------: | --------------: | --------------: | ------: |
| Categories     |       32 |        376.5 ms |        880.5 ms |  967 ms |
| Products       |       35 |          371 ms |        938.1 ms |  957 ms |
| Product images |       32 |          190 ms |        534.2 ms |  558 ms |
| Specifications |       32 |          193 ms |        403.4 ms |  467 ms |

These are Supabase gateway origin times, **not** full browser request, JavaScript startup, image decode, or page-render measurements.

## Authenticated browser baseline

The baseline was collected in the sandbox browser after Lovable sign-in. It is a single browser session with some assets already cached—not a clean-cache test on the user’s phone. Values below are relative to navigation start unless specified.

| Route        | Browser milestones                                                              | Data milestones                                                                                                                                                                                                                                                                                 |
| ------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Homepage `/` | Response start 1,899 ms; FCP 3,156 ms; DOMContentLoaded 5,004 ms; load 5,301 ms | Categories/products requests started at 3,781 ms and ended at 5,038–5,039 ms. Image/specification requests then started at 5,092 ms and ended at 5,367–5,436 ms. The old loader’s data-ready boundary for product cards was therefore about 5.44 s; exact first DOM insertion was not captured. |
| Categories   | Response start 722 ms; FCP 924 ms                                               | Categories and products started at 1,779 ms; category response ended at 2,686 ms and product response at 2,369 ms. Category cards were present; ancillary image/specification requests ended around 3.03 s.                                                                                     |
| Shop `/shop` | Response start 808 ms; FCP 1,044 ms; DOMContentLoaded 1,006 ms                  | Categories/products started at 1,930 ms and ended at 2,234–2,239 ms. Image/specification requests ended at 2,550–2,595 ms. The route showed 42 products after loading.                                                                                                                          |

The route JavaScript chunks were requested after the initial app shell and completed just before the catalog requests: the Categories chunk took about **845 ms** (start 881 ms, end 1,726 ms); the Shop chunk took about **899 ms** (start 969 ms, end 1,868 ms). On the homepage, FCP preceded the category/product requests by about 625 ms. This indicates client startup and request sequencing contribute alongside network latency.

On the measured homepage, eight product image elements were present. Six lazy same-origin product images were fetched at about 55–71 KB each (1024×1024); no `product-images` Supabase Storage object was downloaded during that sample. Thus the oversized Storage objects remain a separate optimization target, but they did not account for the first-card delay on this particular homepage run. The screenshot’s temporary “0 products available” on Shop was also a UI loading-state issue: the count was derived from an empty array while the catalog request was still pending.

## Changes made

- Split catalog loading so category/core product data is fetched independently from per-product image/specification metadata. Product cards can render as soon as the core data is ready instead of waiting for the second metadata wave.
- Fetch ancillary rows scoped to the selected product IDs; keep cache invalidation compatible with product edits.
- Added neutral pending-image placeholders across cards, quick view, product detail, cart, and wishlist. Existing category-image fallback remains for products confirmed to have no uploaded image. Errors in the metadata request no longer block the core listing and are surfaced as a non-blocking warning.
- Kept specification-based search available after the details request completes and added a non-blocking notice while image/specification details are still loading.
- Changed the Shop product-count label to “Loading products…” while the base catalog is pending, avoiding a misleading zero count.
- Existing homepage ordering and “Show more” append behavior were not changed.

The baseline measurements suggest that bypassing the ancillary request wave could remove roughly **0.36–0.40 seconds** from the old data-ready critical path on those particular runs (Shop: 2.595 − 2.239 s; homepage: 5.436 − 5.039 s). This is an estimate of the stage removed from the old sequence—not a measured post-change improvement and not a guarantee on another network.

## Lovable sync and post-push verification

GitHub `main` was verified at commit `2bef681`. Lovable Settings → Git stated that the project syncs with GitHub in both directions, but that page did not identify the linked repository/branch or show the imported commit. After the push, the Shop preview still loaded `shop-C_tuc0VJ.js`, the exact fingerprint seen before the push. The updated Shop label was therefore not verified in the preview.

A post-push Shop load recorded response start at 2,300 ms, FCP at 2,448 ms, core category/product responses ending at 2,870–2,871 ms, and image/specification responses ending at 3,191–3,195 ms. It displayed 42 products, but because the route bundle was unchanged, this is **not a valid after measurement for commit `2bef681`**; its difference from the baseline may simply be network/cache variance.

The Lovable editor itself became accessible after sign-in. An alternate `lovableproject.com` host returned a proxy 404, but the primary project preview and editor loaded. No Publish button was used. Before a valid after-test, confirm that Lovable is connected to `mkabir652247/tnt-tools-powerhouse` on `main`, or otherwise sync/reload the project so the preview serves the pushed commit. Then repeat the same route measurements and, ideally, repeat on the user’s actual mobile connection with cache state recorded.

## Existing image cleanup and remaining work

The separate read-only Storage audit found 64 objects totaling 115,516,412 bytes: 54 objects referenced by products (114,747,660 bytes) and 10 unreferenced objects. Three referenced objects exceed 5 MiB; the largest is 10,250,539 bytes. No image object was modified or deleted in this performance task. The existing full-admin workflow uploads optimized replacements, changes references only after upload success, and removes an original only when it exceeds 5 MiB and a fresh database check confirms zero remaining references. It leaves the ten unreferenced objects untouched. A full admin still needs to run that action while signed in.

The project build passed, `npx tsc --noEmit` passed, ESLint reported **0 errors and 1 warning** (`react-refresh/only-export-components` in `src/lib/shop-store.tsx`), and Prettier/diff checks passed before the final report restoration. No production database writes, schema changes, or publication were made in this audit.

## Next steps

1. Confirm the Lovable Git connection points to the expected repository and branch, and that commit `2bef681` is reflected in the preview bundle.
2. Re-run homepage, Categories, and Shop browser timings against that updated bundle. Capture the first product-card insertion separately from FCP and record whether the browser cache is warm or cold. Repeat on the actual mobile connection to assess the reported 8–10 second case.
3. Only after that comparison, decide whether further work is warranted on route startup/prefetch or API/network delivery. Do not add indexes or weaken RLS without new evidence.
4. Separately, a signed-in full admin can run the safe image-replacement/oversized-original cleanup; this will reduce bytes on pages that use those Storage objects, but should not be presented as the fix for category-query latency.
5. After the Lovable sync, verify the Product Sub-admin’s existing-product edit/delete path against the prior `Unauthorized: No authorization header provided` screenshot.
