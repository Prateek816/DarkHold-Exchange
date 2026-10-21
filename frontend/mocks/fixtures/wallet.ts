import { WalletBalance } from "@/lib/types";

export const MOCK_WALLET: WalletBalance = {
  available_credits: 447000, // $4,470.00 available
  reserved_credits: 53000, // $530.00 reserved in open order ORD-001 (2x $265)
  total_credits: 500000, // $5,000.00 total
  holdings: [
    {
      asset_id: "DARKHOLD-PASS-2026",
      symbol: "DKH-FEST",
      name: "Darkhold Fest Weekend Pass",
      available_units: 3,
      reserved_units: 0,
      total_units: 3,
      avg_cost: 25500, // $255.00
      current_price: 26850,
    },
    {
      asset_id: "MOONRISE-GA-2026",
      symbol: "MNR-GA",
      name: "Moonrise GA Pass",
      available_units: 1,
      reserved_units: 1, // 1 unit reserved in pending sale
      total_units: 2,
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
