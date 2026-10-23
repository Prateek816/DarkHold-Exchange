import { z } from "zod";

export const submitOrderSchema = z.object({
  idempotencyKey: z.string().optional(),
  assetId: z.string().min(1, "Asset ID is required"),
  side: z.enum(["BUY", "SELL"]),
  type: z.enum(["LIMIT", "MARKET"]),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  qty: z.coerce.number().int().min(1, "Quantity must be at least 1"),
});
