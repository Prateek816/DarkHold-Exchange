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

/**
 * Resolves any valid asset identifier (ID, DB symbol, or Engine symbol) to the matching engine symbol.
 */
export function toEngineSymbol(assetOrSymbolOrId: string): string {
  if (!assetOrSymbolOrId) return assetOrSymbolOrId;
  const upper = assetOrSymbolOrId.toUpperCase();
  return DB_TO_ENGINE_SYMBOL[upper] || DB_TO_ENGINE_SYMBOL[assetOrSymbolOrId] || assetOrSymbolOrId;
}

/**
 * Resolves an engine symbol or alias to the database representation ({ symbol, id }).
 */
export function toDbAssetIdentifier(identifier: string): { symbol: string; id: string } | null {
  if (!identifier) return null;
  const upper = identifier.toUpperCase();
  return ENGINE_TO_DB_MAP[upper] || ENGINE_TO_DB_MAP[identifier] || null;
}
