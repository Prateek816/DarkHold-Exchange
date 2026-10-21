import React from "react";
import { AuctionDetailView } from "@/components/auctions/AuctionDetailView";

export function generateStaticParams() {
  return [
    { auctionId: "AUC-101" },
    { auctionId: "AUC-102" },
    { auctionId: "AUC-103" },
    { auctionId: "AUC-104" },
    { auctionId: "AUC-105" },
  ];
}

export default function AuctionDetailPage({
  params,
}: {
  params: { auctionId: string };
}) {
  return <AuctionDetailView auctionId={params.auctionId} />;
}
