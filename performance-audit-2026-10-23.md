# TNT Tools storefront performance audit — 2026-10-23

## Executive summary

The evidence does **not** show a multi-second Supabase SQL bottleneck. Read-only database plans complete in about 0.3–1.2 ms, and recent Supabase gateway p95 origin times for catalog endpoints are below one second. In the baseline browser runs, the old loader waited for categories/products and then for a second image/specification request wave before product cards could render. Lazy route chunks also finished just before the catalog requests began. These serial stages can add delay on mobile networks, but the sandbox browser did not reproduce the reported 8–10 seconds.

I split core product/category data from image/specification metadata so cards can render first, added neutral image placeholders during metadata loading, and corrected the Shop count to say “Loading products…” instead of briefly showing a false zero. The app code was committed and pushed to GitHub `main` as **`2bef681`**; the preview has now been confirmed on a new Shop bundle. No Lovable Publish action was used.

The updated browser run confirms the intended progressive behavior—cards are visible while the image/specification notice is still present—but does **not** establish an end-to-end speedup. The before/after runs have materially different navigation/API timings, and the Shop route was slower overall in the post-sync sample. A controlled repeat on the user’s actual mobile connection is still needed to judge the reported 8–10 seconds.

## Live data and database evidence

At the time of the read-only audit, the database contained 42 active products, 4 active categories, 98 product-image rows, and 149 specification rows. Read-only `EXPLAIN ANALYZE` measured the active category query at **1.170 ms** execution time (**1.295 ms** planning) and the active product query at **0.296 ms** execution (**1.603 ms** planning). Earlier execution samples were 0.142 ms for categories and 0.276 ms for products. These plans are not browser/API timings, but they provide no evidence that SQL execution explains an 8–10 second wait.

Supabase gateway logs for the primary Lovable preview during the sampled recent period showed:

| Endpoint       | Requests | p50 origin time | p95 origin time | Maximum |
| -------------- | -------: | --------------: | --------------: | ------: |
| Categories     |       32 |        376.5 ms |        880.5 ms |  967 ms |
| Products       |       35 |          371 ms |        938.1 ms |  957 ms |
| Product images |       32 |          190 ms |        534.2 ms |  558 ms |
| Specifications |       32 |          193 ms |        403.4 ms |  467 ms |

These are Supabase gateway origin times, **not** full browser request, JavaScript startup, image decode, or page-render measurements.

## Browser measurements

The baseline and post-sync tests were taken in the same authenticated sandbox browser, but across separate navigations with variable cache/network conditions. Many shared assets were cached in the baseline. Values are milliseconds from navigation start; API end times are the relevant response milestones. “Core ready” is the later of the category and product responses. Exact first-card DOM insertion was not instrumented, so core-ready is a proxy; in the updated Shop screenshot, the cards were visible while the metadata-loading notice was still present.

| Route        | Run      | Response start / FCP | Categories + products                           | Images/specifications                    | Observation                                                                                                                                                  |
| ------------ | -------- | -------------------- | ----------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Home `/`     | Baseline | 1,899 / 3,156        | Started 3,781; products 5,039; categories 5,038 | Started 5,092; specs 5,367; images 5,436 | Old sequential loader’s data-ready boundary was about 5.44 s. Eight featured cards were present in a later inspection.                                       |
| Home `/`     | Updated  | 1,619 / 1,884        | Started 2,444; products 2,738; categories 3,212 | Started 3,279; specs 3,588; images 3,622 | Core data was ready at about 3.21 s; metadata finished later. Categories remain before Featured Products.                                                    |
| Categories   | Baseline | 722 / 924            | Started 1,779; products 2,369; categories 2,686 | Started 2,689; specs 3,027; images 3,036 | Four category cards were visible after the category data arrived.                                                                                            |
| Categories   | Updated  | 584 / 784            | Started 1,433; products 1,688; categories 1,721 | Started 1,741; specs 2,067; images 2,236 | Four category cards displayed; they did not wait for image/specification rows.                                                                               |
| Shop `/shop` | Baseline | 808 / 1,044          | Started 1,930; categories 2,234; products 2,239 | Started 2,257; images 2,550; specs 2,595 | 42 products after load; the old UI briefly showed a zero count while the query was pending.                                                                  |
| Shop `/shop` | Updated  | 2,181 / 3,328        | Started 3,466; products 3,775; categories 4,346 | Started 4,475; images 4,762; specs 4,794 | 42 cards were visible with neutral placeholders while the metadata notice was displayed. Core-ready was about 4.35 s, metadata completed about 0.45 s later. |

The baseline route chunks were also late relative to the app shell: the Categories chunk took about **845 ms** (start 881 ms, end 1,726 ms), and the old Shop chunk about **899 ms** (start 969 ms, end 1,868 ms), completing just before their API calls. On the baseline homepage, FCP preceded category/product requests by about 625 ms. This points to client startup/request sequencing in addition to Supabase response time.

The updated Shop route loaded a different hashed chunk, **`shop-ll0_gTPD.js`**, rather than the pre-change **`shop-C_tuc0VJ.js`**. A fresh load also showed 42 product cards with the “Loading product photos and specifications” notice and neutral image placeholders, confirming the progressive UI reached the preview. An earlier reload had still returned the old chunk; that transient stale run is excluded from the valid after measurements above.

### What the before/after does—and does not—show

The updated homepage reached the core-response boundary at 3.21 s versus the old loader’s 5.44 s data-ready boundary; the Categories data boundary was 1.72 s versus 2.69 s; the Shop core boundary was 4.35 s versus the old full-data boundary of 2.60 s. These raw differences are **not** a controlled causal comparison: the updated Shop requests began about 1.54 s later and its category request took about 0.88 s instead of 0.30 s, while the updated homepage request wave started about 1.34 s earlier. Browser/network/cache variance is substantial. The updated screenshots confirm that cards are no longer held for ancillary metadata, but exact first-card insertion time and a repeat on the user's actual mobile connection remain outstanding. Do not claim a measured end-to-end speedup from these runs.

On the baseline homepage, eight product image elements were present. Six lazy same-origin product images loaded at about 55–71 KB each (1024×1024); no `product-images` Supabase Storage object was downloaded during that sample. Thus, the oversized Storage objects remain a separate optimization target, but they did not account for the first-card delay on that particular homepage run.

## Changes made

- Split catalog loading so category/core product data is fetched independently from per-product image/specification metadata. Product cards can render as soon as the core data is ready instead of waiting for the second metadata wave.
- Fetch ancillary rows scoped to selected product IDs; keep cache invalidation compatible with product edits.
- Added neutral pending-image placeholders across cards, quick view, product detail, cart, and wishlist. Existing category-image fallback remains for products confirmed to have no uploaded image. A metadata-query error no longer blocks the core listing and is surfaced as a non-blocking warning.
- Kept specification-based search available after details arrive and added a non-blocking notice while image/specification details are still loading.
- Changed the Shop count to “Loading products…” while the base catalog is pending, avoiding a misleading zero count.
- Existing homepage ordering and append-style “Show more” behavior were not changed.

The old sequence added a separate metadata wait of about **0.36 s** on the baseline Shop run and about **0.40 s** on the baseline homepage run. The post-sync Shop run likewise showed metadata finishing about **0.45 s** after core data. These are measured request gaps, not proof of total page-load improvement.

## Existing image cleanup and remaining work

The separate read-only Storage audit found 64 objects totaling 115,516,412 bytes: 54 objects referenced by products (114,747,660 bytes) and 10 unreferenced objects. Three referenced objects exceed 5 MiB; the largest is 10,250,539 bytes. No image object was modified or deleted during this performance task. The existing full-admin workflow uploads optimized replacements, changes references only after upload success, and removes an original only when it exceeds 5 MiB and a fresh database check confirms zero remaining references. It leaves the ten unreferenced objects untouched. A full admin still needs to run that action while signed in.

The Product Sub-admin authorization-header fix is in the pushed code history, but its original-product edit/delete path still needs confirmation in the updated Lovable app.

## Validation and release status

The project build passed, `npx tsc --noEmit` passed, ESLint reported **0 errors and 1 warning** (`react-refresh/only-export-components` in `src/lib/shop-store.tsx`), and Prettier/diff checks passed. App commit `2bef681` was pushed to GitHub `main`; documentation is maintained in later commits. No production database writes, schema changes, Storage replacements/deletions, or Lovable Publish action were performed in this audit.

The alternate `lovableproject.com` alias returned a proxy 404 after sign-in, but the primary Lovable preview and project editor loaded. Lovable Settings → Git states that the project syncs with GitHub in both directions; a fresh preview load later confirmed the new Shop bundle. No publish action was used.

## Next steps

1. Repeat the same browser timings on the user's actual mobile connection, recording warm/cold cache state and directly capturing the first product-card insertion rather than using core-response completion as a proxy.
2. Compare several runs before considering route prefetch/startup work or API/network delivery changes. Do not add indexes or weaken RLS without new evidence.
3. Separately, a signed-in full admin can run the safe image-replacement/oversized-original cleanup; this reduces bytes on pages that use those Storage objects, but should not be presented as the fix for category-query latency.
4. Verify the Product Sub-admin's existing-product edit/delete flow against the earlier `Unauthorized: No authorization header provided` message.
