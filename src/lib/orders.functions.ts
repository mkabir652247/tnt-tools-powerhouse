import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const COUPONS: Record<string, number> = { TNT10: 0.1, POWER15: 0.15 };
const FREE_SHIPPING_FROM = 25000;
const SHIPPING_FEE = 750;

const orderSchema = z.object({
  customer_name: z.string().trim().min(2, "Enter your full name").max(120),
  customer_phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number")
    .max(20)
    .regex(/^[0-9+\-\s()]+$/, "Enter a valid phone number"),
  customer_email: z.string().trim().email("Enter a valid email").max(160).or(z.literal("")),
  shipping_address: z.string().trim().min(5, "Enter your street address").max(300),
  city: z.string().trim().min(2, "Enter your city").max(80),
  notes: z.string().trim().max(500).optional(),
  coupon: z.string().trim().max(30).optional(),
  items: z
    .array(z.object({ product_id: z.string().uuid(), quantity: z.number().int().min(1).max(100) }))
    .min(1, "Your cart is empty")
    .max(50),
});

export type PlaceOrderInput = z.infer<typeof orderSchema>;

// Public: guests can check out. All prices, stock and totals are decided on the server/database.
export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => orderSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // merge duplicate lines
    const merged = new Map<string, number>();
    for (const it of data.items) merged.set(it.product_id, (merged.get(it.product_id) ?? 0) + it.quantity);
    const items = [...merged].map(([product_id, quantity]) => ({ product_id, quantity }));

    const { data: prices, error: priceError } = await supabaseAdmin
      .from("products")
      .select("id, price")
      .in("id", items.map((i) => i.product_id));
    if (priceError) {
      console.error("placeOrder price lookup failed", priceError);
      return { ok: false as const, error: "We couldn't reach the store right now. Please try again." };
    }
    const subtotal = items.reduce(
      (s, i) => s + Number(prices?.find((p) => p.id === i.product_id)?.price ?? 0) * i.quantity,
      0,
    );
    const rate = data.coupon ? (COUPONS[data.coupon.toUpperCase()] ?? 0) : 0;
    const discount = Math.round(subtotal * rate);
    const shipping = subtotal > 0 && subtotal < FREE_SHIPPING_FROM ? SHIPPING_FEE : 0;

    const { data: result, error } = await supabaseAdmin.rpc("place_order", {
      _order: {
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email,
        shipping_address: data.shipping_address,
        city: data.city,
        notes: data.notes ?? "",
        payment_method: "cod",
        shipping_fee: shipping,
        discount,
      },
      _items: items,
    });

    if (error) {
      // Business-rule errors raised by the database (stock, availability) are safe to show.
      const msg = error.message ?? "";
      if (/stock|available|empty|quantity/i.test(msg)) return { ok: false as const, error: msg };
      console.error("placeOrder failed", error);
      return { ok: false as const, error: "We couldn't place your order. Please try again." };
    }

    const row = (Array.isArray(result) ? result[0] : result) as
      | { order_number: string; total_amount: number }
      | undefined;
    if (!row) return { ok: false as const, error: "We couldn't place your order. Please try again." };
    return {
      ok: true as const,
      orderNumber: row.order_number as string,
      total: Number(row.total_amount),
    };
  });
