import { z } from "zod";

export const createAuctionSchema = z
  .object({
    assetId: z.string().optional(),
    asset: z.string().optional(),
    symbol: z.string().optional(),
    qty: z.coerce.number().int().min(1).optional(),
    quantity: z.coerce.number().int().min(1).optional(),
    startPrice: z.coerce.number().min(1).optional(),
    start_price: z.coerce.number().min(1).optional(),
    floorPrice: z.coerce.number().min(1).optional(),
    floor_price: z.coerce.number().min(1).optional(),
    durationMinutes: z.coerce.number().min(1).optional(),
    duration_seconds: z.coerce.number().min(1).optional(),
    stepSeconds: z.coerce.number().min(1).optional(),
    step_seconds: z.coerce.number().min(1).optional(),
    idempotencyKey: z.string().optional(),
  })
  .refine((d) => d.assetId || d.asset || d.symbol, {
    message: "Asset identifier is required",
    path: ["asset"],
  })
  .refine((d) => (d.qty !== undefined && d.qty >= 1) || (d.quantity !== undefined && d.quantity >= 1), {
    message: "Quantity must be at least 1",
    path: ["qty"],
  })
  .refine((d) => (d.startPrice !== undefined && d.startPrice >= 1) || (d.start_price !== undefined && d.start_price >= 1), {
    message: "Start price must be >= 1",
    path: ["startPrice"],
  })
  .refine((d) => (d.floorPrice !== undefined && d.floorPrice >= 1) || (d.floor_price !== undefined && d.floor_price >= 1), {
    message: "Floor price must be >= 1",
    path: ["floorPrice"],
  });

export const buyAuctionSchema = z.object({
  maxPrice: z.coerce.number().optional(),
  max_price: z.coerce.number().optional(),
});
