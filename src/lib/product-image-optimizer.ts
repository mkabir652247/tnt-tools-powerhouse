export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PRODUCT_IMAGE_DIMENSION = 1600;
export const PRODUCT_IMAGE_ASPECT_TOLERANCE = 0.05;

const WEBP_QUALITIES = [0.84, 0.78, 0.72, 0.66];
const DIMENSION_SCALES = [1, 0.875, 0.75, 0.625];

type OptimizeSquareProductImageOptions = {
  /** Existing images are fitted inside a square; new uploads must be nearly square. */
  allowNonSquareSource?: boolean;
};

/** Encode a square WebP without cropping, distorting, or upscaling the source. */
export async function optimizeSquareProductImage(
  file: File,
  options: OptimizeSquareProductImageOptions = {},
): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      `${file.name} could not be checked in this browser. Use a standard JPEG, PNG, WebP, or AVIF image.`,
    );
  }

  try {
    const ratio = bitmap.width / bitmap.height;
    if (
      !options.allowNonSquareSource &&
      (!Number.isFinite(ratio) ||
        ratio < 1 - PRODUCT_IMAGE_ASPECT_TOLERANCE ||
        ratio > 1 + PRODUCT_IMAGE_ASPECT_TOLERANCE)
    ) {
      throw new Error(
        `${file.name} must be square (1:1, within 5%). This image is ${bitmap.width} × ${bitmap.height} px.`,
      );
    }

    const sourceLongestEdge = Math.max(bitmap.width, bitmap.height);
    const baseDimension = Math.max(1, Math.min(MAX_PRODUCT_IMAGE_DIMENSION, sourceLongestEdge));
    const dimensions = [
      ...new Set(DIMENSION_SCALES.map((scale) => Math.max(1, Math.round(baseDimension * scale)))),
    ];

    for (const dimension of dimensions) {
      const scale = Math.min(dimension / bitmap.width, dimension / bitmap.height);
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = dimension;
      canvas.height = dimension;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("This browser could not prepare the product image.");
      context.clearRect(0, 0, dimension, dimension);
      context.drawImage(bitmap, (dimension - width) / 2, (dimension - height) / 2, width, height);

      for (const quality of WEBP_QUALITIES) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/webp", quality),
        );
        if (!blob || blob.type !== "image/webp") {
          throw new Error("This browser cannot encode WebP images. Please use a current browser.");
        }
        if (blob.size <= MAX_PRODUCT_IMAGE_BYTES) {
          const name = file.name.replace(/\.[^.]+$/, "") || "product-image";
          return new File([blob], `${name}.webp`, {
            type: "image/webp",
            lastModified: file.lastModified,
          });
        }
      }
    }

    throw new Error(`${file.name} could not be compressed below the 5 MiB limit.`);
  } finally {
    bitmap.close();
  }
}
