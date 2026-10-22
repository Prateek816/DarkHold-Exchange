import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/shell/Providers";
import { AppLayout } from "@/components/shell/AppLayout";

export const metadata: Metadata = {
  title: {
    default: "Darkhold Exchange | Anti-Scalping Festival & Merch Order Book",
    template: "%s · Darkhold Exchange",
  },
  description:
    "A simulated dark financial marketplace for festival passes and limited merch with an anti-scalping price ceiling, Dutch auctions, and transparent reserve-match-settle ledger.",
  applicationName: "Darkhold Exchange",
};

export const viewport: Viewport = {
  themeColor: "#04060A",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-canvas font-sans text-text antialiased">
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}
