/**
 * Asset identifier and symbol mapping between PostgreSQL database and Matching Engine.
 *
 * DB Assets (Frontend & Database):
 *  - ID: DARKHOLD-PASS-2026, Symbol: DKH-FEST
 *  - ID: MOONRISE-GA-2026, Symbol: MNR-GA
 *  - ID: DARKHOLD-HOODIE-LTD, Symbol: DKH-HOOD
 *  - ID: SIGIL-COLLECTOR-PIN, Symbol: SGL-PIN
 *
 * Matching Engine Assets (Rust Engine & Simulator):
 *  - DFEST-WKND
 *  - MOONRISE-GA
 *  - DFEST-HOODIE
 *  - SIGIL-PIN
 */

export const ENGINE_TO_DB_MAP: Record<string, { symbol: string; id: string }> = {
  "DFEST-WKND": { symbol: "DKH-FEST", id: "DARKHOLD-PASS-2026" },
  "MOONRISE-GA": { symbol: "MNR-GA", id: "MOONRISE-GA-2026" },
  "DFEST-HOODIE": { symbol: "DKH-HOOD", id: "DARKHOLD-HOODIE-LTD" },
  "SIGIL-PIN": { symbol: "SGL-PIN", id: "SIGIL-COLLECTOR-PIN" },
};

export const DB_TO_ENGINE_SYMBOL: Record<string, string> = {
  // DB Symbols -> Engine Symbol
  "DKH-FEST": "DFEST-WKND",
  "MNR-GA": "MOONRISE-GA",
  "DKH-HOOD": "DFEST-HOODIE",
  "SGL-PIN": "SIGIL-PIN",

  // DB IDs -> Engine Symbol
  "DARKHOLD-PASS-2026": "DFEST-WKND",
  "MOONRISE-GA-2026": "MOONRISE-GA",
  "DARKHOLD-HOODIE-LTD": "DFEST-HOODIE",
  "SIGIL-COLLECTOR-PIN": "SIGIL-PIN",

  // Engine Symbols -> Engine Symbol (identity)
  "DFEST-WKND": "DFEST-WKND",
  "MOONRISE-GA": "MOONRISE-GA",
  "DFEST-HOODIE": "DFEST-HOODIE",
  "SIGIL-PIN": "SIGIL-PIN",
};

export const ASSET_SPECS: Record<
  string,
  { tick_size: number; min_qty: number; max_qty: number }
> = {
  "DFEST-WKND": { tick_size: 10, min_qty: 1, max_qty: 10 },
  "MOONRISE-GA": { tick_size: 10, min_qty: 1, max_qty: 10 },
  "DFEST-HOODIE": { tick_size: 5, min_qty: 1, max_qty: 10 },
  "SIGIL-PIN": { tick_size: 1, min_qty: 1, max_qty: 10 },
};

/**
 * Resolves an identifier strictly to a configured matching engine symbol.
 * Returns null if the identifier does not map to any known engine symbol.
 */
export function resolveEngineSymbol(assetOrSymbolOrId: string): string | null {
  if (!assetOrSymbolOrId) return null;
  const upper = assetOrSymbolOrId.toUpperCase();
  return DB_TO_ENGINE_SYMBOL[upper] || DB_TO_ENGINE_SYMBOL[assetOrSymbolOrId] || null;
}

/**
 * Checks whether a given symbol is a known, valid engine trading symbol.
 */
export function isConfiguredEngineSymbol(symbol: string): boolean {
  if (!symbol) return false;
  const upper = symbol.toUpperCase();
  return upper in ENGINE_TO_DB_MAP;
}

/**
 * Resolves any valid asset identifier (ID, DB symbol, or Engine symbol) to the matching engine symbol.
 */
export function toEngineSymbol(assetOrSymbolOrId: string): string {
  if (!assetOrSymbolOrId) return assetOrSymbolOrId;
  return resolveEngineSymbol(assetOrSymbolOrId) || assetOrSymbolOrId;
}

/**
 * Resolves an engine symbol or alias to the database representation ({ symbol, id }).
 */
export function toDbAssetIdentifier(identifier: string): { symbol: string; id: string } | null {
  if (!identifier) return null;
  const upper = identifier.toUpperCase();
  return ENGINE_TO_DB_MAP[upper] || ENGINE_TO_DB_MAP[identifier] || null;
}

