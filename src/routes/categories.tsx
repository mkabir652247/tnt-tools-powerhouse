import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useShop } from "@/lib/shop-store";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Tool Categories — TNT Tools" },
      {
        name: "description",
        content:
          "Browse TNT Tools categories for professional power tools, water pumps, grinders, welders, compressors and workshop equipment.",
      },
      { property: "og:title", content: "Tool Categories — TNT Tools" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:description",
        content: "Browse categories of professional power tools and hardware equipment.",
      },
    ],
  }),
  component: Categories,
});

function Categories() {
  const {
    catalogCategories: categories,
    catalogProducts: products,
    catalogLoading,
    catalogError,
    catalogCategoriesLoading,
    catalogCategoriesError,
  } = useShop();

  return (
    <div className="container-tnt py-12">
      <p className="eyebrow">Shop by Category</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">Every Trade Covered</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        From single-tool upgrades to fitting out a full workshop, each category is stocked with
        equipment we would put on our own sites.
      </p>
      {catalogError && !catalogLoading && (
        <p role="alert" className="mt-5 text-sm text-destructive">
          Product counts couldn’t be loaded right now. You can still browse the categories.
        </p>
      )}

      {catalogCategoriesLoading ? (
        <p role="status" className="mt-10 text-sm text-muted-foreground">
          Loading categories…
        </p>
      ) : catalogCategoriesError ? (
        <p role="alert" className="mt-10 text-sm text-destructive">
          Categories couldn’t be loaded. Please refresh the page and try again.
        </p>
      ) : categories.length === 0 ? (
        <p role="status" className="mt-10 text-sm text-muted-foreground">
          No active categories are available yet.
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {categories.map((c) => {
            const count = products.filter((p) => p.category === c.slug).length;
            return (
              <Link
                key={c.slug}
                to="/shop"
                search={{ category: c.slug }}
                className="card-tool group min-w-0 overflow-hidden"
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src={c.image}
                    alt={c.name}
                    loading="lazy"
                    decoding="async"
                    width={1024}
                    height={1024}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <div className="p-3 sm:p-5">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 sm:items-center sm:gap-3">
                    <h2 className="min-h-10 break-words font-display text-sm font-extrabold leading-tight transition-colors group-hover:text-primary sm:min-h-0 sm:text-lg">
                      {c.name}
                    </h2>
                    <span className="shrink-0 rounded-sm border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      {catalogLoading || catalogError ? "—" : count}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                    {c.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-[10px] font-bold uppercase text-primary sm:text-xs sm:tracking-wider">
                    Shop category <ArrowRight width={14} height={14} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
