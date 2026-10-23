### Shop loading-state correction

The local Shop route now displays “Loading products…” rather than “0 products available” while the base catalog query is pending. It switches to the real filtered count when that query resolves; this changes no database query, filter, sort, or product data.
