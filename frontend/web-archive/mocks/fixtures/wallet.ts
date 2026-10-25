import type { WalletBalance } from "@/lib/types";

/**
 * Seeded demo account. The cash ledger starts at $5,000.00, then reflects the
 * four completed receipts in the fixture tape. Reserved credits match the two
 * resting buy orders exactly: 2 x $265.00 + 2 x $268.00 = $1,066.00.
 *
 * Available  = $5,000.00 - $360.00 - $795.00 - $130.00 + $195.00 - $535.00
 *              - $530.00 - $536.00 = $2,309.00
 * Reserved   = $1,066.00
 * Total cash = $3,375.00
 */
export const MOCK_WALLET: WalletBalance = {
  available_credits: 230900,
  reserved_credits: 106600,
  total_credits: 337500,
  holdings: [
    {
      asset_id: "DARKHOLD-PASS-2026",
      symbol: "DKH-FEST",
      name: "Darkhold Fest Weekend Pass",
      available_units: 5,
      reserved_units: 0,
      total_units: 5,
      avg_cost: 26600,
      current_price: 26850,
    },
    {
      asset_id: "MOONRISE-GA-2026",
      symbol: "MNR-GA",
      name: "Moonrise GA Pass",
      available_units: 1,
      reserved_units: 0,
      total_units: 1,
      avg_cost: 18000,
      current_price: 19400,
    },
    {
      asset_id: "DARKHOLD-HOODIE-LTD",
      symbol: "DKH-HOOD",
      name: "Darkhold Hoodie Limited",
      available_units: 1,
      reserved_units: 0,
      total_units: 1,
      avg_cost: 13000,
      current_price: 14200,
    },
  ],
};
