import type { Asset } from "@/lib/types";

export const MOCK_ASSETS: Asset[] = [
  {
    id: "DARKHOLD-PASS-2026",
    symbol: "DKH-FEST",
    name: "Darkhold Fest Weekend Pass",
    category: "FESTIVAL_PASS",
    face_value: 25000, // $250.00
    ceiling_pct: 110,
    ceiling_price: 27500, // $275.00
    last_price: 26850, // $268.50
    last_price_timestamp: Date.now() - 12000,
    price_change_24h_pct: 4.8,
    best_bid: 26700,
    best_ask: 26900,
    available_ask_qty: 48,
    volume_24h: 382,
    is_halted: false,
    is_thin: false,
    sim_active: true,
    has_active_auction: true,
    sparkline_1h: [25200, 25500, 25400, 25800, 26100, 26000, 26400, 26600, 26850],
  },
  {
    id: "MOONRISE-GA-2026",
    symbol: "MNR-GA",
    name: "Moonrise GA Pass",
    category: "FESTIVAL_PASS",
    face_value: 18000, // $180.00
    ceiling_pct: 115,
    ceiling_price: 20700, // $207.00
    last_price: 19400, // $194.00
    last_price_timestamp: Date.now() - 45000,
    price_change_24h_pct: 2.1,
    best_bid: 19200,
    best_ask: 19500,
    available_ask_qty: 24,
    volume_24h: 154,
    is_halted: false,
    is_thin: false,
    sim_active: true,
    has_active_auction: true,
    sparkline_1h: [18900, 19000, 18800, 19100, 19200, 19150, 19300, 19400],
  },
  {
    id: "DARKHOLD-HOODIE-LTD",
    symbol: "DKH-HOOD",
    name: "Darkhold Hoodie Limited",
    category: "LIMITED_MERCH",
    face_value: 12000, // $120.00
    ceiling_pct: 125,
    ceiling_price: 15000, // $150.00
    last_price: 14200, // $142.00
    last_price_timestamp: Date.now() - 110000,
    price_change_24h_pct: -1.4,
    best_bid: 13900,
    best_ask: 14300,
    available_ask_qty: 12,
    volume_24h: 89,
    is_halted: false,
    is_thin: false,
    sim_active: true,
    has_active_auction: false,
    sparkline_1h: [14500, 14400, 14300, 14400, 14200, 14100, 14200],
  },
  {
    id: "SIGIL-COLLECTOR-PIN",
    symbol: "SGL-PIN",
    name: "Sigil Collector Pin",
    category: "LIMITED_MERCH",
    face_value: 3500, // $35.00
    ceiling_pct: 150,
    ceiling_price: 5250, // $52.50
    last_price: 4800, // $48.00
    last_price_timestamp: Date.now() - 240000, // 4m ago -> triggers data age "no trades for 4m"
    price_change_24h_pct: 8.5,
    best_bid: 4500,
    best_ask: 4900,
    available_ask_qty: 5,
    volume_24h: 18,
    is_halted: false,
    is_thin: true, // Thin market indicator tag
    sim_active: true,
    has_active_auction: true,
    sparkline_1h: [4200, 4300, 4500, 4600, 4800],
  },
];
