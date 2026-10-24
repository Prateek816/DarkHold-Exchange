import React from "react";
import { TradeTerminalView } from "@/components/trading/TradeTerminalView";

export function generateStaticParams() {
  return [
    { assetId: "DARKHOLD-PASS-2026" },
    { assetId: "MOONRISE-GA-2026" },
    { assetId: "DARKHOLD-HOODIE-LTD" },
    { assetId: "SIGIL-COLLECTOR-PIN" },
  ];
}

export default function TradePage({ params }: { params: { assetId: string } }) {
  return <TradeTerminalView assetId={params.assetId} />;
}
