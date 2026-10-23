# TNT Tools storefront performance audit — 2026-10-23

## Executive finding

I reproduced a long wait in the Lovable share-preview and traced the main delay to **preview JavaScript delivery/startup**, not slow Supabase SQL. On the observed preview host, the first load fetched **186 separate JavaScript modules** (185 from the project host), totaling **2,823,854 encoded bytes / 2,879,354 transferred bytes**. These include development-runtime assets such as `index.dev.js`, React Refresh, and individual `.tsx` source modules. The last app modules completed at **23.481 s** after navigation; only then did the app start its Categories and Products REST requests at **23.626 s**.

The Categories and Products requests started together and both returned HTTP 200 about **1.12 s** later. Product images and specifications also returned HTTP 200; no catalog REST errors appeared in the recent Supabase log window. This makes the share-preview's unbundled development module waterfall the strongest measured cause of the apparent delay. The exact delay will vary with browser, cache, device, and network; this sandbox sample was slower than the reported 7–8 seconds.

I also checked the likely production address `https://tnt-power-hub.lovable.app/`: it currently displays **“Project not found”** and **“Publish or update your Lovable project for it to appear here.”** The project has not been published to that default public domain. The code is synced to preview, but a published production build is the needed next step for customer-facing speed testing.

**No app-code change, database write, Storage operation, or Lovable Publish action was made in this follow-up.** I will not publish the store without your explicit go-ahead.

## Reproduced browser evidence

The measured route was the project’s Lovable-managed share-preview host, which serves the same preview shown through the `lovable.dev/share-preview/...` link.

| Measurement                                |                                   Result |
| ------------------------------------------ | ---------------------------------------: |
| Document response start                    |                                 4,296 ms |
| First Contentful Paint                     |                                 5,624 ms |
| Window load event                          |                                 9,327 ms |
| JavaScript module requests                 | 186 total: 185 project-host + 1 external |
| JavaScript encoded / transferred bytes     |              2,823,854 / 2,879,354 bytes |
| First script start                         |                                 4,304 ms |
| Last app modules finished                  |                                23,481 ms |
| Categories and Products request start      |                    23,626 ms, concurrent |
| Categories and Products response           |           HTTP 200, ~1,124/1,125 ms each |
| Product images response                    |                        HTTP 200, ~286 ms |
| Specifications response                    |                        HTTP 200, ~813 ms |
| Catalog REST errors in this browser sample |                                        0 |

At the sample’s initial page capture, the hero and page shell were visible but the UI still displayed “Loading categories…” and “Loading products…”. A later capture showed four categories and product cards after the requests completed. The gap is before the Supabase requests, while the preview’s module graph is being fetched and executed.

A fresh 24-hour Supabase log aggregate supports that distinction:

| Endpoint       | GETs | p50 origin time | p95 origin time |  Maximum | HTTP errors |
| -------------- | ---: | --------------: | --------------: | -------: | ----------: |
| Products       |   59 |          365 ms |          853 ms | 1,018 ms |           0 |
| Categories     |   57 |          370 ms |        1,021 ms | 1,145 ms |           0 |
| Product images |   56 |          220 ms |          634 ms | 1,157 ms |           0 |
| Specifications |   56 |          257 ms |          968 ms | 1,173 ms |           0 |

These are server-side gateway origin times, not full browser timings. The read-only database plans are still about **0.3–1.2 ms** execution time, so database indexing/RLS changes are not justified as a fix for this symptom. Supabase advisors flag policy-optimization opportunities, but the measured catalog query plans and request logs do not implicate them in a 7–8 second wait. I made no RLS changes.

## Why preview is slower than production

Lovable’s project share-preview is a development environment. It serves many individual source modules and development runtime code instead of a small number of production-optimized bundles. The current repository’s local production build generated **49 JavaScript assets totaling 861,422 bytes** (all routes combined; the homepage loads only a subset). This is a different, optimized artifact from the preview’s 186-request module graph, so it is not a strict same-route benchmark, but it confirms production packaging is materially smaller and avoids the same development-module waterfall.

The browser-level root of this delay is therefore not the number of product rows or oversized images: Categories and Products requests begin only after the preview’s app modules finish. Compressing/removing large Storage images can improve photo download time once image URLs are requested, but it cannot move that initial API-request start earlier.

## Query dependencies in the app

The current app starts its category and base-product queries concurrently. Product cards are then held until both finish because the base loader uses the active categories to filter products and map category slugs. The separate images/specification query runs only after the base catalog is available and no longer blocks product cards. Categories cards themselves wait only for the category request.

This dependency can make products wait for the slower of the Categories and Products responses, but the requests are not serial and observed gateway p95 values are around one second. It does not explain the measured 14-second gap between the final development modules and the API start. I found no justified source-code change that would fix the main observed share-preview delay more safely than testing the published production build.

## Earlier work and preserved measurements

- Commit `2bef681` separates core catalog rows from image/specification metadata, adds neutral pending-image placeholders, and corrects the Shop loading count. The preview served the updated Shop bundle in earlier tests; cards were visible while ancillary metadata was still loading.
- Before/after preview navigation runs had material network/cache variance and were not a controlled end-to-end speed comparison. The earlier report’s home/category/shop milestones are retained here only as context, not proof of a customer-side speedup.
- The live database previously had 42 active products, 4 active categories, 98 product-image rows, and 149 specification rows. Read-only active category/product query execution measured 1.170 ms / 0.296 ms in the latest plan (earlier samples 0.142 / 0.276 ms).
- The separate Storage audit found 64 objects totaling 115,516,412 bytes, of which 54 are referenced and 10 unreferenced. Three referenced originals exceed 5 MiB (largest 10,250,539 bytes). The full-admin replacement/removal workflow is still pending an authorized admin run; it is a separate image-byte optimization, not the cause of the delayed data-request start.
- The Product Sub-admin authorization-header fix is in GitHub history, but the existing-product edit/delete flow still needs confirmation in the updated Lovable app.

## What to do next

1. Open the **TNT Tools Powerhouse** project in Lovable and use the **Publish** button at the top-right. Review the production URL Lovable presents; publish/update only when you are ready for the site to be publicly accessible. The project has not been published by me.
2. Test the published `*.lovable.app` or custom-domain URL on your phone—not the `lovable.dev/share-preview/...` link. The default `tnt-power-hub.lovable.app` address is presently unpublished, so use the URL Lovable assigns during Publish if it differs.
3. If the published site still takes 7–8 seconds, send me the exact public URL and a phone Network screenshot/timing. Then I can measure that production host rather than the development preview.
4. Separately, a signed-in full admin can run the existing safe image replacement/removal action to reduce oversized photo payloads. This may improve photo appearance, but it is not the fix for the preview’s pre-API module waterfall.

Build, TypeScript, ESLint, formatting, and diff checks for the earlier app change passed; ESLint had 0 errors and 1 warning in `src/lib/shop-store.tsx`. No production publish was executed during this audit.
