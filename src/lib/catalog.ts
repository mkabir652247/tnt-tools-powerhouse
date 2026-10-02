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
};

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

function inferProductType(name: string, category: string): Product["type"] {
  const normalized = name.toLowerCase();
  if (category === "hand-tools" || normalized.includes("manual")) return "Manual";
  if (normalized.includes("cordless") || normalized.includes("battery")) return "Cordless";
  if (["water-pumps", "air-compressors", "welding-machines", "cutting-tools"].includes(category)) {
    return "Machine";
  }
  return "Corded";
}

export async function loadStoreCatalog(): Promise<StoreCatalog> {
  const [{ data: categoryRows, error: categoryError }, { data: productRows, error: productError }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id, name, slug, description, image_url, is_active")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("products")
        .select(
          "id, name, slug, description, short_description, category_id, brand, price, compare_at_price, stock_quantity, low_stock_threshold, is_featured",
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
    ]);

  if (categoryError) throw categoryError;
  if (productError) throw productError;

  const visibleCategories = (categoryRows ?? []).map(mapCategory);
  const allRows = productRows ?? [];

  if (allRows.length === 0) {
    return {
      categories: visibleCategories.length > 0 ? visibleCategories : demoCategories,
      products: [],
    };
  }

  const activeCategoryIds = new Set((categoryRows ?? []).map((category) => category.id));
  const rows = allRows.filter(
    (product) => !product.category_id || activeCategoryIds.has(product.category_id),
  );
  if (rows.length === 0) {
    return {
      categories: visibleCategories.length > 0 ? visibleCategories : demoCategories,
      products: [],
    };
  }

  const productIds = rows.map((product) => product.id);
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

  const categoryById = new Map((categoryRows ?? []).map((category) => [category.id, category]));
  const imagesByProduct = new Map<string, string[]>();
  for (const image of imageRows ?? []) {
    const urls = imagesByProduct.get(image.product_id) ?? [];
    if (image.image_url.trim()) urls.push(image.image_url.trim());
    imagesByProduct.set(image.product_id, urls);
  }

  const specificationsByProduct = new Map<string, { label: string; value: string }[]>();
  for (const specification of specificationRows ?? []) {
    const list = specificationsByProduct.get(specification.product_id) ?? [];
    list.push({
      label: specification.specification_name,
      value: specification.specification_value,
    });
    specificationsByProduct.set(specification.product_id, list);
  }

  const mappedProducts: Product[] = rows.map((row) => {
    const categoryRow = row.category_id ? categoryById.get(row.category_id) : undefined;
    const categorySlug = categoryRow?.slug ?? "other-power-tools";
    const specs = specificationsByProduct.get(row.id) ?? [];
    const images = imagesByProduct.get(row.id) ?? [];
    const price = Number(row.price);
    const compareAtPrice = row.compare_at_price == null ? undefined : Number(row.compare_at_price);
    const stock = row.stock_quantity ?? 0;
    const lowStockThreshold = row.low_stock_threshold ?? 5;
    const shortDescription = row.short_description?.trim() ?? "";
    const description = row.description?.trim() || shortDescription || row.name;
    const spec =
      shortDescription ||
      specs
        .slice(0, 3)
        .map((item) => `${item.label}: ${item.value}`)
        .join(" · ");

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      spec: spec || "Professional-grade equipment",
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
      images: images.length > 0 ? images : [categoryImage(categorySlug)],
      features:
        specs.length > 0
          ? specs.map((item) => `${item.label}: ${item.value}`)
          : shortDescription
            ? [shortDescription]
            : [],
      specs,
    };
  });

  return {
    categories: visibleCategories.length > 0 ? visibleCategories : demoCategories,
    products: mappedProducts,
  };
}
