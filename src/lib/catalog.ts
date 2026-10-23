import { supabase } from "@/integrations/supabase/client";
import {
  categories as demoCategories,
  products as demoProducts,
  type Category,
  type Product,
} from "@/data/products";

export type StoreCatalog = {
  categories: Category[];
  products: Product[];
  productIds: string[];
  shortDescriptions: Record<string, string>;
};

export type StoreProductDetails = Record<
  string,
  { images: string[]; specs: { label: string; value: string }[] }
>;

export type StoreCategory = Category & { id: string; parent_category_id: string | null };

function categoryImage(slug: string) {
  return (
    demoCategories.find((category) => category.slug === slug)?.image ??
    demoProducts[0]?.images[0] ??
    ""
  );
}

function mapCategory(row: {
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
}): Category {
  return {
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    image: row.image_url || categoryImage(row.slug),
  };
}

export async function loadStoreCategories(): Promise<StoreCategory[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, description, image_url, is_active, parent_category_id")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  const activeRows = data ?? [];
  const activeRootIds = new Set(
    activeRows.filter((row) => row.parent_category_id === null).map((row) => row.id),
  );
  return activeRows
    .filter((row) => row.parent_category_id === null || activeRootIds.has(row.parent_category_id))
    .map((row) => ({
      id: row.id,
      parent_category_id: row.parent_category_id,
      ...mapCategory(row),
    }));
}

function inferProductType(name: string, category: string): Product["type"] {
  const normalized = name.toLowerCase();
  if (category === "hand-tools" || normalized.includes("manual")) return "Manual";
  if (normalized.includes("cordless") || normalized.includes("battery")) return "Cordless";
  if (["water-pumps", "air-compressors", "welding-machines", "cutting-tools"].includes(category)) {
    return "Machine";
  }
  return "Corded";
}

/** Load the fields required to render product cards before ancillary image/specification requests. */
export async function loadStoreCatalogBase(
  categoryRowsPromise: Promise<StoreCategory[]>,
): Promise<StoreCatalog> {
  const [categoryRows, { data: productRows, error: productError }] = await Promise.all([
    categoryRowsPromise,
    supabase
      .from("products")
      .select(
        "id, name, slug, description, short_description, category_id, brand, price, compare_at_price, stock_quantity, low_stock_threshold, is_featured",
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
  ]);

  if (productError) throw productError;

  const visibleCategories = categoryRows.map(
    ({ id: _id, parent_category_id: _parentCategoryId, ...category }) => category,
  );
  const activeCategoryIds = new Set(categoryRows.map((category) => category.id));
  const rows = (productRows ?? []).filter(
    (product) => !product.category_id || activeCategoryIds.has(product.category_id),
  );
  const categoryById = new Map(categoryRows.map((category) => [category.id, category]));
  const shortDescriptions: Record<string, string> = {};

  const mappedProducts: Product[] = rows.map((row) => {
    const categoryRow = row.category_id ? categoryById.get(row.category_id) : undefined;
    const categorySlug = categoryRow?.slug ?? "other-power-tools";
    const price = Number(row.price);
    const compareAtPrice = row.compare_at_price == null ? undefined : Number(row.compare_at_price);
    const stock = row.stock_quantity ?? 0;
    const lowStockThreshold = row.low_stock_threshold ?? 5;
    const shortDescription = row.short_description?.trim() ?? "";
    shortDescriptions[row.id] = shortDescription;
    const description = row.description?.trim() || shortDescription || row.name;

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      spec: shortDescription || "Professional-grade equipment",
      description,
      brand: row.brand?.trim() || "TNT Tools",
      category: categorySlug,
      type: inferProductType(row.name, categorySlug),
      price,
      ...(compareAtPrice != null && compareAtPrice > price ? { oldPrice: compareAtPrice } : {}),
      rating: 0,
      reviewCount: 0,
      inStock: stock > 0,
      stockLabel:
        stock <= 0
          ? "Out of stock"
          : stock <= lowStockThreshold
            ? `Only ${stock} left`
            : "In stock — ships in 24 hours",
      badges: [
        ...(row.is_featured ? ["Featured"] : []),
        ...(stock > 0 && stock <= lowStockThreshold ? ["Limited Stock"] : []),
      ],
      images: [categoryImage(categorySlug)],
      imagesPending: true,
      features: shortDescription ? [shortDescription] : [],
      specs: [],
    };
  });

  return {
    categories: visibleCategories,
    products: mappedProducts,
    productIds: rows.map((row) => row.id),
    shortDescriptions,
  };
}

/** Load only the image/specification rows for products already selected by the active catalog query. */
export async function loadStoreProductDetails(productIds: string[]): Promise<StoreProductDetails> {
  if (productIds.length === 0) return {};

  const [
    { data: imageRows, error: imageError },
    { data: specificationRows, error: specificationError },
  ] = await Promise.all([
    supabase
      .from("product_images")
      .select("product_id, image_url, alt_text, display_order")
      .in("product_id", productIds)
      .order("display_order"),
    supabase
      .from("product_specifications")
      .select("product_id, specification_name, specification_value, display_order")
      .in("product_id", productIds)
      .order("display_order"),
  ]);

  if (imageError) throw imageError;
  if (specificationError) throw specificationError;

  const details: StoreProductDetails = Object.fromEntries(
    productIds.map((productId) => [productId, { images: [], specs: [] }]),
  );

  for (const image of imageRows ?? []) {
    const productDetails = details[image.product_id];
    if (productDetails && image.image_url.trim()) {
      productDetails.images.push(image.image_url.trim());
    }
  }

  for (const specification of specificationRows ?? []) {
    const productDetails = details[specification.product_id];
    if (productDetails) {
      productDetails.specs.push({
        label: specification.specification_name,
        value: specification.specification_value,
      });
    }
  }

  return details;
}
