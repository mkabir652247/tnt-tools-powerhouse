import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { categories, products } from "@/data/products";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Tool Categories — TNT Tools" },
      {
        name: "description",
        content:
          "Explore TNT Tools categories: drill machines, water pumps, angle grinders, cutting tools, impact tools, welders, compressors and hand tools.",
      },
      { property: "og:title", content: "Tool Categories — TNT Tools" },
      {
        property: "og:description",
        content: "Nine categories of professional power tools and hardware equipment.",
      },
    ],
  }),
  component: Categories,
});

function Categories() {
  return (
    <div className="container-tnt py-12">
      <p className="eyebrow">Shop by Category</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">Every Trade Covered</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        From single-tool upgrades to fitting out a full workshop, each category is stocked with
        equipment we would put on our own sites.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => {
          const count = products.filter((p) => p.category === c.slug).length;
          return (
            <Link
              key={c.slug}
              to="/shop"
              search={{ category: c.slug }}
              className="card-tool group overflow-hidden"
            >
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src={c.image}
                  alt={c.name}
                  loading="lazy"
                  width={1024}
                  height={1024}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="p-5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <h2 className="truncate font-display text-lg font-extrabold transition-colors group-hover:text-primary">
                    {c.name}
                  </h2>
                  <span className="shrink-0 rounded-sm border border-border px-2 py-0.5 text-xs text-muted-foreground">
                    {count}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary">
                  Shop category <ArrowRight width={14} height={14} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
