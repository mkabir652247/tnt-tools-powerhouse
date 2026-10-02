import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { ImagePlus, PackagePlus, Pencil, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/admin-format";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
  head: () => ({ meta: [{ title: "Products — TNT Tools Admin" }] }),
});

type ProductSpec = { label: string; value: string };

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  category_id: string | null;
  brand: string | null;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  is_featured: boolean;
  is_active: boolean;
  category_name: string | null;
  image_urls: string[];
  specifications: ProductSpec[];
};

type CategoryRow = { id: string; name: string; slug: string; is_active: boolean };

const PRODUCT_IMAGE_BUCKET = "product-images";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

type ProductDraft = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  category_id: string;
  brand: string;
  sku: string;
  price: string;
  compare_at_price: string;
  stock_quantity: string;
  low_stock_threshold: string;
  is_featured: boolean;
  is_active: boolean;
  image_urls: string;
  specifications: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function blankDraft(): ProductDraft {
  return {
    name: "",
    slug: "",
    description: "",
    short_description: "",
    category_id: "",
    brand: "TNT Tools",
    sku: "",
    price: "",
    compare_at_price: "",
    stock_quantity: "0",
    low_stock_threshold: "5",
    is_featured: false,
    is_active: true,
    image_urls: "",
    specifications: "",
  };
}

function toDraft(product: ProductRow): ProductDraft {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    short_description: product.short_description ?? "",
    category_id: product.category_id ?? "",
    brand: product.brand ?? "",
    sku: product.sku ?? "",
    price: String(product.price),
    compare_at_price: product.compare_at_price == null ? "" : String(product.compare_at_price),
    stock_quantity: String(product.stock_quantity),
    low_stock_threshold: String(product.low_stock_threshold),
    is_featured: product.is_featured,
    is_active: product.is_active,
    image_urls: product.image_urls.join("\n"),
    specifications: product.specifications.map((item) => `${item.label}: ${item.value}`).join("\n"),
  };
}

function parseImageUrls(value: string) {
  const urls = [
    ...new Set(
      value
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
  for (const value of urls) {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error(`Image URL is not valid: ${value}`);
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("Product images must use an http:// or https:// URL.");
    }
  }
  return urls;
}

function parseSpecifications(value: string) {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.map((line, index) => {
    const separator = line.indexOf(":");
    if (separator < 1 || separator === line.length - 1) {
      throw new Error(`Specification line ${index + 1} must use “Name: Value”.`);
    }
    return {
      specification_name: line.slice(0, separator).trim(),
      specification_value: line.slice(separator + 1).trim(),
      display_order: index,
    };
  });
}

class ProductDetailsSaveError extends Error {
  constructor(
    readonly productId: string,
    reason: string,
  ) {
    super(`Product record saved, but its images/specifications need a retry. ${reason}`);
    this.name = "ProductDetailsSaveError";
  }
}

async function loadAdminProducts() {
  const [{ data: products, error: productsError }, { data: categories, error: categoriesError }] =
    await Promise.all([
      supabase
        .from("products")
        .select(
          "id, name, slug, description, short_description, category_id, brand, sku, price, compare_at_price, stock_quantity, low_stock_threshold, is_featured, is_active, created_at",
        )
        .order("created_at", { ascending: false }),
      supabase.from("categories").select("id, name, slug, is_active").order("name"),
    ]);

  if (productsError) throw productsError;
  if (categoriesError) throw categoriesError;

  const rows = products ?? [];
  const categoryRows = (categories ?? []) as CategoryRow[];
  const ids = rows.map((product) => product.id);
  let imageRows: { id: string; product_id: string; image_url: string; display_order: number }[] =
    [];
  let specificationRows: {
    id: string;
    product_id: string;
    specification_name: string;
    specification_value: string;
    display_order: number;
  }[] = [];

  if (ids.length > 0) {
    const [
      { data: images, error: imagesError },
      { data: specifications, error: specificationsError },
    ] = await Promise.all([
      supabase
        .from("product_images")
        .select("id, product_id, image_url, display_order")
        .in("product_id", ids)
        .order("display_order"),
      supabase
        .from("product_specifications")
        .select("id, product_id, specification_name, specification_value, display_order")
        .in("product_id", ids)
        .order("display_order"),
    ]);
    if (imagesError) throw imagesError;
    if (specificationsError) throw specificationsError;
    imageRows = images ?? [];
    specificationRows = specifications ?? [];
  }

  const categoryById = new Map(categoryRows.map((category) => [category.id, category.name]));
  const imagesById = new Map<string, string[]>();
  for (const image of imageRows) {
    const list = imagesById.get(image.product_id) ?? [];
    list.push(image.image_url);
    imagesById.set(image.product_id, list);
  }
  const specificationsById = new Map<string, ProductSpec[]>();
  for (const item of specificationRows) {
    const list = specificationsById.get(item.product_id) ?? [];
    list.push({ label: item.specification_name, value: item.specification_value });
    specificationsById.set(item.product_id, list);
  }

  return {
    products: rows.map((product) => ({
      ...product,
      price: Number(product.price),
      compare_at_price: product.compare_at_price == null ? null : Number(product.compare_at_price),
      category_name: product.category_id ? (categoryById.get(product.category_id) ?? null) : null,
      image_urls: imagesById.get(product.id) ?? [],
      specifications: specificationsById.get(product.id) ?? [],
    })) as ProductRow[],
    categories: categoryRows,
  };
}

async function saveProductDetails(productId: string, draft: ProductDraft) {
  const imageUrls = parseImageUrls(draft.image_urls);
  const specifications = parseSpecifications(draft.specifications);
  const [{ data: oldImages, error: oldImagesError }, { data: oldSpecs, error: oldSpecsError }] =
    await Promise.all([
      supabase.from("product_images").select("id").eq("product_id", productId),
      supabase.from("product_specifications").select("id").eq("product_id", productId),
    ]);
  if (oldImagesError) throw oldImagesError;
  if (oldSpecsError) throw oldSpecsError;

  let newImageIds: string[] = [];
  let newSpecIds: string[] = [];
  try {
    if (imageUrls.length > 0) {
      const { data, error } = await supabase
        .from("product_images")
        .insert(
          imageUrls.map((image_url, display_order) => ({
            product_id: productId,
            image_url,
            display_order,
            alt_text: draft.name.trim(),
          })),
        )
        .select("id");
      if (error) throw error;
      newImageIds = (data ?? []).map((row) => row.id);
    }
    if (specifications.length > 0) {
      const { data, error } = await supabase
        .from("product_specifications")
        .insert(specifications.map((item) => ({ ...item, product_id: productId })))
        .select("id");
      if (error) throw error;
      newSpecIds = (data ?? []).map((row) => row.id);
    }
  } catch (error) {
    if (newImageIds.length > 0) {
      await supabase.from("product_images").delete().in("id", newImageIds);
    }
    if (newSpecIds.length > 0) {
      await supabase.from("product_specifications").delete().in("id", newSpecIds);
    }
    throw error;
  }

  const oldImageIds = (oldImages ?? []).map((row) => row.id);
  const oldSpecIds = (oldSpecs ?? []).map((row) => row.id);
  if (oldImageIds.length > 0) {
    const { error } = await supabase.from("product_images").delete().in("id", oldImageIds);
    if (error) throw error;
  }
  if (oldSpecIds.length > 0) {
    const { error } = await supabase.from("product_specifications").delete().in("id", oldSpecIds);
    if (error) throw error;
  }
}

function AdminProducts() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ProductDraft | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const clearUploadStatus = () => {
    setUploadError(null);
    setUploadNotice(null);
  };

  const query = useQuery({ queryKey: ["admin", "products"], queryFn: loadAdminProducts });
  const save = useMutation({
    mutationFn: async (draft: ProductDraft) => {
      const name = draft.name.trim();
      const slug = (draft.slug.trim() || slugify(name)).toLowerCase();
      const price = Number(draft.price);
      const compareAt = draft.compare_at_price.trim() ? Number(draft.compare_at_price) : null;
      const stock = Number(draft.stock_quantity);
      const threshold = Number(draft.low_stock_threshold);
      const images = parseImageUrls(draft.image_urls);
      const specifications = parseSpecifications(draft.specifications);

      if (!name) throw new Error("Product name is required.");
      if (!slug) throw new Error("Add a product name that can be used to create a web address.");
      if (!Number.isFinite(price) || price < 0)
        throw new Error("Enter a valid non-negative price.");
      if (compareAt != null && (!Number.isFinite(compareAt) || compareAt < price)) {
        throw new Error("Compare-at price must be greater than or equal to the selling price.");
      }
      if (!Number.isInteger(stock) || stock < 0)
        throw new Error("Stock quantity must be a whole number of 0 or more.");
      if (!Number.isInteger(threshold) || threshold < 0)
        throw new Error("Low-stock threshold must be a whole number of 0 or more.");

      const payload = {
        name,
        slug,
        description: draft.description.trim() || null,
        short_description: draft.short_description.trim() || null,
        category_id: draft.category_id || null,
        brand: draft.brand.trim() || null,
        sku: draft.sku.trim() || null,
        price,
        compare_at_price: compareAt,
        stock_quantity: stock,
        low_stock_threshold: threshold,
        is_featured: draft.is_featured,
        is_active: draft.is_active,
      };

      const result = draft.id
        ? await supabase.from("products").update(payload).eq("id", draft.id).select("id").single()
        : await supabase.from("products").insert(payload).select("id").single();
      if (result.error) throw result.error;

      try {
        await saveProductDetails(result.data.id, {
          ...draft,
          name,
          image_urls: images.join("\n"),
          specifications: specifications
            .map((item) => `${item.specification_name}: ${item.specification_value}`)
            .join("\n"),
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Unknown error";
        throw new ProductDetailsSaveError(result.data.id, reason);
      }
    },
    onError: async (error, draft) => {
      if (error instanceof ProductDetailsSaveError) {
        setEditing({ ...draft, id: error.productId });
        await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      }
    },
    onSuccess: async () => {
      setEditing(null);
      setNotice("Product saved.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "products"] }),
        queryClient.invalidateQueries({ queryKey: ["storefront", "catalog"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] }),
      ]);
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (product: ProductRow) => {
      const { error } = await supabase
        .from("products")
        .update({ is_active: !product.is_active })
        .eq("id", product.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      setNotice("Store visibility updated.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "products"] }),
        queryClient.invalidateQueries({ queryKey: ["storefront", "catalog"] }),
      ]);
    },
  });

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data?.products ?? []).filter((product) => {
      const matchesSearch =
        !term ||
        `${product.name} ${product.sku ?? ""} ${product.brand ?? ""} ${product.category_name ?? ""}`
          .toLowerCase()
          .includes(term);
      const matchesFilter =
        filter === "all" ||
        (filter === "active" && product.is_active) ||
        (filter === "hidden" && !product.is_active) ||
        (filter === "low-stock" && product.stock_quantity <= product.low_stock_threshold);
      return matchesSearch && matchesFilter;
    });
  }, [query.data?.products, search, filter]);

  const products = query.data?.products ?? [];
  const lowStockCount = products.filter(
    (product) => product.stock_quantity <= product.low_stock_threshold,
  ).length;
  const setField = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => {
    setEditing((current) => (current ? { ...current, [key]: value } : current));
  };

  const appendImageUrls = (urls: string[]) => {
    setEditing((current) => {
      if (!current) return current;
      const existing = current.image_urls
        .split(/\r?\n/)
        .map((url) => url.trim())
        .filter(Boolean);
      return { ...current, image_urls: [...new Set([...existing, ...urls])].join("\n") };
    });
  };

  async function uploadImages(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;
    clearUploadStatus();

    for (const file of files) {
      if (!IMAGE_EXTENSIONS[file.type]) {
        setUploadError(`${file.name} is not a supported image. Use JPEG, PNG, WebP, or AVIF.`);
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setUploadError(`${file.name} is larger than the 10 MB limit.`);
        return;
      }
    }

    setUploadingImages(true);
    const uploadedUrls: string[] = [];
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!data.user) throw new Error("Sign in as an administrator before uploading images.");

      const storage = supabase.storage.from(PRODUCT_IMAGE_BUCKET);
      for (const file of files) {
        const extension = IMAGE_EXTENSIONS[file.type];
        const path = `${data.user.id}/${crypto.randomUUID()}.${extension}`;
        const { data: uploaded, error } = await storage.upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });
        if (error) throw error;

        const { data: publicData } = storage.getPublicUrl(uploaded.path);
        uploadedUrls.push(publicData.publicUrl);
        appendImageUrls([publicData.publicUrl]);
      }
      setUploadNotice(
        `${uploadedUrls.length} image${uploadedUrls.length === 1 ? "" : "s"} uploaded. Save the product to attach them to the listing.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image upload failed.";
      setUploadError(
        uploadedUrls.length > 0
          ? `${uploadedUrls.length} image${uploadedUrls.length === 1 ? "" : "s"} uploaded; another upload failed: ${message}`
          : message,
      );
    } finally {
      setUploadingImages(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="eyebrow">Catalogue</p>
          <h1 className="mt-1 font-display text-2xl font-bold uppercase tracking-wide">Products</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setNotice(null);
            clearUploadStatus();
            setEditing(blankDraft());
          }}
          className="btn-orange ml-auto px-4 py-2 text-xs"
        >
          <PackagePlus width={16} height={16} /> Add product
        </button>
      </div>

      {notice && (
        <p role="status" className="text-sm text-emerald-400">
          {notice}
        </p>
      )}
      {save.error && (
        <p
          role="alert"
          className="rounded-sm border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {(save.error as Error).message}
        </p>
      )}
      {toggleActive.error && (
        <p role="alert" className="text-sm text-destructive">
          {(toggleActive.error as Error).message}
        </p>
      )}
      {query.error && (
        <p
          role="alert"
          className="rounded-sm border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          Couldn’t load products: {(query.error as Error).message}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Products" value={products.length} />
        <Metric label="Published" value={products.filter((product) => product.is_active).length} />
        <Metric label="At / below low stock" value={lowStockCount} warn={lowStockCount > 0} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search
            width={16}
            height={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, SKU, brand, category…"
            aria-label="Search products"
            className="field-tnt pl-9"
          />
        </label>
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          aria-label="Filter products"
          className="field-tnt sm:w-52"
        >
          <option value="all">All products</option>
          <option value="active">Published</option>
          <option value="hidden">Hidden</option>
          <option value="low-stock">Low stock</option>
        </select>
      </div>

      {query.isLoading ? (
        <div className="h-48 animate-pulse rounded-sm border border-border bg-surface" />
      ) : visibleProducts.length === 0 ? (
        <div className="rounded-sm border border-border bg-surface p-8 text-center">
          <PackagePlus width={24} height={24} className="mx-auto text-primary" />
          <p className="mt-3 font-display font-bold uppercase">
            {products.length ? "No matching products" : "Your catalogue is empty"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {products.length
              ? "Try a different search or filter."
              : "Add a product here and it will be available in the store."}
          </p>
          {products.length === 0 && (
            <button
              type="button"
              onClick={() => {
                clearUploadStatus();
                setEditing(blankDraft());
              }}
              className="btn-orange mt-5 px-4 py-2 text-xs"
            >
              Add your first product
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border bg-surface">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((product) => (
                <tr key={product.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {product.image_urls[0] ? (
                        <img
                          src={product.image_urls[0]}
                          alt=""
                          className="h-11 w-11 rounded-sm border border-border object-cover"
                        />
                      ) : (
                        <span className="grid h-11 w-11 place-items-center rounded-sm border border-border bg-surface-strong text-muted-foreground">
                          <ImagePlus width={16} height={16} />
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{product.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {product.sku || product.slug}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {product.category_name || "Uncategorized"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{money(product.price)}</td>
                  <td
                    className={`px-4 py-3 text-right ${product.stock_quantity <= product.low_stock_threshold ? "text-primary" : ""}`}
                  >
                    {product.stock_quantity}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={product.is_active ? "text-emerald-400" : "text-muted-foreground"}
                    >
                      {product.is_active ? "Published" : "Hidden"}
                    </span>
                    {product.is_featured && (
                      <span className="ml-2 rounded-sm border border-primary/30 px-1.5 py-0.5 text-[10px] text-primary">
                        Featured
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setNotice(null);
                        clearUploadStatus();
                        setEditing(toDraft(product));
                      }}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Pencil width={13} height={13} /> Edit
                    </button>
                    <button
                      type="button"
                      disabled={toggleActive.isPending}
                      onClick={() => toggleActive.mutate(product)}
                      className="ml-3 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                      {product.is_active ? "Hide" : "Publish"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-3 sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-editor-title"
            className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-sm border border-border bg-surface p-5 sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Catalogue management</p>
                <h2
                  id="product-editor-title"
                  className="mt-1 font-display text-xl font-bold uppercase"
                >
                  {editing.id ? "Edit product" : "Add product"}
                </h2>
              </div>
              <button
                type="button"
                disabled={uploadingImages}
                onClick={() => setEditing(null)}
                className="btn-ghost-outline px-3 py-2 text-xs disabled:opacity-50"
              >
                Close
              </button>
            </div>

            <form
              className="mt-5 space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                setNotice(null);
                if (uploadingImages) return;
                save.mutate(editing);
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Product name">
                  <input
                    required
                    maxLength={160}
                    className="field-tnt"
                    value={editing.name}
                    onChange={(event) => setField("name", event.target.value)}
                  />
                </Field>
                <Field label="Product URL / slug">
                  <input
                    maxLength={180}
                    className="field-tnt"
                    placeholder="Auto-generated from name"
                    value={editing.slug}
                    onChange={(event) => setField("slug", event.target.value)}
                  />
                </Field>
                <Field label="Brand">
                  <input
                    maxLength={100}
                    className="field-tnt"
                    value={editing.brand}
                    onChange={(event) => setField("brand", event.target.value)}
                  />
                </Field>
                <Field label="SKU">
                  <input
                    maxLength={100}
                    className="field-tnt"
                    value={editing.sku}
                    onChange={(event) => setField("sku", event.target.value)}
                  />
                </Field>
                <Field label="Category">
                  <select
                    className="field-tnt"
                    value={editing.category_id}
                    onChange={(event) => setField("category_id", event.target.value)}
                  >
                    <option value="">No category</option>
                    {(query.data?.categories ?? []).map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                        disabled={!category.is_active && editing.category_id !== category.id}
                      >
                        {category.name}
                        {category.is_active ? "" : " (hidden)"}
                      </option>
                    ))}
                  </select>
                  {(query.data?.categories.length ?? 0) === 0 && (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      No categories yet. Add one from the Categories section.
                    </span>
                  )}
                </Field>
                <Field label="Price (Rs)">
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    className="field-tnt"
                    value={editing.price}
                    onChange={(event) => setField("price", event.target.value)}
                  />
                </Field>
                <Field label="Compare-at price (Rs)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="field-tnt"
                    value={editing.compare_at_price}
                    onChange={(event) => setField("compare_at_price", event.target.value)}
                  />
                </Field>
                <Field label="Stock quantity">
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    className="field-tnt"
                    value={editing.stock_quantity}
                    onChange={(event) => setField("stock_quantity", event.target.value)}
                  />
                </Field>
                <Field label="Low-stock alert at">
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    className="field-tnt"
                    value={editing.low_stock_threshold}
                    onChange={(event) => setField("low_stock_threshold", event.target.value)}
                  />
                </Field>
                <Field label="Short description">
                  <input
                    maxLength={240}
                    className="field-tnt"
                    value={editing.short_description}
                    onChange={(event) => setField("short_description", event.target.value)}
                  />
                </Field>
              </div>

              <Field label="Full description">
                <textarea
                  rows={4}
                  maxLength={5000}
                  className="field-tnt"
                  value={editing.description}
                  onChange={(event) => setField("description", event.target.value)}
                />
              </Field>

              <Field label="Upload product images">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  multiple
                  disabled={uploadingImages || save.isPending}
                  onChange={(event) => {
                    void uploadImages(event.currentTarget.files);
                    event.currentTarget.value = "";
                  }}
                  className="field-tnt"
                />
                <span className="mt-1 block text-xs text-muted-foreground">
                  JPEG, PNG, WebP, or AVIF; up to 10 MB each. Files upload immediately to the public
                  product-images bucket. If you cancel, uploaded files remain in Storage but are not
                  attached to a product until saved.
                </span>
              </Field>
              {uploadError && (
                <p role="alert" className="text-sm text-destructive">
                  {uploadError}
                </p>
              )}
              {uploadNotice && (
                <p role="status" className="text-sm text-emerald-400">
                  {uploadNotice}
                </p>
              )}

              <Field label="Product image URLs">
                <textarea
                  rows={3}
                  className="field-tnt"
                  placeholder="Uploaded URLs appear here; you can also paste one public URL per line."
                  value={editing.image_urls}
                  onChange={(event) => setField("image_urls", event.target.value)}
                />
                <span className="mt-1 block text-xs text-muted-foreground">
                  Save the product to store these URLs in the existing product_images table.
                </span>
              </Field>

              <Field label="Specifications">
                <textarea
                  rows={4}
                  className="field-tnt font-mono text-sm"
                  placeholder={"Voltage: 21V\nPower: 750W\nWarranty: 12 months"}
                  value={editing.specifications}
                  onChange={(event) => setField("specifications", event.target.value)}
                />
                <span className="mt-1 block text-xs text-muted-foreground">
                  Enter one “Name: Value” pair per line.
                </span>
              </Field>

              <div className="flex flex-wrap gap-5 border-t border-border pt-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editing.is_active}
                    onChange={(event) => setField("is_active", event.target.checked)}
                  />
                  Publish on store
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editing.is_featured}
                    onChange={(event) => setField("is_featured", event.target.checked)}
                  />
                  Feature on homepage
                </label>
              </div>

              {save.error && (
                <p role="alert" className="text-sm text-destructive">
                  {(save.error as Error).message}
                </p>
              )}
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  disabled={uploadingImages}
                  onClick={() => setEditing(null)}
                  className="btn-ghost-outline px-4 py-2 text-xs disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={save.isPending || uploadingImages}
                  className="btn-orange px-5 py-2 text-xs"
                >
                  {uploadingImages
                    ? "Uploading images…"
                    : save.isPending
                      ? "Saving…"
                      : "Save product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, warn = false }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="rounded-sm border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`mt-2 font-display text-2xl font-bold ${warn ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
