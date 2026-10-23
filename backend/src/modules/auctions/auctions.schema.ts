import { z } from "zod";

export const createAuctionSchema = z.object({
  assetId: z.string().min(1, "Asset ID is required"),
  qty: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  startPrice: z.coerce.number().min(1, "Start price must be greater than zero"),
  floorPrice: z.coerce.number().min(1, "Floor price must be greater than zero"),
  durationMinutes: z.coerce.number().min(1, "Duration must be at least 1 minute"),
  stepSeconds: z.coerce.number().min(1).optional(),
  idempotencyKey: z.string().optional(),
});

export const buyAuctionSchema = z.object({
  maxPrice: z.coerce.number().optional(),
});
