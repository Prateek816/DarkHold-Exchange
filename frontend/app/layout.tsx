import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/shell/Providers";
import { AppLayout } from "@/components/shell/AppLayout";

export const metadata: Metadata = {
  title: "Darkhold Exchange | Anti-Scalping Festival & Merch Order Book",
  description:
    "A simulated dark financial marketplace for festival passes and limited merch with an anti-scalping price ceiling, Dutch auctions, and transparent reserve-match-settle ledger.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-canvas text-text antialiased min-h-screen">
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}
