import { z } from "zod";

export const submitOrderSchema = z
  .object({
    idempotencyKey: z.string().optional(),
    assetId: z.string().optional(),
    asset: z.string().optional(),
    symbol: z.string().optional(),
    side: z.enum(["BUY", "SELL"]),
    type: z.enum(["LIMIT", "MARKET"]).optional(),
    order_type: z.enum(["LIMIT", "MARKET"]).optional(),
    tif: z.enum(["GTC", "IOC"]).optional(),
    price: z.coerce.number().min(0, "Price must be non-negative").optional(),
    limit_price_minor: z.coerce.number().min(0).optional(),
    qty: z.coerce.number().int().min(1).optional(),
    quantity: z.coerce.number().int().min(1).optional(),
  })
  .refine((data) => data.assetId || data.asset || data.symbol, {
    message: "Asset identifier (asset or assetId) is required",
    path: ["asset"],
  })
  .refine((data) => (data.qty !== undefined && data.qty >= 1) || (data.quantity !== undefined && data.quantity >= 1), {
    message: "Quantity must be at least 1",
    path: ["quantity"],
  });

