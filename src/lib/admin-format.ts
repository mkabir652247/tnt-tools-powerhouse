export function money(value: number | string | null | undefined) {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return `Rs ${Number.isFinite(n) ? n.toLocaleString("en-PK") : 0}`;
}

export function dateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;

export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export function statusClass(status: string) {
  switch (status) {
    case "delivered":
    case "paid":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "cancelled":
    case "failed":
    case "returned":
      return "bg-destructive/15 text-destructive border-destructive/30";
    case "shipped":
    case "processing":
    case "confirmed":
      return "bg-sky-500/15 text-sky-400 border-sky-500/30";
    case "refunded":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    default:
      return "bg-muted/40 text-muted-foreground border-border";
  }
}
