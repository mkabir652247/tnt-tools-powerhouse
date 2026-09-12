import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import {
  brands,
  categories,
  discountPercent,
  formatPrice,
  maxPrice,
  productTypes,
  products,
  type Product,
} from "@/data/products";
import { ProductCard } from "@/components/site/ProductCard";
import { QuickView } from "@/components/site/QuickView";

type ShopSearch = {
  q?: string | undefined;
  category?: string | undefined;
  sort?: string | undefined;
  max?: number | undefined;
  brand?: string | undefined;
  rating?: number | undefined;
  type?: string | undefined;
  inStock?: boolean | undefined;
};

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => ({
    q: search["q"] ? String(search["q"]) : undefined,
    category: search["category"] ? String(search["category"]) : undefined,
    sort: search["sort"] ? String(search["sort"]) : undefined,
    max: search["max"] ? Number(search["max"]) : undefined,
    brand: search["brand"] ? String(search["brand"]) : undefined,
    rating: search["rating"] ? Number(search["rating"]) : undefined,
    type: search["type"] ? String(search["type"]) : undefined,
    inStock: search["inStock"] ? Boolean(search["inStock"]) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop Power Tools & Equipment — TNT Tools" },
      {
        name: "description",
        content:
          "Browse drills, water pumps, grinders, welders and compressors. Filter by category, price, brand, rating and availability.",
      },
      { property: "og:title", content: "Shop Power Tools & Equipment — TNT Tools" },
      {
        property: "og:description",
        content: "Filter professional tools by category, price, brand, rating and availability.",
      },
    ],
  }),
  component: Shop,
});

const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
  { value: "discount", label: "Biggest Discount" },
];

function Shop() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [quick, setQuick] = useState<Product | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const priceCap = search.max ?? maxPrice;

  const update = (patch: Partial<ShopSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }) });

  const filtered = useMemo(() => {
    const term = (search.q ?? "").trim().toLowerCase();
    let list = products.filter((p) => {
      if (term && !`${p.name} ${p.spec} ${p.brand} ${p.category}`.toLowerCase().includes(term))
        return false;
      if (search.category && p.category !== search.category) return false;
      if (search.brand && p.brand !== search.brand) return false;
      if (search.type && p.type !== search.type) return false;
      if (search.rating && p.rating < search.rating) return false;
      if (search.inStock && !p.inStock) return false;
      if (p.price > priceCap) return false;
      return true;
    });

    switch (search.sort) {
      case "price-asc":
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list = [...list].sort((a, b) => b.rating - a.rating);
        break;
      case "discount":
        list = [...list].sort((a, b) => discountPercent(b) - discountPercent(a));
        break;
      default:
        break;
    }
    return list;
  }, [search, priceCap]);

  const activeCategory = categories.find((c) => c.slug === search.category);

  const filterPanel = (
    <div className="flex flex-col gap-6">
      <FilterGroup title="Category">
        <ul className="space-y-1.5 text-sm">
          <li>
            <FilterButton
              active={!search.category}
              onClick={() => update({ category: undefined })}
              label="All categories"
            />
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <FilterButton
                active={search.category === c.slug}
                onClick={() => update({ category: c.slug })}
                label={c.name}
              />
            </li>
          ))}
        </ul>
      </FilterGroup>

      <FilterGroup title="Max Price">
        <input
          type="range"
          min={5000}
          max={maxPrice}
          step={500}
          value={priceCap}
          onChange={(e) => update({ max: Number(e.target.value) })}
          className="w-full accent-[var(--primary)]"
          aria-label="Maximum price"
        />
        <p className="mt-1 text-sm text-muted-foreground">Up to {formatPrice(priceCap)}</p>
      </FilterGroup>

      <FilterGroup title="Brand">
        <ul className="space-y-1.5 text-sm">
          <li>
            <FilterButton
              active={!search.brand}
              onClick={() => update({ brand: undefined })}
              label="All brands"
            />
          </li>
          {brands.map((b) => (
            <li key={b}>
              <FilterButton
                active={search.brand === b}
                onClick={() => update({ brand: b })}
                label={b}
              />
            </li>
          ))}
        </ul>
      </FilterGroup>

      <FilterGroup title="Product Type">
        <ul className="space-y-1.5 text-sm">
          <li>
            <FilterButton
              active={!search.type}
              onClick={() => update({ type: undefined })}
              label="All types"
            />
          </li>
          {productTypes.map((t) => (
            <li key={t}>
              <FilterButton
                active={search.type === t}
                onClick={() => update({ type: t })}
                label={t}
              />
            </li>
          ))}
        </ul>
      </FilterGroup>

      <FilterGroup title="Rating">
        <div className="flex flex-wrap gap-2">
          {[4, 4.5, 4.8].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => update({ rating: search.rating === r ? undefined : r })}
              className={`rounded-sm border px-3 py-1.5 text-xs font-semibold transition-colors ${
                search.rating === r
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary"
              }`}
            >
              {r}+ stars
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Availability">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!search.inStock}
            onChange={(e) => update({ inStock: e.target.checked || undefined })}
            className="h-4 w-4 accent-[var(--primary)]"
          />
          In stock only
        </label>
      </FilterGroup>

      <button
        type="button"
        onClick={() =>
          navigate({
            search: {},
          })
        }
        className="btn-ghost-outline w-full text-xs"
      >
        Reset Filters
      </button>
    </div>
  );

  return (
    <div className="container-tnt py-10">
      <nav className="text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">
          Home
        </Link>{" "}
        / <span className="text-foreground">Shop</span>
        {activeCategory && <> / <span className="text-primary">{activeCategory.name}</span></>}
      </nav>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl sm:text-4xl">{activeCategory ? activeCategory.name : "All Tools"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {filtered.length} product{filtered.length === 1 ? "" : "s"} available
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="btn-ghost-outline shrink-0 px-4 py-2 text-xs lg:hidden"
        >
          <SlidersHorizontal width={14} height={14} /> Filters
        </button>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-lg border border-border bg-surface p-5">
            {filterPanel}
          </div>
        </aside>

        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              value={search.q ?? ""}
              onChange={(e) => update({ q: e.target.value || undefined })}
              placeholder="Search products…"
              aria-label="Search products"
              className="field-tnt sm:max-w-xs"
            />
            <select
              value={search.sort ?? "featured"}
              onChange={(e) => update({ sort: e.target.value })}
              aria-label="Sort products"
              className="field-tnt sm:ml-auto sm:w-56"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <p className="mt-16 text-center text-muted-foreground">
              No products match these filters. Try widening your search.
            </p>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} onQuickView={setQuick} />
              ))}
            </div>
          )}
        </div>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-[65] lg:hidden">
          <div className="absolute inset-0 bg-background/85" onClick={() => setFiltersOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[85%] max-w-sm overflow-y-auto border-r border-border bg-surface p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold uppercase">Filters</h2>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                aria-label="Close filters"
                className="grid h-9 w-9 place-items-center rounded-sm border border-border"
              >
                <X width={18} height={18} />
              </button>
            </div>
            {filterPanel}
          </div>
        </div>
      )}

      <QuickView product={quick} onClose={() => setQuick(null)} />
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left transition-colors ${
        active ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
