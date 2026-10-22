import { supabase } from "@/integrations/supabase/client";
import { MAX_PRODUCT_IMAGE_BYTES, optimizeSquareProductImage } from "@/lib/product-image-optimizer";

const PRODUCT_IMAGE_BUCKET = "product-images";
const MAX_EXISTING_SOURCE_BYTES = 20 * 1024 * 1024;
const PAGE_SIZE = 500;

type ProductImageRow = {
  id: string;
  image_url: string;
};

export type ExistingImageOptimizationProgress = {
  completed: number;
  total: number;
  optimizedObjects: number;
  updatedReferences: number;
  removedOversizedObjects: number;
  cleanupFailedObjects: number;
  skippedObjects: number;
  failedObjects: number;
};

export type ExistingImageOptimizationResult = Omit<
  ExistingImageOptimizationProgress,
  "completed" | "total"
> & {
  totalObjects: number;
  originalBytes: number;
  optimizedBytes: number;
  errors: string[];
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown image optimization error.";
}

/**
 * Optimize existing product-image objects from an authenticated full-admin browser session.
 * New WebPs are uploaded first; only then are matching database URLs switched. If a source file
 * exceeds the Storage limit, remove it only after the old URL is confirmed unreferenced. Smaller
 * source objects remain available as rollback copies.
 */
export async function optimizeExistingProductImages(
  onProgress: (progress: ExistingImageOptimizationProgress) => void,
): Promise<ExistingImageOptimizationResult> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user)
    throw new Error("Sign in with a full-admin account before optimizing stored images.");
  const { data: roleRows, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", authData.user.id);
  if (roleError) throw new Error("Could not verify full-admin access for image optimization.");
  if (!(roleRows ?? []).some((row) => row.role === "admin")) {
    throw new Error("Only a full admin can optimize existing product images.");
  }

  const rows: ProductImageRow[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("product_images")
      .select("id, image_url")
      .order("id")
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as ProductImageRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  const groupedRows = new Map<string, ProductImageRow[]>();
  for (const row of rows) {
    const sourceUrl = row.image_url.trim();
    if (!sourceUrl) continue;
    const references = groupedRows.get(sourceUrl) ?? [];
    references.push(row);
    groupedRows.set(sourceUrl, references);
  }

  const storage = supabase.storage.from(PRODUCT_IMAGE_BUCKET);
  const originProbe = new URL(storage.getPublicUrl("__origin_probe__").data.publicUrl);
  const bucketPath = `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`;
  const objectGroups = [...groupedRows.entries()];
  const result: ExistingImageOptimizationResult = {
    totalObjects: objectGroups.length,
    optimizedObjects: 0,
    updatedReferences: 0,
    removedOversizedObjects: 0,
    cleanupFailedObjects: 0,
    skippedObjects: 0,
    failedObjects: 0,
    originalBytes: 0,
    optimizedBytes: 0,
    errors: [],
  };

  const progress = (completed: number) =>
    onProgress({
      completed,
      total: objectGroups.length,
      optimizedObjects: result.optimizedObjects,
      updatedReferences: result.updatedReferences,
      removedOversizedObjects: result.removedOversizedObjects,
      cleanupFailedObjects: result.cleanupFailedObjects,
      skippedObjects: result.skippedObjects,
      failedObjects: result.failedObjects,
    });

  progress(0);
  for (const [index, [sourceUrl, references]] of objectGroups.entries()) {
    try {
      const parsedUrl = new URL(sourceUrl);
      const pathIndex = parsedUrl.pathname.indexOf(bucketPath);
      if (
        parsedUrl.origin !== originProbe.origin ||
        pathIndex < 0 ||
        parsedUrl.username ||
        parsedUrl.password
      ) {
        result.skippedObjects += 1;
        result.errors.push(
          "Skipped an image URL that is not a public object in the product-images bucket.",
        );
        progress(index + 1);
        continue;
      }

      const objectPath = decodeURIComponent(
        parsedUrl.pathname.slice(pathIndex + bucketPath.length),
      );
      if (!objectPath) {
        result.skippedObjects += 1;
        result.errors.push("Skipped a product image URL with an empty Storage path.");
        progress(index + 1);
        continue;
      }
      if (objectPath.includes("/bulk-optimized/")) {
        result.skippedObjects += 1;
        progress(index + 1);
        continue;
      }

      const response = await fetch(sourceUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`Source image returned HTTP ${response.status}.`);
      const sourceBlob = await response.blob();
      if (sourceBlob.size > MAX_EXISTING_SOURCE_BYTES) {
        throw new Error("Source image is larger than the 20 MiB safety limit.");
      }
      const sourceName = objectPath.split("/").pop() || "product-image";
      const sourceFile = new File([sourceBlob], sourceName, {
        type:
          sourceBlob.type || response.headers.get("content-type")?.split(";")[0] || "image/jpeg",
      });
      const optimizedFile = await optimizeSquareProductImage(sourceFile, {
        allowNonSquareSource: true,
      });
      if (optimizedFile.size > MAX_PRODUCT_IMAGE_BYTES) {
        throw new Error("Optimized image exceeds the 5 MiB Storage limit.");
      }

      const optimizedPath = `${authData.user.id}/bulk-optimized/${crypto.randomUUID()}.webp`;
      const { data: uploaded, error: uploadError } = await storage.upload(
        optimizedPath,
        optimizedFile,
        {
          cacheControl: "31536000",
          contentType: "image/webp",
          upsert: false,
        },
      );
      if (uploadError) throw uploadError;

      const { data: publicImage } = storage.getPublicUrl(uploaded.path);
      if (!publicImage.publicUrl) throw new Error("Could not create the optimized image URL.");
      const referenceIds = references.map((reference) => reference.id);
      const { data: updatedRows, error: updateError } = await supabase
        .from("product_images")
        .update({ image_url: publicImage.publicUrl })
        .in("id", referenceIds)
        .eq("image_url", sourceUrl)
        .select("id");
      if (updateError) throw updateError;

      const updatedCount = updatedRows?.length ?? 0;
      result.updatedReferences += updatedCount;
      if (updatedCount !== referenceIds.length) {
        throw new Error(
          `Only ${updatedCount} of ${referenceIds.length} database image references were switched; the original was kept.`,
        );
      }
      result.optimizedObjects += 1;
      result.originalBytes += sourceBlob.size;
      result.optimizedBytes += optimizedFile.size;

      if (sourceBlob.size > MAX_PRODUCT_IMAGE_BYTES) {
        try {
          const { data: remainingReferences, error: referenceCheckError } = await supabase
            .from("product_images")
            .select("id")
            .eq("image_url", sourceUrl)
            .limit(1);
          if (referenceCheckError) throw referenceCheckError;
          if ((remainingReferences ?? []).length > 0) {
            throw new Error("The old URL still has a product reference; the original was kept.");
          }

          const { data: removedFiles, error: removeError } = await storage.remove([objectPath]);
          if (removeError) throw removeError;
          if (!removedFiles?.length) {
            throw new Error("Storage did not confirm deletion; the oversized original may remain.");
          }
          result.removedOversizedObjects += 1;
        } catch (cleanupError) {
          result.cleanupFailedObjects += 1;
          result.errors.push(
            `Object ${index + 1}: The replacement is active, but the original over 5 MiB was kept because cleanup was not confirmed: ${errorMessage(cleanupError)}`,
          );
        }
      }
    } catch (error) {
      result.failedObjects += 1;
      result.errors.push(`Object ${index + 1}: ${errorMessage(error)}`);
    }
    progress(index + 1);
  }

  return result;
}
