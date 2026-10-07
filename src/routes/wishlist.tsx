import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { type Product } from "@/data/products";
import { ProductCard } from "@/components/site/ProductCard";
import { QuickView } from "@/components/site/QuickView";
import { useShop } from "@/lib/shop-store";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "Wishlist — TNT Tools" },
      { name: "description", content: "Tools you have saved for later at TNT Tools." },
      { property: "og:title", content: "Wishlist — TNT Tools" },
      { property: "og:description", content: "Your saved power tools and equipment." },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const { wishlist, catalogProducts } = useShop();
  const [quick, setQuick] = useState<Product | null>(null);
  const items = catalogProducts.filter((p) => wishlist.includes(p.id));

  return (
    <div className="container-tnt py-12">
      <h1 className="text-3xl sm:text-4xl">Wishlist</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {items.length} saved item{items.length === 1 ? "" : "s"}
      </p>

      {items.length === 0 ? (
        <div className="mt-10 rounded-lg border border-border bg-surface p-12 text-center">
          <p className="text-muted-foreground">Nothing saved yet.</p>
          <Link to="/shop" className="btn-orange mt-6">
            Browse Tools
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} onQuickView={setQuick} />
          ))}
        </div>
      )}

      <QuickView product={quick} onClose={() => setQuick(null)} />
    </div>
  );
}
