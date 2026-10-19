import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canDeleteCategories, canManageProducts } from "./catalog-permissions";

export const manageCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    action: z.enum(["update-product", "delete-product", "delete-category"]),
    id: z.string().uuid(),
    product: z.record(z.unknown()).optional(),
    images: z.array(z.string()).max(12).optional(),
    specifications: z.array(z.object({
      specification_name: z.string().min(1).max(120),
      specification_value: z.string().min(1).max(500),
      display_order: z.number().int().nonnegative(),
    })).max(50).optional(),
  }))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.from("user_roles")
      .select("role").eq("user_id", context.userId);
    if (error) throw new Error("Could not verify staff access.");
    const roles = (rows ?? []).map((row) => row.role);
    const allowed = data.action === "delete-category"
      ? canDeleteCategories(roles) : canManageProducts(roles);
    if (!allowed) throw new Error("You do not have permission for this action.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.action === "update-product") {
      if (!roles.includes("product_manager") || !data.product) throw new Error("Invalid product update.");
      const result = await supabaseAdmin.rpc("product_manager_update_product", {
        _actor: context.userId, _product_id: data.id,
        _product: data.product as import("@/integrations/supabase/types").Json,
        _image_urls: data.images ?? [], _specifications: data.specifications ?? [],
      });
      if (result.error) throw new Error(result.error.message);
    } else if (data.action === "delete-product") {
      const result = await supabaseAdmin.rpc("delete_catalog_product", { _actor: context.userId, _product_id: data.id });
      if (result.error) throw new Error(result.error.message);
    } else {
      const result = await supabaseAdmin.rpc("delete_catalog_category", { _actor: context.userId, _category_id: data.id });
      if (result.error) throw new Error(result.error.message);
    }
    return { success: true };
  });