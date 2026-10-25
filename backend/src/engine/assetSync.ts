import { prisma } from "@/config/db";
import { engineClient } from "./engineClient";
import { resolveEngineSymbol, ASSET_SPECS } from "@/utils/assetMapping";

/**
 * Synchronizes database assets with the matching engine per Section 6.1 Step 5 of the backend contract.
 * For every DB asset not present in hello.assets, or after an epoch change, sends ConfigureAsset.
 */
export async function syncEngineAssets(existingAssets?: Set<string>): Promise<void> {
  const dbAssets = await prisma.asset.findMany();
  for (const asset of dbAssets) {
    const engineSymbol = resolveEngineSymbol(asset.symbol) || resolveEngineSymbol(asset.id);
    if (!engineSymbol) {
      console.warn(`[AssetSync] Skipping unmapped DB asset: ${asset.id} (${asset.symbol})`);
      continue;
    }

    if (existingAssets && existingAssets.has(engineSymbol)) {
      continue; // Already configured in engine
    }

    const spec = ASSET_SPECS[engineSymbol] || { tick_size: 10, min_qty: 1, max_qty: 10 };
    const tick = spec.tick_size;
    const ceiling = Number(asset.ceilingPrice);
    const collarMaxPrice = Math.floor(ceiling / tick) * tick;

    const reply = await engineClient.sendCommand({
      type: "ConfigureAsset",
      asset: engineSymbol,
      tick_size: tick,
      min_qty: spec.min_qty,
      max_qty: spec.max_qty,
      collar_max_price: collarMaxPrice,
      status: asset.isHalted ? "HALTED" : "ACTIVE",
    });

    if (reply.status === "OK") {
      console.log(`[AssetSync] Registered asset ${engineSymbol} in matching engine (status: ${asset.isHalted ? "HALTED" : "ACTIVE"})`);
      existingAssets?.add(engineSymbol);
    } else {
      console.error(`[AssetSync] Failed to configure ${engineSymbol}: engine returned status ${reply.status}`, reply);
      throw new Error(`Engine returned ${reply.status} while configuring asset ${engineSymbol}`);
    }
  }
}
